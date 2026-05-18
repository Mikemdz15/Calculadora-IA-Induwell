import { GoogleGenerativeAI } from '@google/generative-ai';

// Replace with user's key for testing
const apiKey = "AIzaSyCzUwDGauwqEV8ohNb7Xlo7uMa29_W8nTM";
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Hola, esto es una prueba.");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Generate Error:", err);
  }
}

run();
