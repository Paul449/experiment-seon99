// ✅ Correct Gemini package
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const AI = new GoogleGenAI({ apiKey: process.env.MY_API_KEY });
async function GenerateNewHaircut() {
  try {
    const response = await AI.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: 'a realistic photo of me with a clean razor fade haircut, natural lighting, casual look, same outfit and background,  subtle enhancement, looks like a real photo not edited, natural hair texture, realistic shadows and details. Do not modify my face.',
    config: {
      numberOfImages: 4,
    },
  });
    let index = 0;
    for (const generated of response.generatedImages) {
      const imgBase64 = generated.image.imageBytes;
      const buffer = Buffer.from(imgBase64, "base64");
      fs.writeFileSync(`HaircutImage${index}.png`, buffer);
      console.log(`✅ Image ${index} saved.`);
      index++;
    }
  } catch (error) {
    console.error("❌ Error generating haircut image:", error);
  }
}

GenerateNewHaircut();
