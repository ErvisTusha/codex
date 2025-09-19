const { EventEmitter } = require("node:events");
const { readFile, writeFile } = require("node:fs/promises");
const { watch } = require("chokidar");
const path = require("node:path");

const configPath = path.join(__dirname, "settings.json");
const events = new EventEmitter();
let cache = {};

async function load() {
  try {
    const data = await readFile(configPath, "utf8");
    cache = JSON.parse(data);
  } catch {
    cache = { theme: "light", fontSize: 14 };
    await writeFile(configPath, JSON.stringify(cache, null, 2));
  }
  events.emit("change", cache);
}

async function save(newSettings) {
  cache = { ...cache, ...newSettings };
  await writeFile(configPath, JSON.stringify(cache, null, 2));
  events.emit("change", cache);
}

watch(configPath).on("change", load);
load();

module.exports = {
  onChange: (fn) => events.on("change", fn),
  get: () => cache,
  set: save,
};
