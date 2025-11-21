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
app.post("/generate-video", async (req, res) => {
    try {
        console.log('Video generation request received');
        const payload = req.body;
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch("https://api.minimax.io/v1/video_generation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.My_API_Key}`
            },
            body: JSON.stringify(payload)
        });

        console.log('Minimax API response status:', response.status);
        console.log('Minimax API response headers:', Object.fromEntries(response.headers.entries()));
        
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('Minimax API response data:', JSON.stringify(data, null, 2));
            res.json(data);
        } else {
            // Not JSON, probably HTML error page
            const text = await response.text();
            console.log('Minimax API response (non-JSON):', text.substring(0, 500));
            res.status(response.status).json({ 
                error: `API returned non-JSON response (${response.status})`,
                details: text.substring(0, 500)
            });
        }
    } catch (err) {
        console.error('Minimax error:', err);
        res.status(500).json({ error: "Minimax error: " + err.message });
    }
});

app.listen(3000, () => console.log("Server running → http://localhost:3000"));
