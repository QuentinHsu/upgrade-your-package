import * as vscode from 'vscode';

import { parsePackageJson } from './package-manager';
import type { VersionChecker } from './version-checker';

export class PackageCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
  private versionChecker: VersionChecker;
  private statusBarItem: vscode.StatusBarItem;

  constructor(
    versionChecker: VersionChecker,
    statusBarItem: vscode.StatusBarItem,
  ) {
    this.versionChecker = versionChecker;
    this.statusBarItem = statusBarItem;
  }

  refresh() {
    this._onDidChangeCodeLenses.fire();
  }

  async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
    if (!document.fileName.endsWith('package.json')) {
      return [];
    }

    const text = document.getText();
    const dependencies = parsePackageJson(text);

    if (dependencies.length === 0) {
      return [];
    }

    // Show loading status
    this.statusBarItem.text = `Checking updates: 0/${dependencies.length}`;
    this.statusBarItem.show();

    let completed = 0;

    // Check versions for all dependencies
    const versionChecks = dependencies.map(async dep => {
      if (token.isCancellationRequested) {
        return null;
      }

      const versionInfo = await this.versionChecker.checkVersion(dep.name, dep.version, () => {
        completed++;
        this.statusBarItem.text = `Checking updates: ${completed}/${dependencies.length}`;
      });

      if (!versionInfo) {
        return null;
      }

      const rangeStart = document.positionAt(dep.end);
      const range = new vscode.Range(rangeStart, rangeStart);
      const lenses: vscode.CodeLens[] = [];

      // Add minor version update lens
      if (versionInfo.latestMinor) {
        lenses.push(
          new vscode.CodeLens(range, {
            arguments: [
              {
                newVersion: versionInfo.latestMinor,
                packageName: dep.name,
                rangeEnd: dep.end,
                rangeStart: dep.start,
              },
            ],
            command: 'upgradeYourPackage.updateVersion',
            title: `minor: ${versionInfo.latestMinor}`,
          }),
        );
      }

      // Add major version update lens
      if (versionInfo.latestMajor) {
        lenses.push(
          new vscode.CodeLens(range, {
            arguments: [
              {
                newVersion: versionInfo.latestMajor,
                packageName: dep.name,
                rangeEnd: dep.end,
                rangeStart: dep.start,
              },
            ],
            command: 'upgradeYourPackage.updateVersion',
            title: `major: ${versionInfo.latestMajor}`,
          }),
        );
      }

      return lenses;
    });

    const results = await Promise.all(versionChecks);

    // Hide status bar when done
    this.statusBarItem.hide();

    // Flatten and filter results
    return results.filter((lenses): lenses is vscode.CodeLens[] => lenses !== null).flat();
  }
}
