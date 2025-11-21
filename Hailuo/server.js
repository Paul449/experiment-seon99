import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import fetch from "node-fetch";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase payload limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(fileUpload());

// Serve static frontend files
app.use(express.static("public"));
// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Upload endpoint
app.post("/upload", async (req, res) => {
    try {
        console.log('Upload request received');
        
        if (!req.files || !req.files.image) {
            console.log('No file uploaded');
            return res.status(400).json({ error: "No file uploaded." });
        }

        const image = req.files.image;
        console.log('File received:', image.name, image.size, 'bytes');

        // Basic validation
        const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
        const ext = image.name.split('.').pop().toLowerCase();
        
        if (!allowedFormats.includes(ext)) {
            return res.status(400).json({ error: `Invalid format. Allowed: ${allowedFormats.join(', ')}` });
        }
        
        if (image.size > 20 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image too large. Max size: 20MB' });
        }

        // Save to uploads folder
        const uploadPath = `./uploads/${image.name}`;
        await image.mv(uploadPath);
        console.log('File saved to:', uploadPath);

        res.json({ success: true, path: `/uploads/${image.name}` });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(400).json({ error: err.message });
    }
});

// Minimax generate video
// Query video status
app.post("/generate-video", async (req, res) => {
    try {
        const { model, prompt, first_frame_image } = req.body;
        console.log('Generating video with model:', model);
        console.log('Prompt:', prompt);
        console.log('First frame image size:', first_frame_image ?.length);

        const response = await fetch("https://api.minimax.io/v1/video_generation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.My_API_Key}`
            },
            body: JSON.stringify({ model, prompt, first_frame_image })
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        const data = JSON.parse(responseText);
        console.log('Query response:', JSON.stringify(data, null, 2));
        res.json(data);
    } catch (err) {
        console.error('Query error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Query video status
app.post("/query-video", async (req, res) => {
    try {
        const { task_id } = req.body;
        console.log('Querying video status for task:', task_id);

        const response = await fetch(`https://api.minimax.io/v1/query/video_generation?task_id=${task_id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.My_API_Key}`
            },
        });

        const responseText = await response.text();
        console.log('Query raw response:', responseText);
        
        const data = JSON.parse(responseText);
        console.log('Query response:', JSON.stringify(data, null, 2));
        res.json(data);
    } catch (err) {
        console.error('Query error:', err);
        res.status(500).json({ error: "Query error: " + err.message });
    }
});

app.listen(3000, () => console.log("Server running → http://localhost:3000"));
