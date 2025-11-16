import { env } from '$env/dynamic/private';
import { GoogleGenAI } from '@google/genai';

export function hasGemini(overrideKey) {
    return Boolean(overrideKey || env.GEMINI_API_KEY);
}

export async function geminiGenerate({ contents, systemPrompt = '', config = {} }) {
    const key = env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set in environment variables. Please create a .env file with your GEMINI_API_KEY.');

    const ai = new GoogleGenAI({ apiKey: key });
    if (systemPrompt) {
        config.systemInstruction = { role: 'model', parts: [{ text: systemPrompt }] };
    }

    // Use model from env if available, otherwise default to gemini-2.5-flash
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';

    const request = {
        model: model,
        contents: contents,
        config: config
    };

    const response = await ai.models.generateContent(request);
    const text = typeof response?.text === 'string' ? response.text : '';
    return { text, raw: response };
}

