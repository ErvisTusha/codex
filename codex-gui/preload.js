const path = require("node:path");
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  readDir: (dir) => ipcRenderer.invoke("read-dir", dir),
  readFile: (file) => ipcRenderer.invoke("read-file", file),
  writeFile: (file, content) => ipcRenderer.invoke("write-file", file, content),
  runCommand: (command, cwd) => ipcRenderer.invoke("run-command", command, cwd),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSettings: (s) => ipcRenderer.invoke("set-settings", s),
  pathJoin: (...args) => path.join(...args),
  cwd: () => process.cwd(),
  onSettings: (fn) => ipcRenderer.on("settings", (_, s) => fn(s)),
  onCommandData: (fn) => ipcRenderer.on("command-data", (_, d) => fn(d)),
});
