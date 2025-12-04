# Upgrade Your Package

[![Version](https://img.shields.io/visual-studio-marketplace/v/QuentinHsu.upgrade-your-package)](https://marketplace.visualstudio.com/items?itemName=QuentinHsu.upgrade-your-package)
[![License](https://img.shields.io/github/license/QuentinHsu/upgrade-your-package)](https://github.com/QuentinHsu/upgrade-your-package/blob/main/LICENSE)

Automatically check for package updates in `package.json` and provide inline update hints with one-click upgrades.

## Features

### Automatic Version Checking
When you open a `package.json` file, the extension automatically queries the npm registry for the latest versions of all dependencies.

### Inline Update Hints
Shows update hints at the end of each dependency line:
- `minor: x.y.z` - Click to update to the latest minor version
- `major: x.y.z` - Click to update to the latest major version

### Version List on Hover
Hover over any version number to see:
- All available versions sorted from newest to oldest
- Release date for each version
- Click any version to update to that specific version

### Manual Check
Use the command palette to manually trigger an update check when needed.

### Progress Indicator
Shows progress in the status bar while checking for updates.

## Usage

1. Open any `package.json` file
2. The extension automatically checks for updates
3. Update hints appear at the end of each dependency line
4. Click on the version hint to update
5. Hover over version numbers to see all available versions

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for:

- **Check Package Updates** - Manually trigger an update check

## Requirements

- Visual Studio Code `^1.95.0` or higher

## Development

### Install Dependencies
```bash
pnpm install
```

### Compile
```bash
pnpm run compile
```

### Watch Mode
```bash
pnpm run watch
```

### Build Package
```bash
pnpm run build:package
```

### Testing
Press `F5` in VS Code to open a new Extension Development Host window with the extension loaded.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE) © [QuentinHsu](https://github.com/QuentinHsu)

## Links

- [GitHub Repository](https://github.com/QuentinHsu/upgrade-your-package)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=QuentinHsu.upgrade-your-package)
- [Report Issues](https://github.com/QuentinHsu/upgrade-your-package/issues)
