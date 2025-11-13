// ✅ Correct Gemini package
import { GoogleGenAI, createUserContent, createPartFromUri} from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const AI = new GoogleGenAI({ apiKey: process.env.MY_API_KEY });
//
async function GenerateNewHaircut() {
  try {
    console.log("📤 Uploading your photo...");
    
    // Step 1: Upload your photo
    const myPhoto = await AI.files.upload({
      file: "./NormalPhotos/front-side.jpg",
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

    // Step 3: Save the generated image
    let imageCount = 0;
    
    if (response.image) {
      const imageData = response.image.imageBytes;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync(`HaircutImage${imageCount}.png`, buffer);
      console.log(`✅ Image ${imageCount} saved.`);
      imageCount++;
    }

    // Check if there are multiple images in the response
    if (response.candidates && response.candidates[0]) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, "base64");
          fs.writeFileSync(`HaircutImage${imageCount}.png`, buffer);
          console.log(`✅ Image ${imageCount} saved.`);
          imageCount++;
        }
      }
    }

    console.log(`\n🎉 Done! Generated ${imageCount} image(s).`);

    // Step 4: Clean up uploaded file
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