const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { readdir, readFile, writeFile } = require("node:fs/promises");
const settings = require("./settings");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.loadFile(path.join(__dirname, "index.html"));
  settings.onChange((s) => win.webContents.send("settings", s));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("read-dir", async (_, dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.map((e) => ({ name: e.name, isDir: e.isDirectory() }));
});

ipcMain.handle("read-file", (_, file) => readFile(file, "utf8"));

ipcMain.handle("write-file", async (_, file, content) => {
  await writeFile(file, content);
  return true;
});

ipcMain.handle(
  "run-command",
  (event, command, cwd) =>
    new Promise((resolve, reject) => {
      const child = spawn(command, { cwd, shell: true });
      child.stdout.on("data", (d) =>
        event.sender.send("command-data", d.toString()),
      );
      child.stderr.on("data", (d) =>
        event.sender.send("command-data", d.toString()),
      );
      child.on("close", (code) => resolve(code));
      child.on("error", reject);
    }),
);

ipcMain.handle("get-settings", () => settings.get());
ipcMain.handle("set-settings", (_, s) => settings.set(s));
