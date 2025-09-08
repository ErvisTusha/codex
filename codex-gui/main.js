import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import { CodexService } from './src/services/codex-service.js';
import { SettingsManager } from './src/services/settings-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CodexGUI {
  constructor() {
    this.mainWindow = null;
    this.codexService = new CodexService();
    this.settingsManager = new SettingsManager();
    this.isDev = process.argv.includes('--dev');
  }

  async initialize() {
    await this.createMainWindow();
    this.setupIPC();
    this.setupMenu();
    await this.codexService.initialize();
  }

  async createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      icon: path.join(__dirname, 'assets', 'icon.png'),
      show: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: !this.isDev
      }
    });

    await this.mainWindow.loadFile('src/index.html');

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupIPC() {
    // Codex operations
    ipcMain.handle('codex:login', async () => {
      return await this.codexService.login();
    });

    ipcMain.handle('codex:logout', async () => {
      return await this.codexService.logout();
    });

    ipcMain.handle('codex:status', async () => {
      return await this.codexService.getStatus();
    });

    ipcMain.handle('codex:exec', async (event, command, options) => {
      return await this.codexService.exec(command, options);
    });

    ipcMain.handle('codex:chat', async (event, message, options) => {
      return await this.codexService.chat(message, options);
    });

    ipcMain.handle('codex:apply', async () => {
      return await this.codexService.applyDiff();
    });

    // File system operations
    ipcMain.handle('fs:readFile', async (event, filePath) => {
      try {
        return await fs.readFile(filePath, 'utf8');
      } catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
      }
    });

    ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
      try {
        await fs.writeFile(filePath, content, 'utf8');
        return true;
      } catch (error) {
        throw new Error(`Failed to write file: ${error.message}`);
      }
    });

    ipcMain.handle('fs:readDir', async (event, dirPath) => {
      try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        return items.map(item => ({
          name: item.name,
          isDirectory: item.isDirectory(),
          isFile: item.isFile(),
          path: path.join(dirPath, item.name)
        }));
      } catch (error) {
        throw new Error(`Failed to read directory: ${error.message}`);
      }
    });

    // Settings
    ipcMain.handle('settings:get', async (event, key) => {
      return await this.settingsManager.get(key);
    });

    ipcMain.handle('settings:set', async (event, key, value) => {
      const result = await this.settingsManager.set(key, value);
      this.mainWindow.webContents.send('settings:changed', { key, value });
      return result;
    });

    ipcMain.handle('settings:getAll', async () => {
      return await this.settingsManager.getAll();
    });

    // Dialog operations
    ipcMain.handle('dialog:openFile', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'rs'] }
        ]
      });
      return result;
    });

    ipcMain.handle('dialog:openDirectory', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory']
      });
      return result;
    });

    ipcMain.handle('dialog:saveFile', async () => {
      const result = await dialog.showSaveDialog(this.mainWindow, {
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'rs'] }
        ]
      });
      return result;
    });

    // External links
    ipcMain.handle('shell:openExternal', async (event, url) => {
      await shell.openExternal(url);
    });

    // Window operations
    ipcMain.handle('window:minimize', () => {
      this.mainWindow.minimize();
    });

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });

    ipcMain.handle('window:close', () => {
      this.mainWindow.close();
    });
  }

  setupMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New File',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow.webContents.send('menu:newFile');
            }
          },
          {
            label: 'Open File',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              this.mainWindow.webContents.send('menu:openFile');
            }
          },
          {
            label: 'Open Folder',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => {
              this.mainWindow.webContents.send('menu:openFolder');
            }
          },
          { type: 'separator' },
          {
            label: 'Save',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              this.mainWindow.webContents.send('menu:save');
            }
          },
          {
            label: 'Save As',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => {
              this.mainWindow.webContents.send('menu:saveAs');
            }
          },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
          { type: 'separator' },
          {
            label: 'Toggle Sidebar',
            accelerator: 'CmdOrCtrl+B',
            click: () => {
              this.mainWindow.webContents.send('menu:toggleSidebar');
            }
          },
          {
            label: 'Toggle Terminal',
            accelerator: 'CmdOrCtrl+`',
            click: () => {
              this.mainWindow.webContents.send('menu:toggleTerminal');
            }
          }
        ]
      },
      {
        label: 'Codex',
        submenu: [
          {
            label: 'Login',
            click: () => {
              this.mainWindow.webContents.send('menu:codexLogin');
            }
          },
          {
            label: 'Logout',
            click: () => {
              this.mainWindow.webContents.send('menu:codexLogout');
            }
          },
          { type: 'separator' },
          {
            label: 'Apply Latest Diff',
            accelerator: 'CmdOrCtrl+Shift+A',
            click: () => {
              this.mainWindow.webContents.send('menu:applyDiff');
            }
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.mainWindow.webContents.send('menu:settings');
            }
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      },
      {
        role: 'help',
        submenu: [
          {
            label: 'About Codex GUI',
            click: () => {
              this.mainWindow.webContents.send('menu:about');
            }
          },
          {
            label: 'Codex Documentation',
            click: async () => {
              await shell.openExternal('https://github.com/openai/codex/blob/main/README.md');
            }
          }
        ]
      }
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });

      template[4].submenu = [
        { role: 'close' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// App event handlers
app.whenReady().then(async () => {
  const codexGUI = new CodexGUI();
  await codexGUI.initialize();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await codexGUI.initialize();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});