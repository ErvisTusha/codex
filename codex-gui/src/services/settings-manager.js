import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';

export class SettingsManager {
  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.defaultSettings = {
      theme: 'dark',
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, monospace',
      sidebarWidth: 250,
      terminalHeight: 300,
      showSidebar: true,
      showTerminal: true,
      autoSave: true,
      tabSize: 2,
      wordWrap: true,
      showLineNumbers: true,
      showMinimap: false,
      codex: {
        model: 'o1-mini',
        sandbox: 'workspace-write',
        approval: 'untrusted',
        autoApply: false,
        workingDirectory: null
      },
      terminal: {
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
        cursorStyle: 'block',
        cursorBlink: true,
        scrollback: 1000
      },
      fileExplorer: {
        showHiddenFiles: false,
        sortBy: 'name',
        sortOrder: 'asc'
      }
    };
    this.settings = null;
  }

  async load() {
    try {
      if (await fs.pathExists(this.settingsPath)) {
        const data = await fs.readJson(this.settingsPath);
        this.settings = { ...this.defaultSettings, ...data };
      } else {
        this.settings = { ...this.defaultSettings };
        await this.save();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  async save() {
    try {
      await fs.ensureDir(path.dirname(this.settingsPath));
      await fs.writeJson(this.settingsPath, this.settings, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async get(key) {
    if (!this.settings) {
      await this.load();
    }
    
    if (!key) {
      return this.settings;
    }
    
    const keys = key.split('.');
    let value = this.settings;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  async set(key, value) {
    if (!this.settings) {
      await this.load();
    }
    
    const keys = key.split('.');
    let target = this.settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[keys[keys.length - 1]] = value;
    
    await this.save();
    return true;
  }

  async getAll() {
    if (!this.settings) {
      await this.load();
    }
    return this.settings;
  }

  async reset(key) {
    if (!this.settings) {
      await this.load();
    }
    
    if (!key) {
      this.settings = { ...this.defaultSettings };
    } else {
      const keys = key.split('.');
      let defaultValue = this.defaultSettings;
      
      for (const k of keys) {
        if (defaultValue && typeof defaultValue === 'object' && k in defaultValue) {
          defaultValue = defaultValue[k];
        } else {
          defaultValue = undefined;
          break;
        }
      }
      
      if (defaultValue !== undefined) {
        await this.set(key, defaultValue);
      }
    }
    
    await this.save();
    return true;
  }

  async has(key) {
    if (!this.settings) {
      await this.load();
    }
    
    const keys = key.split('.');
    let value = this.settings;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return false;
      }
    }
    
    return true;
  }
}