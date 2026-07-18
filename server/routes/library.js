const express = require("express");
const { LIBRARY } = require("../library");

const router = express.Router();

router.get("/library", (req, res) => {
  const { q, tag } = req.query;
  let results = LIBRARY;
  if (tag) results = results.filter((p) => p.tags.includes(tag));
  if (q) {
    const needle = q.toLowerCase();
    results = results.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.mood.toLowerCase().includes(needle)
    );
  }
  res.json(results);
});

module.exports = router;
