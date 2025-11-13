// ✅ Correct Gemini package
import { GoogleGenAI, createUserContent, createPartFromUri} from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
// declaring templatev
const AI = new GoogleGenAI({ apiKey: process.env.MY_API_KEY });
//
async function GenerateNewHaircut() {
  try {
    console.log("📤 Uploading your photo...");
    
    // Step 1: Upload your photo
    const myPhoto = await AI.files.upload({
      file: "./NormalPhotos/left-side.jpg",
      config: { mimeType: "image/jpeg" },
    });

    console.log(`✅ Upload complete: ${myPhoto.name}`);
    console.log(`📁 File URI: ${myPhoto.uri}`);

    console.log("🎨 Generating haircut image...");

    // Step 2: Generate edited image with Gemini 2.5 Flash Image
    const response = await AI.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: createUserContent([
        createPartFromUri(myPhoto.uri, myPhoto.mimeType),
        `Edit this photo: Give this person a clean razor fade haircut.
         Keep the face, expression, pose, lighting, and background completely identical.
         Only change the hairstyle to a professional razor fade - short on the sides,
         slightly longer on top, clean and natural looking. Make it look realistic.`
      ]),
      config: {
        responseModalities: ["IMAGE"],
      }
    });

//step 3: check if response exists
    if (!response) {
      console.log("Response is null or undefined.");
      return;
    }

    // Step 3: Save the generated image
    let imageCount = 0;
    
    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync(`HaircutImage${imageCount}.png`, buffer);
          console.log(`✅ Image ${imageCount} saved.`);
          imageCount++;
        }
      }
    } else if (response.image && response.image.imageBytes) {
      // Fallback to direct image property
      const imageData = response.image.imageBytes;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync(`HaircutImage${imageCount}.png`, buffer);
      console.log(`✅ Image ${imageCount} saved.`);
      imageCount++;
    } else {
      console.log("⚠️ No image data found in response");
      console.log("Response structure:", response ? Object.keys(response) : "No response");
    }

    console.log(`\n🎉 Done! Generated ${imageCount} image(s).`);

    // Step 4: Clean up uploaded file from google servers
    await AI.files.delete(myPhoto.name);
    console.log("🗑️  Temporary file deleted.");

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Full error:", error.response);
    }
  }
}

GenerateNewHaircut();