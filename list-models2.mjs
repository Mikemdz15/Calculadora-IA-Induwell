import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = "AIzaSyCzUwDGauwqEV8ohNb7Xlo7uMa29_W8nTM";

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(data.models.map(m => m.name).filter(n => n.includes('gemini')));
  } catch (err) {
    console.error("List Error:", err);
  }
}

listModels();
