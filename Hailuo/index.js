
import imageSize from "image-size"
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// image requirements
const IMG ={
    format: ["jpeg","png","jpg","webp"],
    size: 20 * 1024 * 1024, //20MB
    Dimensions:{
        ShortSide:300,
        RatioMin:2/5,
        RatioMax:5/2,
    }

}

//setup image requirements
//check if image meets requirements(start & end)
function CheckImageRequierements(imagePath){
   // 1. Check extension
    const ext = imagePath.split('.').pop().toLowerCase();
    if (!IMG.format.includes(ext)) {
        throw new Error(`Invalid image format. Expected: ${IMG.format.join(', ')}`);
    }

    // 2. Check file size
    const stats = fs.statSync(imagePath);
    if (stats.size > IMG.size) {
        throw new Error(`Image too large. Max size is ${IMG.size / (1024*1024)}MB`);
    }

    // 3. Read dimensions
    const buffer = fs.readFileSync(imagePath);
    const { width, height } = imageSize(buffer);
    if (!width || !height) {
        throw new Error("Could not read image dimensions.");
    }

    // 4. Short side check
    const shortSide = Math.min(width, height);
    if (shortSide < IMG.Dimensions.ShortSide) {
        console.log(`Width: ${width}, Height: ${height}`);
        throw new Error(`Short side too small. Minimum is ${IMG.Dimensions.ShortSide}px`);
    }

    // 5. Aspect ratio check
    const ratio = width / height;
    if (ratio < IMG.Dimensions.RatioMin || ratio > IMG.Dimensions.RatioMax) {
        throw new Error(
            `Invalid ratio. Expected between ${IMG.Dimensions.RatioMin} and ${IMG.Dimensions.RatioMax}`
        );
    }

    return true;
    
}
CheckImageRequierements(path.join(__dirname, 'HaircutImage0.png'));
//fetch function
//Minimax Hailuo API url
const url = "https://api.minimax.io/v1/video_generation";
//options
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.My_API_Key}`
    },
    body: JSON.stringify({
        model: "video-01",
        prompt: "A man picks up a book [Pedestal up], then reads [Static shot].",
        duration: 6,
        resolution: "1080P",
        start: "pedestal_up",
        end: "static_shot"
    })
}
//fetch API data for video generation
async function fetchHailuoData() {
    try{
    const response = await fetch(url, options);
    const data = await response.json();
    console.log(data);
    } catch (error) {
        console.error("Error fetching Hailuo data:", error);
        throw error;
    }
}
fetchHailuoData();