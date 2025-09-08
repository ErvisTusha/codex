import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CodexService {
  constructor() {
    this.codexPath = this.getCodexBinaryPath();
    this.currentWorkingDir = process.cwd();
  }

  async initialize() {
    try {
      await this.exec('--version');
      console.log('Codex CLI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Codex CLI:', error);
      throw new Error('Codex CLI binary not found or not executable');
    }
  }

  getCodexBinaryPath() {
    const { platform, arch } = process;
    
    const platformMap = {
      linux: { x64: 'x86_64-unknown-linux-musl', arm64: 'aarch64-unknown-linux-musl' },
      android: { x64: 'x86_64-unknown-linux-musl', arm64: 'aarch64-unknown-linux-musl' },
      darwin: { x64: 'x86_64-apple-darwin', arm64: 'aarch64-apple-darwin' },
      win32: { x64: 'x86_64-pc-windows-msvc.exe', arm64: 'aarch64-pc-windows-msvc.exe' }
    };

    const targetTriple = platformMap[platform]?.[arch];
    if (!targetTriple) {
      throw new Error(`Unsupported platform: ${platform} (${arch})`);
    }

    return path.join(__dirname, '..', '..', 'codex-cli', 'bin', `codex-${targetTriple}`);
  }

  async exec(command, options = {}) {
    return new Promise((resolve, reject) => {
      const args = typeof command === 'string' ? command.split(' ') : command;
      const childOptions = {
        cwd: options.cwd || this.currentWorkingDir,
        env: { ...process.env, ...options.env }
      };

      const child = spawn(this.codexPath, args, childOptions);
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        options.onStdout?.(output);
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        options.onStderr?.(output);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr || stdout}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn process: ${error.message}`));
      });

      if (options.stdin) {
        child.stdin?.write(options.stdin);
        child.stdin?.end();
      }
    });
  }

  async login() {
    return this.executeCommand(['login']);
  }

  async logout() {
    return this.executeCommand(['logout']);
  }

  async getStatus() {
    return this.executeCommand(['login', 'status']);
  }

  async chat(message, options = {}) {
    const args = this.buildChatArgs(message, options);
    return this.executeCommand(args, options);
  }

  async execCommand(command, options = {}) {
    const args = ['exec', ...this.buildExecutionArgs(options), command];
    return this.executeCommand(args, options);
  }

  async applyDiff() {
    return this.executeCommand(['apply'], { cwd: this.currentWorkingDir });
  }

  buildChatArgs(message, options) {
    const args = [];
    
    if (options.model) args.push('-m', options.model);
    if (options.sandbox) args.push('-s', options.sandbox);
    if (options.approval) args.push('-a', options.approval);
    if (options.fullAuto) args.push('--full-auto');
    if (options.workingDir) {
      args.push('-C', options.workingDir);
      this.currentWorkingDir = options.workingDir;
    }
    
    args.push(message);
    return args;
  }

  buildExecutionArgs(options) {
    const args = [];
    
    if (options.model) args.push('-m', options.model);
    if (options.sandbox) args.push('-s', options.sandbox);
    if (options.approval) args.push('-a', options.approval);
    if (options.workingDir) {
      args.push('-C', options.workingDir);
      this.currentWorkingDir = options.workingDir;
    }
    
    return args;
  }

  async executeCommand(args, options = {}) {
    try {
      const result = await this.exec(args, {
        cwd: this.currentWorkingDir,
        onStdout: options.onOutput,
        onStderr: options.onError
      });
      return { success: true, output: result.stdout };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  setWorkingDirectory(dir) {
    this.currentWorkingDir = dir;
  }

  getWorkingDirectory() {
    return this.currentWorkingDir;
  }
}