import * as vscode from 'vscode';

import { PackageCodeLensProvider } from './code-lens-provider';
import { PackageHoverProvider } from './hover-provider';
import { VersionChecker } from './version-checker';

const PACKAGE_JSON_PATTERN = '**/package.json';
const VERSION_REGEX = /["']([~^]?[\d.]+[-\w.]*)["']/;

let versionChecker: VersionChecker;
let statusBarItem: vscode.StatusBarItem;
let codeLensProvider: PackageCodeLensProvider;

function isPackageJson(fileName: string): boolean {
  return fileName.endsWith('package.json');
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "upgrade-your-package" is now active');

  versionChecker = new VersionChecker();
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  context.subscriptions.push(statusBarItem);

  // Register CodeLens provider for package.json
  codeLensProvider = new PackageCodeLensProvider(versionChecker, statusBarItem);
  context.subscriptions.push(vscode.languages.registerCodeLensProvider({ pattern: PACKAGE_JSON_PATTERN }, codeLensProvider));

  // Register Hover provider for package.json
  const hoverProvider = new PackageHoverProvider(versionChecker);
  context.subscriptions.push(vscode.languages.registerHoverProvider({ pattern: PACKAGE_JSON_PATTERN }, hoverProvider));

  // Auto-refresh when opening package.json
  vscode.workspace.onDidOpenTextDocument(
    document => {
      if (isPackageJson(document.fileName)) {
        codeLensProvider.refresh();
      }
    },
    null,
    context.subscriptions,
  );

  // Initial refresh for active editor
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && isPackageJson(activeEditor.document.fileName)) {
    codeLensProvider.refresh();
  }

  // Register command to manually check updates
  context.subscriptions.push(
    vscode.commands.registerCommand('upgradeYourPackage.checkUpdates', () => {
      vscode.window.showInformationMessage('Checking for package updates...');
      versionChecker.clearCache();
      codeLensProvider.refresh();
    }),
  );

  // Register command to update package version
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'upgradeYourPackage.updateVersion',
      async (args: { packageName: string; newVersion: string; rangeStart?: number; rangeEnd?: number; line?: number }) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          return;
        }

        let replaceRange: vscode.Range | null = null;
        if (typeof args.rangeStart === 'number' && typeof args.rangeEnd === 'number') {
          const start = editor.document.positionAt(args.rangeStart);
          const end = editor.document.positionAt(args.rangeEnd);
          replaceRange = new vscode.Range(start, end);
        } else if (typeof args.line === 'number') {
          const lineText = editor.document.lineAt(args.line).text;
          const match = lineText.match(VERSION_REGEX);
          if (match && match.index !== undefined) {
            const start = new vscode.Position(args.line, match.index + 1);
            const end = new vscode.Position(args.line, match.index + match[0].length - 1);
            replaceRange = new vscode.Range(start, end);
          }
        }

        if (!replaceRange) {
          return;
        }

        const existingText = editor.document.getText(replaceRange);
        let replacementText = args.newVersion;
        const quoteMatch = existingText.match(/^(['"])(.*)\1$/);
        if (quoteMatch) {
          replacementText = `${quoteMatch[1]}${args.newVersion}${quoteMatch[1]}`;
        }

        await editor.edit(editBuilder => {
          editBuilder.replace(replaceRange!, replacementText);
        });

        vscode.window.showInformationMessage(`Updated ${args.packageName} to ${args.newVersion}`);

        codeLensProvider.refresh();
      },
    ),
  );
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
