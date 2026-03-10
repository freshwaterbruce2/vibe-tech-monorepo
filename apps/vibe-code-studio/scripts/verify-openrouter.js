import { OpenRouterService } from '../src/services/ai/providers/OpenRouterService';
// Simple verification script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function verifyModels() {
    // Load .env manually to get the key
    let apiKey = '';
    try {
        const envPath = path.resolve(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/VITE_OPENROUTER_API_KEY=(.*)/);
            if (match) {
                apiKey = match[1].trim();
                console.log('Loaded API key from .env');
            }
        }
    }
    catch (e) {
        console.warn('Could not load .env', e);
    }
    const service = new OpenRouterService({ apiKey });
    console.log('Initializing OpenRouterService...');
    await service.initialize();
    const modelsToTest = [
        'gpt-5.2-pro',
        'claude-4.5-sonnet',
        'gemini-3-flash',
        'deepseek-r1',
        'grok-4'
    ];
    console.log('Starting verification of new Jan 2026 models...\n');
    for (const modelId of modelsToTest) {
        console.log(`Testing mapping for: ${modelId}`);
        // We can't easily access private resolveModel, so we test via complete() or just modify the class to expose it or trust the map.
        // Better: create a request and see if it fails with "model not found" or works.
        // Or we can just use the public 'chat' or 'generateText' methods.
        // For now, let's just log what we would send.
        // NOTE: To truly verify, we would need to mock fetch or catch the error to see the URL/Body.
        // But since we want "actual API calls", we will try a minimal request.
        try {
            const response = await service.generateText('Say hello', {
                model: modelId,
                maxTokens: 5
            });
            console.log(`[PASS] ${modelId} -> Response: ${response.trim()}`);
        }
        catch (error) {
            console.error(`[FAIL] ${modelId} -> Error: ${error.message}`);
        }
    }
}
verifyModels().catch(console.error);
//# sourceMappingURL=verify-openrouter.js.map