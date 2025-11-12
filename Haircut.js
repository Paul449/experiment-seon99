// Gemini package
import {GoogleGenAI} from "@google/genai";
//import dotenv to load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();
//creating an instance of GoogleGenAI, providing apiKey and model parameters
const ai = new GoogleGenAI({
    apiKey: process.env.MY_API_KEY,
});
//make first request from API
async function APIRequest() {
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: [
            {
                text: "Write a short poem about the sea.",
            },
        ],
    })
    console.log(response.text);
}
APIRequest();