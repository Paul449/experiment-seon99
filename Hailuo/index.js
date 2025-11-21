import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";
import CheckImageRequierements  from "./utils/validateImage.js";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public")); // serves index.html automatically

const MINIMAX_URL = "https://api.minimax.chat/v2/video/generate";

// Upload image + validate + call MiniMax
app.post("/api/generate-video", upload.single("photo"), async (req, res) => {
  try {
    const imagePath = req.file.path;

    // 1. Validate image
    CheckImageRequierements(imagePath);

    // 2. Call MiniMax API
    const payload = {
      model: "hailuo-2.0-video",
      prompt: "Rotate this person 360 degrees.",
      duration: 6,
      resolution: "1080x1920",
      start: "pedestal_up",
      end: "static_shot",
    };

    const response = await fetch(MINIMAX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.My_API_Key}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // cleanup upload
    fs.unlinkSync(imagePath);

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});