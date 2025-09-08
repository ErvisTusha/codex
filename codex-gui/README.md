# Codex GUI

Cross-platform graphical user interface for the Codex AI coding assistant, built with Electron.

## Features

- **VSCode-inspired Interface**: Clean, modern design with familiar UI patterns
- **File Explorer**: Browse and manage project files with tree view
- **Integrated Editor**: Monaco Editor with syntax highlighting for 20+ languages
- **AI Chat Interface**: Direct communication with Codex AI assistant
- **Integrated Terminal**: Built-in terminal for command execution
- **Cross-platform**: Supports Windows, macOS, and Linux
- **Settings Management**: Customizable theme, fonts, and editor preferences
- **Real-time Updates**: Live settings changes without restart

## Installation

### Prerequisites

- Node.js 20 or higher
- Codex CLI installed and available in PATH

### Development

```bash
# Clone the repository
git clone https://github.com/openai/codex.git
cd codex/codex-gui

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Usage

1. **Open Folder**: Use Ctrl/Cmd+Shift+O or click "Open Folder" to select your project directory
2. **Login to Codex**: Click the login button in the Codex panel or use the menu
3. **Start Coding**: Create or open files, use the AI chat for assistance
4. **Apply Changes**: Use Ctrl/Cmd+Shift+A to apply AI-suggested diffs

## Keyboard Shortcuts

- `Ctrl/Cmd + O` - Open File
- `Ctrl/Cmd + Shift + O` - Open Folder
- `Ctrl/Cmd + N` - New File
- `Ctrl/Cmd + S` - Save File
- `Ctrl/Cmd + Shift + S` - Save As
- `Ctrl/Cmd + B` - Toggle Sidebar
- `Ctrl/Cmd + \`` - Toggle Terminal
- `Ctrl/Cmd + Shift + A` - Apply Latest Diff
- `Ctrl/Cmd + ,` - Open Settings

## Architecture

The application consists of:

- **Main Process** (`main.js`): Electron main process handling window management and IPC
- **Renderer Process** (`src/app.js`): Frontend application logic
- **Codex Service** (`src/services/codex-service.js`): Interface to Codex CLI
- **Settings Manager** (`src/services/settings-manager.js`): Configuration management
- **Preload Script** (`preload.js`): Secure IPC bridge between main and renderer

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Apache-2.0 License - see LICENSE file for details.