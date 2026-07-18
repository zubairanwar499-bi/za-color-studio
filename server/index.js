require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const generateRoutes = require("./routes/generate");
const historyRoutes = require("./routes/history");
const favoritesRoutes = require("./routes/favorites");
const libraryRoutes = require("./routes/library");

db.init();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", generateRoutes);
app.use("/api", historyRoutes);
app.use("/api", favoritesRoutes);
app.use("/api", libraryRoutes);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ZA Color Studio running at http://localhost:${PORT}`);
});
