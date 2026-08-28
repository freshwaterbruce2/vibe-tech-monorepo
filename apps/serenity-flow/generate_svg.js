import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  console.log("Generating SVG...");
  const prompt = `You are an expert SVG artist. Please generate a highly detailed SVG for a color-by-number artwork.
The subject should be two elegant swans facing each other, their necks forming a heart shape, swimming in a serene pond with water ripples, and maybe a small bridge or roses in the background.
The output MUST be a valid JSON array of path objects. Each object should have:
- id: a unique string ID
- d: the SVG path data
- number: an integer representing the color number (1 through 9)
- center: { x, y } approximately inside the path for putting the number label.

Make sure the paths completely cover an area like a coloring book. Include at least 20-30 different paths.
Use a viewBox of exactly 0 0 400 400.
Do NOT wrap the output in markdown code blocks. ONLY output the raw JSON array. NOTHING ELSE.
JSON Example:
[
  { "id": "swan1_body", "d": "M...", "number": 1, "center": {"x": 100, "y": 200} },
  ...
]`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
    });
    let {text} = response;
    text = text.replace(/^```json/g, '').replace(/```$/g, '').trim();
    fs.writeFileSync('generated_swans.json', text);
    console.log("Done! Wrote to generated_swans.json");
  } catch (err) {
    console.error(err);
  }
}
run();
