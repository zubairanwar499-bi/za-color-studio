// Lightweight file-backed JSON database. No external DB required, so the
// project runs anywhere with zero setup. Swap this for Postgres/Mongo later
// without touching route files — just change the functions below.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILES = {
  history: path.join(DATA_DIR, "history.json"),
  favorites: path.join(DATA_DIR, "favorites.json"),
};

function ensure(file, fallback) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
}

function init() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  ensure(FILES.history, []);
  ensure(FILES.favorites, []);
}

function read(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return [];
  }
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  init,
  getHistory: () => read(FILES.history),
  setHistory: (data) => write(FILES.history, data),
  getFavorites: () => read(FILES.favorites),
  setFavorites: (data) => write(FILES.favorites, data),
};
