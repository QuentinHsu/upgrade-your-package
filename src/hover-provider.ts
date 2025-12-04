import * as vscode from 'vscode';

import { parsePackageJson } from './package-manager';
import type { VersionChecker } from './version-checker';

export class PackageHoverProvider implements vscode.HoverProvider {
  private versionChecker: VersionChecker;

  constructor(versionChecker: VersionChecker) {
    this.versionChecker = versionChecker;
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | null> {
    if (!document.fileName.endsWith('package.json')) {
      return null;
    }

    const text = document.getText();
    const dependencies = parsePackageJson(text);

    // Find the dependency at the current cursor position
    const cursorOffset = document.offsetAt(position);
    const dep = dependencies.find(d => cursorOffset >= d.start && cursorOffset <= d.end);
    if (!dep) {
      return null;
    }

    // Check if cursor is on the version string
    const lineText = document.lineAt(position.line).text;
    const versionMatch = lineText.match(/"([^"]+)":\s*"([^"]+)"/);
    if (!versionMatch) {
      return null;
    }

    const versionStartIndex = lineText.indexOf(versionMatch[2]);
    const versionEndIndex = versionStartIndex + versionMatch[2].length;

    if (position.character < versionStartIndex || position.character > versionEndIndex) {
      return null;
    }

    if (token.isCancellationRequested) {
      return null;
    }

    // Fetch version info
    const versionInfo = await this.versionChecker.checkVersion(dep.name, dep.version);
    if (!versionInfo) {
      return new vscode.Hover(new vscode.MarkdownString(`**${dep.name}**\n\nFailed to fetch version information.`));
    }

    // Build markdown content
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    markdown.appendMarkdown(`**${dep.name}**\n\n`);
    markdown.appendMarkdown(`Current: \`${dep.version}\`\n\n`);
    markdown.appendMarkdown(`Latest: \`${versionInfo.latest}\`\n\n`);
    markdown.appendMarkdown(`---\n\n`);
    markdown.appendMarkdown(`**Available Stable Versions** (newest to oldest):\n\n`);

    // Show stable versions with dates
    const maxVersionsToShow = 20;
    const versionsToShow = versionInfo.stableVersions.slice(0, maxVersionsToShow);

    for (const versionWithDate of versionsToShow) {
      const commandUri = vscode.Uri.parse(
        `command:upgradeYourPackage.updateVersion?${encodeURIComponent(
          JSON.stringify({
            newVersion: versionWithDate.version,
            packageName: dep.name,
            rangeEnd: dep.end,
            rangeStart: dep.start,
          }),
        )}`,
      );

      markdown.appendMarkdown(`- [${versionWithDate.version}](${commandUri}) - ${versionWithDate.date}\n`);
    }

    if (versionInfo.stableVersions.length > maxVersionsToShow) {
      markdown.appendMarkdown(`\n... and ${versionInfo.stableVersions.length - maxVersionsToShow} more stable versions\n`);
    }

    return new vscode.Hover(markdown);
  }
}
