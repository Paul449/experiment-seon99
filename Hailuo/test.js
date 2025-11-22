import { request } from 'undici'
import fs from 'fs';
import path from 'path';

import API_Config from './APIConfig.js';


async function generateVideo(){
    console.log('Generating video with model:'+API_Config.MODEL_URI);

    // Read images from inputImages folder
    const image1Path = path.join('./inputImages', 'front1.jpg');
    const image2Path = path.join('./inputImages', 'gerSide.jpg');
    
    // Convert first image to base64
    const startImageBuffer = fs.readFileSync(image1Path);
    const base64StartImage = `data:image/jpeg;base64,${startImageBuffer.toString('base64')}`;
    
    // Convert second image to base64 (optional - for end_image_url)
    const endImageBuffer = fs.readFileSync(image2Path);
    const base64EndImage = `data:image/jpeg;base64,${endImageBuffer.toString('base64')}`;

    const { statusCode, body } = await request(`${API_Config.BASE_URL}/${API_Config.MODEL_URI}/image-to-video`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${API_Config.API_KEY_ID}:${API_Config.API_SECRET_KEY}`
    },
    body: JSON.stringify({
            prompt: API_Config.PROMPT,
            duration: 10,
            image_url: base64StartImage,
            end_image_url: base64EndImage,
            prompt_optimizer: true
        })
    })
    
    console.log('Response status:', statusCode);
    const responseData = await body.json();
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    // If video was generated successfully, save it
    if (statusCode.toString().startsWith('2') && responseData.status) {
        console.log('Video generation started....');
        // Poll for video completion
        await pollVideoCompletion(responseData.request_id);
    }
}

async function pollVideoCompletion(requestId) {
    const maxAttempts = 60;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`Checking video status... (${attempts}/${maxAttempts})`);
        
        const { body } = await request(`${API_Config.BASE_URL}/requests/${requestId}/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Key ${API_Config.API_KEY_ID}:${API_Config.API_SECRET_KEY}`
            }
        });
        
        const statusData = await body.json();
        console.log('Status:', statusData);
        
        if (statusData.status === 'completed' && statusData.video?.url) {
            console.log('Video ready! Downloading...');
            await downloadVideo(statusData.video.url, requestId);
            return;
        } else if (statusData.status === 'failed') {
            console.error('Video generation failed');
            return;
        }
        
        // Wait 30 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('Timeout waiting for video generation');
}

async function downloadVideo(videoUrl, requestId) {
    try {
        // Create outputVideos directory if it doesn't exist
        const outputDir = './outputVideos';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Download the video
        const { body } = await request(videoUrl);
        const videoBuffer = await body.arrayBuffer();
        
        // Save with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `video_${requestId}_${timestamp}.mp4`;
        const filepath = path.join(outputDir, filename);
        
        fs.writeFileSync(filepath, Buffer.from(videoBuffer));
        console.log(`Video saved to: ${filepath}`);
    } catch (error) {
        console.error('Error downloading video:', error);
    }
}

generateVideo();