import { env } from '$env/dynamic/private';
import { GoogleGenAI } from '@google/genai';

export function hasGemini(overrideKey) {
    return Boolean(overrideKey || env.GEMINI_API_KEY);
}

export async function geminiGenerate({ contents, systemPrompt = '', config = {} }) {
    const key = env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('GEMINI_API_KEY not set in environment variables. Please create a .env file with your GEMINI_API_KEY.');
    }

    // Validate contents array
    if (!Array.isArray(contents)) {
        throw new Error('contents must be an array');
    }
    
    if (contents.length === 0) {
        throw new Error('contents array cannot be empty');
    }
    
    // Validate each content item
    for (let i = 0; i < contents.length; i++) {
        const item = contents[i];
        if (!item || typeof item !== 'object') {
            throw new Error(`contents[${i}] must be an object`);
        }
        if (item.role !== 'user' && item.role !== 'model') {
            throw new Error(`contents[${i}].role must be 'user' or 'model'`);
        }
        if (!Array.isArray(item.parts) || item.parts.length === 0) {
            throw new Error(`contents[${i}].parts must be a non-empty array`);
        }
        // Validate parts
        for (let j = 0; j < item.parts.length; j++) {
            const part = item.parts[j];
            if (!part || typeof part !== 'object') {
                throw new Error(`contents[${i}].parts[${j}] must be an object`);
            }
            if (!part.text || typeof part.text !== 'string' || part.text.trim().length === 0) {
                throw new Error(`contents[${i}].parts[${j}].text must be a non-empty string`);
            }
        }
    }

    const ai = new GoogleGenAI({ apiKey: key });
    if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim().length > 0) {
        config.systemInstruction = { role: 'model', parts: [{ text: systemPrompt }] };
    }

    // Use model from env if available, otherwise default to gemini-2.5-flash
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';

    const request = {
        model: model,
        contents: contents,
        config: config
    };

    try {
        const response = await ai.models.generateContent(request);
        const text = typeof response?.text === 'string' ? response.text : '';
        return { text, raw: response };
    } catch (err) {
        // Re-throw with more context
        const errorMessage = err?.message || String(err);
        throw new Error(`Gemini API error: ${errorMessage}`);
    }
}

