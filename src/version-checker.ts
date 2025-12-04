import * as https from 'https';
import * as semver from 'semver';

export interface PackageVersionInfo {
  current: string;
  latest: string;
  latestMinor: string | null;
  latestMajor: string | null;
  allVersions: VersionWithDate[];
  stableVersions: VersionWithDate[];
}

export interface VersionWithDate {
  version: string;
  date: string;
}

export class VersionChecker {
  private cache: Map<string, PackageVersionInfo> = new Map();
  private pendingRequests: Map<string, Promise<PackageVersionInfo | null>> = new Map();

  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  async checkVersion(packageName: string, currentVersion: string, onProgress?: () => void): Promise<PackageVersionInfo | null> {
    const cacheKey = `${packageName}@${currentVersion}`;

    // Return cached result
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Return pending request
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new request
    const request = this.fetchVersionInfo(packageName, currentVersion, onProgress);
    this.pendingRequests.set(cacheKey, request);

    try {
      const result = await request;
      if (result) {
        this.cache.set(cacheKey, result);
      }
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private fetchVersionInfo(packageName: string, currentVersion: string, onProgress?: () => void): Promise<PackageVersionInfo | null> {
    return new Promise(resolve => {
      const url = `https://registry.npmjs.org/${packageName}`;

      https
        .get(url, res => {
          let data = '';

          res.on('data', chunk => {
            data += chunk;
          });

          res.on('end', () => {
            if (onProgress) {
              onProgress();
            }

            if (res.statusCode !== 200) {
              resolve(null);
              return;
            }

            try {
              const json = JSON.parse(data);
              const versions = json.versions;
              const time = json.time;

              if (!versions) {
                resolve(null);
                return;
              }

              // Get all versions sorted by semver
              const allVersions = Object.keys(versions)
                .filter(v => semver.valid(v))
                .sort((a, b) => semver.rcompare(a, b));

              // Get stable versions only (no prerelease tags like beta, alpha, rc, canary, etc.)
              const stableVersions = allVersions.filter(v => !semver.prerelease(v));

              // Get all versions with dates
              const versionsWithDate: VersionWithDate[] = allVersions.map(v => ({
                date: time[v] ? new Date(time[v]).toISOString().split('T')[0] : 'Unknown',
                version: v,
              }));

              // Filter stable versions from versionsWithDate (avoid re-mapping)
              const stableVersionsWithDate = versionsWithDate.filter(v => stableVersions.includes(v.version));

              const latest = json['dist-tags']?.latest || stableVersions[0];

              // Clean current version (remove ^, ~, etc.)
              const cleanCurrent = semver.valid(semver.coerce(currentVersion));
              if (!cleanCurrent) {
                resolve(null);
                return;
              }

              // Find latest minor and major versions (only stable versions)
              // Since versions are sorted newest-first, we can break early
              let latestMinor: string | null = null;
              let latestMajor: string | null = null;

              const currentMajor = semver.major(cleanCurrent);
              const currentMinor = semver.minor(cleanCurrent);

              for (const version of stableVersions) {
                const major = semver.major(version);
                const minor = semver.minor(version);

                // Find latest minor version (same major, higher minor or patch)
                if (
                  !latestMinor &&
                  major === currentMajor &&
                  (minor > currentMinor || (minor === currentMinor && semver.gt(version, cleanCurrent)))
                ) {
                  latestMinor = version;
                }

                // Find latest major version (higher major)
                if (!latestMajor && major > currentMajor) {
                  latestMajor = version;
                }

                // Early exit if both found
                if (latestMinor && latestMajor) {
                  break;
                }
              }

              resolve({
                allVersions: versionsWithDate,
                current: cleanCurrent,
                latest,
                latestMajor,
                latestMinor,
                stableVersions: stableVersionsWithDate,
              });
            } catch (error) {
              console.error(`Error parsing package info for ${packageName}:`, error);
              resolve(null);
            }
          });
        })
        .on('error', error => {
          console.error(`Error fetching package info for ${packageName}:`, error);
          if (onProgress) {
            onProgress();
          }
          resolve(null);
        });
    });
  }
}
