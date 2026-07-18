const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/history", (_req, res) => {
  res.json(db.getHistory());
});

router.delete("/history/:id", (req, res) => {
  const history = db.getHistory().filter((p) => p.id !== req.params.id);
  db.setHistory(history);
  res.json({ ok: true });
});

router.delete("/history", (_req, res) => {
  db.setHistory([]);
  res.json({ ok: true });
});

module.exports = router;
