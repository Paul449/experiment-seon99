import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { request } from "undici";
import API_Config from "./APIConfig.js";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from 'ffmpeg-static';

dotenv.config();

// Set FFmpeg path from ffmpeg-static
ffmpeg.setFfmpegPath(ffmpegPath);
console.log('Using FFmpeg at:', ffmpegPath);

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
// Serve output videos
app.use('/outputVideos', express.static('outputVideos'));

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

// Generate video with Higgsfield API
app.post("/generate-video", async (req, res) => {
    try {
        const { first_frame_image, end_frame_image } = req.body;
        console.log('Generating video with model:', API_Config.MODEL_URI);

        const { statusCode, body } = await request(`${API_Config.BASE_URL}/${API_Config.MODEL_URI}/image-to-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${API_Config.API_KEY_ID}:${API_Config.API_SECRET_KEY}`
            },
            body: JSON.stringify({
                prompt: API_Config.PROMPT,
                duration: 10,
                image_url: first_frame_image,
                end_image_url: end_frame_image || '',
                resolution: '768P',
                prompt_optimizer: true
            })
        });
        
        const responseData = await body.json();
        console.log('Response status:', statusCode);
        console.log('Response:', JSON.stringify(responseData, null, 2));
        res.json(responseData);
    } catch (err) {
        console.error('Generate video error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Query video status
app.post("/query-video", async (req, res) => {
    try {
        const { request_id } = req.body;
        console.log('Querying video status for request:', request_id);

        const { body } = await request(`${API_Config.BASE_URL}/requests/${request_id}/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Key ${API_Config.API_KEY_ID}:${API_Config.API_SECRET_KEY}`
            }
        });
        
        const statusData = await body.json();
        console.log('Status response:', JSON.stringify(statusData, null, 2));
        res.json(statusData);
    } catch (err) {
        console.error('Query error:', err);
        res.status(500).json({ error: "Query error: " + err.message });
    }
});
// Get video file URL
app.post("/get-video-url", async (req, res) => {
    try {
        const { file_id } = req.body;
        console.log('Getting video URL for file_id:', file_id);

        const response = await fetch(`https://api.minimax.io/v1/files/retrieve?file_id=${file_id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.My_API_Key}`
            }
        });

        const data = await response.json();
        console.log('File retrieve response:', JSON.stringify(data, null, 2));
        res.json(data);
    } catch (err) {
        console.error('Get video URL error:', err);
        res.status(500).json({ error: "Get video URL error: " + err.message });
    }
});

// Download video endpoint
app.get("/download-video", async (req, res) => {
    try {
        const { video_url, request_id } = req.query;
        
        if (!video_url) {
            return res.status(400).json({ error: 'video_url is required' });
        }
        
        console.log('Downloading video from:', video_url);
        
        // Download the video
        const { body } = await request(video_url);
        const videoBuffer = await body.arrayBuffer();
        
        // Create outputVideos directory if it doesn't exist
        const outputDir = './outputVideos';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `video_${request_id || 'unknown'}_${timestamp}.mp4`;
        const filepath = path.join(outputDir, filename);
        
        fs.writeFileSync(filepath, Buffer.from(videoBuffer));
        console.log(`Video saved to: ${filepath}`);
        
        res.json({ success: true, filepath, filename });
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: "Download error: " + err.message });
    }
});

// Merge two videos endpoint
app.post("/merge-videos", async (req, res) => {
    try {
        const { video1, video2 } = req.body;
        
        if (!video1 || !video2) {
            return res.status(400).json({ error: 'Both video filenames are required' });
        }
        
        const video1Path = path.join('./outputVideos', video1);
        const video2Path = path.join('./outputVideos', video2);
        
        // Check if both videos exist
        if (!fs.existsSync(video1Path) || !fs.existsSync(video2Path)) {
            return res.status(404).json({ error: 'One or both video files not found' });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const mergedFilename = `merged_360_${timestamp}.mp4`;
        const mergedPath = path.join('./outputVideos', mergedFilename);
        
        // Create a text file with the list of videos to concatenate
        const fileListPath = path.join('./outputVideos', `filelist_${timestamp}.txt`);
        const fileListContent = `file '${path.basename(video1Path)}'\nfile '${path.basename(video2Path)}'`;
        fs.writeFileSync(fileListPath, fileListContent);
        
        console.log('Merging videos:', video1, '+', video2);
        
        // Use FFmpeg to concatenate videos
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(fileListPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy'])
                .output(mergedPath)
                .on('end', () => {
                    console.log('Videos merged successfully');
                    // Clean up file list
                    fs.unlinkSync(fileListPath);
                    resolve();
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .run();
        });
        
        res.json({ success: true, filename: mergedFilename });
    } catch (err) {
        console.error('Merge error:', err);
        res.status(500).json({ error: "Merge error: " + err.message });
    }
});

app.listen(3000, () => console.log("Server running → http://localhost:3000"));
