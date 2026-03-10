import { createChatCompletion } from './secureClient';

import type { ParsedHomework } from '../types';
import { learningAnalytics } from './learningAnalytics';



export const parseHomeworkFromVoice = async (transcript: string): Promise<ParsedHomework | null> => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const prompt = `Parse the following user transcript to extract homework details. The current date is ${today}.
        - The subject should be a school subject (e.g., "math", "science", "english", "history").
        - The title is the description of the task (e.g., "10 problems", "complete worksheet", "chapter 5 reading").
        - The due date must be converted to YYYY-MM-DD format.
        - Common date formats to handle:
          - "0925 2025" or "09/25/2025" means September 25, 2025 (convert to 2025-09-25)
          - "tomorrow" means one day after today
          - "next friday" means the upcoming Friday
          - Dates in MMDD YYYY format should be parsed as month-day year

        Important: When you see patterns like "it's due on 0925 2025" or "due 0925 2025", interpret 0925 as September 25th (09/25).

        Transcript: "${transcript}"`;

        // Add system message to ensure JSON response
        const systemPrompt = `You must respond ONLY with valid JSON matching this schema:
        {
            "subject": "string - school subject",
            "title": "string - assignment description",
            "dueDate": "string - YYYY-MM-DD format"
        }
        No other text, just the JSON object.`;

        const startTime = Date.now();
        const response = await createChatCompletion([
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: prompt
            }
        ], {
            model: "deepseek-chat",
            temperature: 0.3,
        });

        const duration = Date.now() - startTime;
        if (response) {
            void learningAnalytics.logAICall('deepseek-chat', prompt.length + systemPrompt.length, response.length, duration);
            try {
                // Try to extract JSON from the response
                let jsonStr = response;

                // If response contains extra text, extract JSON
                const jsonMatch = response.match(/\{[^}]*\}/);
                if (jsonMatch) {
                    jsonStr = jsonMatch[0];
                }

                const parsed = JSON.parse(jsonStr);
                return {
                    subject: parsed.subject ?? '',
                    title: parsed.title ?? '',
                    dueDate: parsed.dueDate ?? '',
                };
            } catch (parseError) {
                console.error("Failed to parse homework response:", parseError);
                // Fallback: try to extract info manually
                return null;
            }
        }
        return null;
    } catch (error) {
        console.error("Error parsing homework with DeepSeek:", error);
        return null;
    }
};
