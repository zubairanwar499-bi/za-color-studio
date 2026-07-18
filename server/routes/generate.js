const express = require("express");
const { nanoid } = require("nanoid");
const { generatePalettes, providerStatus } = require("../providers");
const db = require("../db");

const router = express.Router();

router.post("/generate", async (req, res) => {
  const prompt = (req.body?.prompt || "").toString().slice(0, 300);
  try {
    const { palettes, providerUsed } = await generatePalettes(prompt || "modern professional SaaS dashboard");
    const stamped = palettes.map((p) => ({ ...p, id: nanoid(8), prompt, createdAt: Date.now() }));

    const history = db.getHistory();
    history.unshift(stamped[0]);
    db.setHistory(history.slice(0, 100));

    res.json({ palettes: stamped, providerUsed });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "Generation failed. All providers, including the local fallback, errored — this shouldn't normally happen." });
  }
});

router.get("/status", (_req, res) => {
  res.json(providerStatus());
});

module.exports = router;
