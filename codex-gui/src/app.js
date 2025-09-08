import { FileExplorer } from './components/file-explorer.js';
import { Terminal } from './components/terminal.js';

class CodexGUIApp {
  constructor() {
    this.currentWorkspace = null;
    this.activeTab = null;
    this.tabs = new Map();
    this.tabCounter = 0;
    this.isTerminalVisible = true;
    this.isSidebarVisible = true;
    this.monaco = null;
    this.editors = new Map();
    this.settings = {};
    this.fileExplorer = null;
    this.terminal = null;
    
    this.initialize();
  }

  async initialize() {
    await this.loadSettings();
    this.setupUI();
    this.setupEventListeners();
    this.setupMenuHandlers();
    this.initializeMonaco();
    this.initializeComponents();
    await this.checkCodexStatus();
  }

  initializeComponents() {
    this.fileExplorer = new FileExplorer(this);
    this.terminal = new Terminal(document.getElementById('terminal'));
  }

  async loadSettings() {
    try {
      this.settings = await window.electronAPI.settings.getAll();
      this.applySetting();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  applySetting() {
    // Apply theme and UI settings
    if (this.settings.sidebarWidth) {
      document.documentElement.style.setProperty('--sidebar-width', `${this.settings.sidebarWidth}px`);
    }
    if (this.settings.terminalHeight) {
      document.documentElement.style.setProperty('--bottom-panel-height', `${this.settings.terminalHeight}px`);
    }
    
    // Show/hide panels based on settings
    if (!this.settings.showSidebar) {
      this.toggleSidebar();
    }
    if (!this.settings.showTerminal) {
      this.toggleTerminal();
    }
  }

  setupUI() {
    // Hide title bar on macOS
    if (navigator.platform.includes('Mac')) {
      document.getElementById('title-bar').style.display = 'none';
      document.querySelector('.main-layout').style.height = 'calc(100vh - var(--status-bar-height))';
    }

    // Initialize sidebar tabs
    this.setupSidebarTabs();
    
    // Initialize bottom panel tabs
    this.setupBottomPanelTabs();
    
    // Setup resize handles
    this.setupResizeHandles();
  }

  setupEventListeners() {
    // Title bar controls
    document.getElementById('minimize-btn')?.addEventListener('click', () => {
      window.electronAPI.window.minimize();
    });

    document.getElementById('maximize-btn')?.addEventListener('click', () => {
      window.electronAPI.window.maximize();
    });

    document.getElementById('close-btn')?.addEventListener('click', () => {
      window.electronAPI.window.close();
    });

    // File operations
    document.getElementById('open-folder-btn')?.addEventListener('click', () => {
      this.openFolder();
    });

    document.getElementById('welcome-open-folder')?.addEventListener('click', () => {
      this.openFolder();
    });

    document.getElementById('welcome-new-file')?.addEventListener('click', () => {
      this.newFile();
    });

    document.getElementById('new-file-btn')?.addEventListener('click', () => {
      this.newFile();
    });

    document.getElementById('refresh-explorer-btn')?.addEventListener('click', () => {
      this.refreshExplorer();
    });

    // Search
    document.getElementById('search-btn')?.addEventListener('click', () => {
      this.performSearch();
    });

    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    // Codex operations
    document.getElementById('codex-login-btn')?.addEventListener('click', () => {
      this.codexLogin();
    });

    document.getElementById('codex-status-btn')?.addEventListener('click', () => {
      this.checkCodexStatus();
    });

    document.getElementById('send-chat-btn')?.addEventListener('click', () => {
      this.sendChat();
    });

    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        this.sendChat();
      }
    });

    // Terminal
    document.getElementById('clear-terminal-btn')?.addEventListener('click', () => {
      this.clearTerminal();
    });

