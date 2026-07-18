const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/favorites", (_req, res) => {
  res.json(db.getFavorites());
});

router.post("/favorites", (req, res) => {
  const palette = req.body;
  if (!palette?.id) return res.status(400).json({ error: "Palette with id required" });
  const favorites = db.getFavorites();
  if (!favorites.find((p) => p.id === palette.id)) {
    favorites.unshift(palette);
    db.setFavorites(favorites);
  }
  res.json({ ok: true });
});

router.delete("/favorites/:id", (req, res) => {
  const favorites = db.getFavorites().filter((p) => p.id !== req.params.id);
  db.setFavorites(favorites);
  res.json({ ok: true });
});

module.exports = router;
