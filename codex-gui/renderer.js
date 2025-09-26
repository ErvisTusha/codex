import * as monaco from "monaco-editor";
import { Terminal } from "xterm";

const sidebar = document.getElementById("sidebar");
const output = document.getElementById("output");
const themeSelect = document.getElementById("theme");
const fontInput = document.getElementById("fontSize");
let editor;
let terminal;

async function init() {
  const settings = await window.api.getSettings();
  applySettings(settings);
  themeSelect.value = settings.theme;
  fontInput.value = settings.fontSize;
  window.api.onSettings(applySettings);

  editor = monaco.editor.create(document.getElementById("editor"), {
    value: "",
    language: "javascript",
    theme: settings.theme,
    fontSize: settings.fontSize,
    automaticLayout: true,
  });

  terminal = new Terminal({ fontSize: settings.fontSize });
  terminal.open(document.getElementById("terminal"));
  terminal.write("> ");
  let input = "";
  terminal.onKey(async ({ key, domEvent }) => {
    if (domEvent.key === "Enter") {
      terminal.write("\r\n");
      await window.api.runCommand(input, window.api.cwd());
      input = "";
      terminal.write("> ");
    } else if (domEvent.key === "Backspace") {
      if (input.length > 0) {
        input = input.slice(0, -1);
        terminal.write("\b \b");
      }
    } else {
      input += key;
      terminal.write(key);
    }
  });
  window.api.onCommandData((d) => terminal.write(d));

  loadDir(window.api.cwd());
  themeSelect.addEventListener("change", updateSetting);
  fontInput.addEventListener("change", updateSetting);
}

async function loadDir(dir) {
  sidebar.innerHTML = "";
  const entries = await window.api.readDir(dir);
  entries.forEach((e) => {
    const item = document.createElement("div");
    item.textContent = e.name + (e.isDir ? "/" : "");
    item.onclick = () => {
      const full = window.api.pathJoin(dir, e.name);
      if (e.isDir) loadDir(full);
      else loadFile(full);
    };
    sidebar.appendChild(item);
  });
}

async function loadFile(file) {
  const content = await window.api.readFile(file);
  editor.setValue(content);
  editor._file = file;
}

async function saveFile() {
  if (editor._file) {
    await window.api.writeFile(editor._file, editor.getValue());
    output.textContent = "Saved " + editor._file;
  }
}

function applySettings(s) {
  if (editor) {
    monaco.editor.setTheme(s.theme);
    editor.updateOptions({ fontSize: s.fontSize });
  }
  if (terminal) terminal.options.fontSize = s.fontSize;
}

function updateSetting() {
  window.api.setSettings({
    theme: themeSelect.value,
    fontSize: Number(fontInput.value),
  });
}

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    saveFile();
  }
});

init();