    document.getElementById('toggle-terminal-btn')?.addEventListener('click', () => {
      this.toggleTerminal();
    });
  }

  setupMenuHandlers() {
    // Listen for menu events from main process
    window.electronAPI.menu.onNewFile(() => this.newFile());
    window.electronAPI.menu.onOpenFile(() => this.openFile());
    window.electronAPI.menu.onOpenFolder(() => this.openFolder());
    window.electronAPI.menu.onSave(() => this.saveCurrentFile());
    window.electronAPI.menu.onSaveAs(() => this.saveAsCurrentFile());
    window.electronAPI.menu.onToggleSidebar(() => this.toggleSidebar());
    window.electronAPI.menu.onToggleTerminal(() => this.toggleTerminal());
    window.electronAPI.menu.onCodexLogin(() => this.codexLogin());
    window.electronAPI.menu.onCodexLogout(() => this.codexLogout());
    window.electronAPI.menu.onApplyDiff(() => this.applyDiff());
    window.electronAPI.menu.onSettings(() => this.showSettings());
    window.electronAPI.menu.onAbout(() => this.showAbout());

    // Listen for settings changes
    window.electronAPI.settings.onChange((data) => {
      this.settings = { ...this.settings, [data.key]: data.value };
      this.applySetting();
    });
  }

  setupSidebarTabs() {
    const tabs = document.querySelectorAll('.sidebar-tab');
    const panels = document.querySelectorAll('.sidebar-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active panel
        panels.forEach(p => p.classList.remove('active'));
        document.getElementById(`${targetTab}-panel`).classList.add('active');
      });
    });
  }

  setupBottomPanelTabs() {
    const tabs = document.querySelectorAll('.panel-tab');
    const panels = document.querySelectorAll('.bottom-panel-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetPanel = tab.dataset.panel;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active panel
        panels.forEach(p => p.classList.remove('active'));
        document.getElementById(`${targetPanel}-panel`).classList.add('active');
      });
    });
  }

  setupResizeHandles() {
    // Sidebar resize
    const sidebarResize = document.getElementById('sidebar-resize');
    let isResizingSidebar = false;

    sidebarResize.addEventListener('mousedown', (e) => {
      isResizingSidebar = true;
      document.addEventListener('mousemove', handleSidebarResize);
      document.addEventListener('mouseup', stopSidebarResize);
      e.preventDefault();
    });

    const handleSidebarResize = (e) => {
      if (!isResizingSidebar) return;
      const newWidth = e.clientX;
      if (newWidth > 150 && newWidth < 400) {
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
        window.electronAPI.settings.set('sidebarWidth', newWidth);
      }
    };

    const stopSidebarResize = () => {
      isResizingSidebar = false;
      document.removeEventListener('mousemove', handleSidebarResize);
      document.removeEventListener('mouseup', stopSidebarResize);
    };

    // Bottom panel resize
    const bottomResize = document.getElementById('bottom-resize');
    let isResizingBottom = false;

    bottomResize.addEventListener('mousedown', (e) => {
      isResizingBottom = true;
      document.addEventListener('mousemove', handleBottomResize);
      document.addEventListener('mouseup', stopBottomResize);
      e.preventDefault();
    });

    const handleBottomResize = (e) => {
      if (!isResizingBottom) return;
      const newHeight = window.innerHeight - e.clientY - 22; // Account for status bar
      if (newHeight > 100 && newHeight < 600) {
        document.documentElement.style.setProperty('--bottom-panel-height', `${newHeight}px`);
        window.electronAPI.settings.set('terminalHeight', newHeight);
      }
    };

    const stopBottomResize = () => {
      isResizingBottom = false;
      document.removeEventListener('mousemove', handleBottomResize);
      document.removeEventListener('mouseup', stopBottomResize);
    };
  }

  async initializeMonaco() {
    require.config({
      paths: {
        vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs'
      }
    });

    require(['vs/editor/editor.main'], () => {
      this.monaco = monaco;
      
      // Set dark theme
      monaco.editor.setTheme('vs-dark');
      
      console.log('Monaco Editor initialized');
    });
  }

  async openFolder() {
    try {
      const result = await window.electronAPI.dialog.openDirectory();
      if (!result.canceled && result.filePaths.length > 0) {
        this.currentWorkspace = result.filePaths[0];
        await this.loadFileTree();
        this.hideWelcomeScreen();
        this.updateStatusBar();
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }

  async openFile() {
    try {
      const result = await window.electronAPI.dialog.openFile();
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        await this.openFileInEditor(filePath);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }

  async loadFileTree() {
    if (this.fileExplorer) {
      await this.fileExplorer.loadFileTree(this.currentWorkspace);
    }
  }

  async openFileInEditor(filePath) {
    try {
      // Check if file is already open
      if (this.tabs.has(filePath)) {
        this.switchToTab(filePath);
        return;
      }

      const content = await window.electronAPI.fs.readFile(filePath);
      this.createTab(filePath, content);
      this.hideWelcomeScreen();
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }

  createTab(filePath, content) {
    const tabId = `tab-${this.tabCounter++}`;
    const fileName = filePath.split('/').pop();
    
    // Create tab element
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tabId;
    tabElement.innerHTML = `
      <div class="tab-icon">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path fill="currentColor" d="M4 0h5.293L14 4.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a.5.5 0 0 0 .5.5h2l-2.5-2.5z"/>
        </svg>
      </div>
      <div class="tab-title">${fileName}</div>
      <button class="tab-close">×</button>
    `;

    // Add tab event listeners
    tabElement.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        this.switchToTab(filePath);
      }
    });

    tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(filePath);
    });

    // Add tab to tab bar
    document.querySelector('.tabs').appendChild(tabElement);

    // Create editor
    if (this.monaco) {
      const editorContainer = document.createElement('div');
      editorContainer.id = `editor-${tabId}`;
      editorContainer.style.height = '100%';
      editorContainer.style.display = 'none';
      
      const language = this.getLanguageFromFileName(fileName);
      const editor = this.monaco.editor.create(editorContainer, {
        value: content,
        language: language,
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: this.settings.fontSize || 14,
        fontFamily: this.settings.fontFamily || 'Monaco, Menlo, monospace',
        tabSize: this.settings.tabSize || 2,
        wordWrap: this.settings.wordWrap ? 'on' : 'off',
        lineNumbers: this.settings.showLineNumbers ? 'on' : 'off',
        minimap: { enabled: this.settings.showMinimap || false }
      });

      document.getElementById('editor-container').appendChild(editorContainer);
      this.editors.set(filePath, editor);
    }

    // Store tab data
    this.tabs.set(filePath, {
      id: tabId,
      filePath,
      fileName,
      content,
      modified: false,
      element: tabElement
    });

    this.switchToTab(filePath);
  }

  switchToTab(filePath) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const tabData = this.tabs.get(filePath);
    if (tabData) {
      tabData.element.classList.add('active');
      this.activeTab = filePath;

      // Show corresponding editor
      document.querySelectorAll('[id^="editor-"]').forEach(editor => {
        editor.style.display = 'none';
      });
      
      const editorElement = document.getElementById(`editor-${tabData.id}`);
      if (editorElement) {
        editorElement.style.display = 'block';
        
        // Update cursor position in status bar
        const editor = this.editors.get(filePath);
        if (editor) {
          const position = editor.getPosition();
          this.updateCursorPosition(position.lineNumber, position.column);
        }
      }

      this.updateFilePathInStatusBar(filePath);
    }
  }

  closeTab(filePath) {
    const tabData = this.tabs.get(filePath);
    if (tabData) {
      // Remove tab element
      tabData.element.remove();
      
      // Remove editor
      const editorElement = document.getElementById(`editor-${tabData.id}`);
      if (editorElement) {
        editorElement.remove();
      }
      
      // Dispose Monaco editor
      const editor = this.editors.get(filePath);
      if (editor) {
        editor.dispose();
        this.editors.delete(filePath);
      }
      
      this.tabs.delete(filePath);
      
      // Switch to another tab or show welcome screen
      if (this.activeTab === filePath) {
        const remainingTabs = Array.from(this.tabs.keys());
        if (remainingTabs.length > 0) {
          this.switchToTab(remainingTabs[0]);
        } else {
          this.showWelcomeScreen();
        }
      }
    }
  }

  newFile() {
    const fileName = `Untitled-${Date.now()}`;
    const filePath = `untitled:${fileName}`;
    this.createTab(filePath, '');
  }

  async saveCurrentFile() {
    if (!this.activeTab) return;
    
    const tabData = this.tabs.get(this.activeTab);
    if (!tabData) return;

    try {
      const editor = this.editors.get(this.activeTab);
      const content = editor ? editor.getValue() : tabData.content;
      
      if (this.activeTab.startsWith('untitled:')) {
        // Save as for untitled files
        await this.saveAsCurrentFile();
      } else {
        await window.electronAPI.fs.writeFile(this.activeTab, content);
        this.markTabAsSaved(this.activeTab);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }

  async saveAsCurrentFile() {
    if (!this.activeTab) return;
    
    try {
      const result = await window.electronAPI.dialog.saveFile();
      if (!result.canceled && result.filePath) {
        const editor = this.editors.get(this.activeTab);
        const content = editor ? editor.getValue() : '';
        
        await window.electronAPI.fs.writeFile(result.filePath, content);
        
        // Update tab with new file path
        const tabData = this.tabs.get(this.activeTab);
        if (tabData) {
          this.tabs.delete(this.activeTab);
          tabData.filePath = result.filePath;
          tabData.fileName = result.filePath.split('/').pop();
          this.tabs.set(result.filePath, tabData);
          this.activeTab = result.filePath;
          
          // Update tab display
          tabData.element.querySelector('.tab-title').textContent = tabData.fileName;
        }
      }
    } catch (error) {
      console.error('Failed to save file as:', error);
    }
  }

  markTabAsSaved(filePath) {
    const tabData = this.tabs.get(filePath);
    if (tabData) {
      tabData.modified = false;
      // Remove asterisk from tab title if present
      const titleElement = tabData.element.querySelector('.tab-title');
      titleElement.textContent = titleElement.textContent.replace(' *', '');
    }
  }

  getLanguageFromFileName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const languageMap = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      xml: 'xml',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml',
      toml: 'toml',
      sh: 'shell',
      sql: 'sql'
    };
    return languageMap[extension] || 'plaintext';
  }

  hideWelcomeScreen() {
    document.getElementById('welcome-screen').style.display = 'none';
  }

  showWelcomeScreen() {
    document.getElementById('welcome-screen').style.display = 'flex';
    this.activeTab = null;
    this.updateFilePathInStatusBar('');
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    this.isSidebarVisible = !this.isSidebarVisible;
    sidebar.style.display = this.isSidebarVisible ? 'flex' : 'none';
    window.electronAPI.settings.set('showSidebar', this.isSidebarVisible);
  }

  toggleTerminal() {
    const bottomPanel = document.getElementById('bottom-panel');
    this.isTerminalVisible = !this.isTerminalVisible;
    bottomPanel.style.display = this.isTerminalVisible ? 'flex' : 'none';
    window.electronAPI.settings.set('showTerminal', this.isTerminalVisible);
  }

  async performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query || !this.currentWorkspace) return;

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<div class="empty-state">Searching...</div>';

    try {
      // Simple file content search - in a real app you'd use a more sophisticated search
      console.log('Searching for:', query);
      resultsContainer.innerHTML = '<div class="empty-state">Search functionality coming soon</div>';
    } catch (error) {
      console.error('Search failed:', error);
      resultsContainer.innerHTML = '<div class="empty-state">Search failed</div>';
    }
  }

  refreshExplorer() {
    if (this.fileExplorer) {
      this.fileExplorer.refresh();
    }
  }

  async checkCodexStatus() {
    try {
      const result = await window.electronAPI.codex.status();
      const statusElement = document.getElementById('status-value');
      if (result.success) {
        statusElement.textContent = 'Logged in';
        statusElement.style.color = 'var(--accent-green)';
      } else {
        statusElement.textContent = 'Not logged in';
        statusElement.style.color = 'var(--accent-red)';
      }
    } catch (error) {
      console.error('Failed to check Codex status:', error);
      document.getElementById('status-value').textContent = 'Error';
    }
  }

  async codexLogin() {
    try {
      this.addOutputMessage('Logging into Codex...');
      const result = await window.electronAPI.codex.login();
      if (result.success) {
        this.addOutputMessage('Successfully logged in to Codex');
        await this.checkCodexStatus();
      } else {
        this.addOutputMessage(`Login failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Codex login failed:', error);
      this.addOutputMessage(`Login failed: ${error.message}`);
    }
  }

  async codexLogout() {
    try {
      const result = await window.electronAPI.codex.logout();
      if (result.success) {
        this.addOutputMessage('Successfully logged out of Codex');
        await this.checkCodexStatus();
      } else {
        this.addOutputMessage(`Logout failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Codex logout failed:', error);
      this.addOutputMessage(`Logout failed: ${error.message}`);
    }
  }

  async sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    // Add user message to chat
    this.addChatMessage('user', message);
    input.value = '';

    try {
      this.addChatMessage('assistant', 'Thinking...');
      
      const result = await window.electronAPI.codex.chat(message, {
        workingDir: this.currentWorkspace,
        onOutput: (output) => {
          // Update the last assistant message with streaming output
          this.updateLastChatMessage(output);
        }
      });

      if (result.success) {
        this.updateLastChatMessage(result.output);
      } else {
        this.updateLastChatMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Chat failed:', error);
      this.updateLastChatMessage(`Error: ${error.message}`);
    }
  }

  addChatMessage(role, content) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${role}`;
    messageElement.innerHTML = `
      <div class="chat-message-header">
        <strong>${role === 'user' ? 'You' : 'Codex'}</strong>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>
      <div class="chat-message-content">${this.formatChatContent(content)}</div>
    `;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  updateLastChatMessage(content) {
    const messagesContainer = document.getElementById('chat-messages');
    const lastMessage = messagesContainer.lastElementChild;
    if (lastMessage && lastMessage.classList.contains('assistant')) {
      const contentElement = lastMessage.querySelector('.chat-message-content');
      contentElement.innerHTML = this.formatChatContent(content);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  formatChatContent(content) {
    // Simple formatting - convert code blocks and line breaks
    return content
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  async applyDiff() {
    try {
      this.addOutputMessage('Applying latest diff...');
      const result = await window.electronAPI.codex.apply();
      if (result.success) {
        this.addOutputMessage('Diff applied successfully');
        await this.refreshExplorer();
      } else {
        this.addOutputMessage(`Apply failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Apply diff failed:', error);
      this.addOutputMessage(`Apply failed: ${error.message}`);
    }
  }

  addOutputMessage(message) {
    const outputContent = document.getElementById('output-content');
    const timestamp = new Date().toLocaleTimeString();
    outputContent.textContent += `[${timestamp}] ${message}\n`;
    outputContent.scrollTop = outputContent.scrollHeight;
  }

  clearTerminal() {
    document.getElementById('output-content').textContent = '';
  }

  showSettings() {
    // Switch to settings tab
    document.querySelector('[data-tab="settings"]').click();
    
    // Populate settings form
    this.populateSettings();
  }

  populateSettings() {
    const settingsContent = document.getElementById('settings-content');
    settingsContent.innerHTML = `
      <div class="settings-group">
        <div class="settings-group-title">Appearance</div>
        <div class="setting-item">
          <label class="setting-label">Theme</label>
          <select class="setting-input" data-setting="theme">
            <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
          </select>
        </div>
        <div class="setting-item">
          <label class="setting-label">Font Size</label>
          <input type="number" class="setting-input" data-setting="fontSize" value="${this.settings.fontSize || 14}" min="8" max="24">
        </div>
        <div class="setting-item">
          <label class="setting-label">Font Family</label>
          <input type="text" class="setting-input" data-setting="fontFamily" value="${this.settings.fontFamily || 'Monaco, Menlo, monospace'}">
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">Editor</div>
        <div class="setting-item">
          <label class="setting-label">Tab Size</label>
          <input type="number" class="setting-input" data-setting="tabSize" value="${this.settings.tabSize || 2}" min="1" max="8">
        </div>
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" class="setting-checkbox" data-setting="wordWrap" ${this.settings.wordWrap ? 'checked' : ''}>
            Word Wrap
          </label>
        </div>
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" class="setting-checkbox" data-setting="showLineNumbers" ${this.settings.showLineNumbers !== false ? 'checked' : ''}>
            Show Line Numbers
          </label>
        </div>
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" class="setting-checkbox" data-setting="showMinimap" ${this.settings.showMinimap ? 'checked' : ''}>
            Show Minimap
          </label>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-group-title">Codex</div>
        <div class="setting-item">
          <label class="setting-label">Model</label>
          <select class="setting-input" data-setting="codex.model">
            <option value="o1-mini" ${this.settings.codex?.model === 'o1-mini' ? 'selected' : ''}>o1-mini</option>
            <option value="o1-preview" ${this.settings.codex?.model === 'o1-preview' ? 'selected' : ''}>o1-preview</option>
            <option value="gpt-4o" ${this.settings.codex?.model === 'gpt-4o' ? 'selected' : ''}>GPT-4o</option>
          </select>
        </div>
        <div class="setting-item">
          <label class="setting-label">Sandbox Mode</label>
          <select class="setting-input" data-setting="codex.sandbox">
            <option value="read-only" ${this.settings.codex?.sandbox === 'read-only' ? 'selected' : ''}>Read Only</option>
            <option value="workspace-write" ${this.settings.codex?.sandbox === 'workspace-write' ? 'selected' : ''}>Workspace Write</option>
            <option value="danger-full-access" ${this.settings.codex?.sandbox === 'danger-full-access' ? 'selected' : ''}>Full Access (Dangerous)</option>
          </select>
        </div>
      </div>
    `;

    // Add event listeners for settings changes
    settingsContent.querySelectorAll('[data-setting]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const setting = e.target.dataset.setting;
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        await window.electronAPI.settings.set(setting, value);
      });
    });
  }

  showAbout() {
    // Simple about dialog - in a real app you might use a modal
    alert('Codex GUI\nVersion 0.0.0-dev\n\nA modern, VSCode-inspired interface for the Codex AI coding assistant.');
  }

  updateStatusBar() {
    if (this.currentWorkspace) {
      const branchName = document.getElementById('branch-name');
      branchName.textContent = 'main'; // You could detect actual git branch
    }
  }

  updateFilePathInStatusBar(filePath) {
    const filePathElement = document.getElementById('file-path');
    if (filePath && !filePath.startsWith('untitled:')) {
      const relativePath = this.currentWorkspace ? 
        filePath.replace(this.currentWorkspace, '') : 
        filePath.split('/').pop();
      filePathElement.textContent = relativePath;
    } else {
      filePathElement.textContent = '';
    }
  }

  updateCursorPosition(line, column) {
    document.getElementById('cursor-position').textContent = `Ln ${line}, Col ${column}`;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CodexGUIApp();
});