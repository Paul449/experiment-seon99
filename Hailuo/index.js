import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import fetch from "node-fetch";
import  CheckImageRequirements  from "./utils/validateImage.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Serve static frontend files
app.use(express.static("public"));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Upload endpoint
app.post("/upload", async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        const image = req.files.image;

        // Validate image
        CheckImageRequirements(image);

        // Save to uploads folder
        image.mv(`./uploads/${image.name}`);

        res.json({ success: true, path: `/uploads/${image.name}` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Minimax generate video
app.post("/generate-video", async (req, res) => {
    try {
        const payload = req.body;

        const response = await fetch("https://api.minimax.chat/v2/video/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.My_API_Key}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Minimax error." });
    }
});

app.listen(3000, () => console.log("Server running → http://localhost:3000"));
