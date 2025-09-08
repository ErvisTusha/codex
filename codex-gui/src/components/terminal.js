export class Terminal {
  constructor(outputElement) {
    this.outputElement = outputElement;
    this.history = [];
    this.historyIndex = 0;
    this.setupTerminal();
  }

  setupTerminal() {
    // Create input area
    const inputContainer = document.createElement('div');
    inputContainer.className = 'terminal-input-container';
    inputContainer.style.display = 'flex';
    inputContainer.style.alignItems = 'center';
    inputContainer.style.padding = '8px';
    inputContainer.style.borderTop = '1px solid var(--border-color)';

    const prompt = document.createElement('span');
    prompt.textContent = '$ ';
    prompt.style.color = 'var(--accent-green)';
    prompt.style.marginRight = '8px';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'terminal-input';
    input.style.flex = '1';
    input.style.background = 'transparent';
    input.style.border = 'none';
    input.style.color = 'var(--text-primary)';
    input.style.fontFamily = 'var(--font-family-mono)';
    input.style.fontSize = 'var(--font-size-small)';
    input.style.outline = 'none';
    input.placeholder = 'Enter command...';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.executeCommand(input.value);
        input.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          input.value = this.history[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          input.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          input.value = '';
        }
      }
    });

    inputContainer.appendChild(prompt);
    inputContainer.appendChild(input);

    // Add input to terminal panel
    const terminalPanel = document.getElementById('terminal-panel');
    terminalPanel.appendChild(inputContainer);

    this.inputElement = input;
    this.addWelcomeMessage();
  }

  addWelcomeMessage() {
    this.addOutput('Welcome to Codex GUI Terminal', 'info');
    this.addOutput('Type commands to interact with your project.', 'info');
    this.addOutput('Use "help" for available commands.', 'info');
    this.addOutput('', 'normal');
  }

  addOutput(text, type = 'normal') {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    
    const timestamp = new Date().toLocaleTimeString();
    
    switch (type) {
      case 'command':
        line.innerHTML = `<span style="color: var(--accent-green)">$ ${text}</span>`;
        break;
      case 'error':
        line.innerHTML = `<span style="color: var(--accent-red)">[${timestamp}] ERROR: ${text}</span>`;
        break;
      case 'info':
        line.innerHTML = `<span style="color: var(--accent-blue)">[${timestamp}] ${text}</span>`;
        break;
      case 'success':
        line.innerHTML = `<span style="color: var(--accent-green)">[${timestamp}] ${text}</span>`;
        break;
      default:
        line.textContent = text;
    }
    
    this.outputElement.appendChild(line);
    this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }

  async executeCommand(command) {
    if (!command.trim()) return;

    // Add to history
    this.history.push(command);
    this.historyIndex = this.history.length;

    // Show command in output
    this.addOutput(command, 'command');

    // Handle built-in commands
    const args = command.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case 'help':
        this.showHelp();
        break;
      case 'clear':
        this.clear();
        break;
      case 'pwd':
        this.addOutput(window.electronAPI?.codex?.getWorkingDirectory?.() || process.cwd());
        break;
      case 'echo':
        this.addOutput(args.slice(1).join(' '));
        break;
      case 'codex':
        await this.executeCodexCommand(args.slice(1));
        break;
      default:
        // Try to execute as system command (in a real implementation)
        this.addOutput(`Command not found: ${cmd}. Try 'help' for available commands.`, 'error');
    }
  }

  async executeCodexCommand(args) {
    if (args.length === 0) {
      this.addOutput('Usage: codex [login|logout|status|chat|apply]', 'info');
      return;
    }

    const subcommand = args[0];
    
    try {
      let result;
      
      switch (subcommand) {
        case 'login':
          this.addOutput('Logging into Codex...', 'info');
          result = await window.electronAPI.codex.login();
          if (result.success) {
            this.addOutput('Successfully logged in to Codex', 'success');
          } else {
            this.addOutput(`Login failed: ${result.error}`, 'error');
          }
          break;
          
        case 'logout':
          this.addOutput('Logging out of Codex...', 'info');
          result = await window.electronAPI.codex.logout();
          if (result.success) {
            this.addOutput('Successfully logged out of Codex', 'success');
          } else {
            this.addOutput(`Logout failed: ${result.error}`, 'error');
          }
          break;
          
        case 'status':
          result = await window.electronAPI.codex.status();
          if (result.success) {
            this.addOutput('Codex status: Logged in', 'success');
          } else {
            this.addOutput('Codex status: Not logged in', 'error');
          }
          break;
          
        case 'chat':
          if (args.length < 2) {
            this.addOutput('Usage: codex chat <message>', 'info');
            return;
          }
          const message = args.slice(1).join(' ');
          this.addOutput(`Asking Codex: ${message}`, 'info');
          result = await window.electronAPI.codex.chat(message);
          if (result.success) {
            this.addOutput('Codex response:', 'info');
            this.addOutput(result.output);
          } else {
            this.addOutput(`Chat failed: ${result.error}`, 'error');
          }
          break;
          
        case 'apply':
          this.addOutput('Applying latest diff...', 'info');
          result = await window.electronAPI.codex.apply();
          if (result.success) {
            this.addOutput('Diff applied successfully', 'success');
          } else {
            this.addOutput(`Apply failed: ${result.error}`, 'error');
          }
          break;
          
        default:
          this.addOutput(`Unknown codex subcommand: ${subcommand}`, 'error');
      }
    } catch (error) {
      this.addOutput(`Command failed: ${error.message}`, 'error');
    }
  }

  showHelp() {
    this.addOutput('Available commands:', 'info');
    this.addOutput('  help         - Show this help message');
    this.addOutput('  clear        - Clear terminal output');
    this.addOutput('  pwd          - Show current working directory');
    this.addOutput('  echo <text>  - Echo text to output');
    this.addOutput('  codex <cmd>  - Execute Codex commands:');
    this.addOutput('    login      - Login to Codex');
    this.addOutput('    logout     - Logout from Codex');
    this.addOutput('    status     - Check login status');
    this.addOutput('    chat <msg> - Chat with Codex');
    this.addOutput('    apply      - Apply latest diff');
    this.addOutput('');
  }

  clear() {
    this.outputElement.innerHTML = '';
  }

  focus() {
    this.inputElement?.focus();
  }
}