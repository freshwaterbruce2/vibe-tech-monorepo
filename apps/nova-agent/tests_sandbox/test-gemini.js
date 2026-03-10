import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const apiKey = envContent.match(/GOOGLE_API_KEY=(.*)/)?.[1]?.trim();
const model =
	envContent.match(/GEMINI_MODEL=(.*)/)?.[1]?.trim() || "gemini-3-pro-preview";

if (!apiKey) {
	console.error("GOOGLE_API_KEY not found in .env");
	process.exit(1);
}

console.log(`Testing Gemini API with model: ${model}...`);

const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const body = {
	contents: [
		{
			role: "user",
			parts: [{ text: "Say hello in German." }],
		},
	],
	system_instruction: {
		parts: [{ text: "You are a helpful assistant." }],
	},
	generationConfig: {
		temperature: 0.7,
		maxOutputTokens: 100,
	},
};

try {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	const data = await response.json();
	if (response.ok) {
		console.log("SUCCESS!");
		console.log("Response:", data.candidates[0].content.parts[0].text);
	} else {
		console.error("Error:", data);
	}
} catch (error) {
	console.error("Fetch Error:", error);
}
