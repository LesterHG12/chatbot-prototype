import { json } from '@sveltejs/kit';
import { geminiGenerate } from '$lib/gemini.js';

const MOOD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    mood: { 
      type: 'STRING',
      enum: ['happy', 'calm', 'sad', 'anxious', 'lonely', 'tired', 'frustrated', 'loved', null]
    },
    stressLevel: { type: 'NUMBER' },
    lonelinessLevel: { type: 'NUMBER' },
    homesicknessLevel: { type: 'NUMBER' }
  },
  required: []
};

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { text } = body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return json({ error: 'Text is required' }, { status: 400 });
    }

    const systemPrompt = `Analyze the following diary entry text and extract the user's emotional state. 

Extract:
- mood: One of "happy", "calm", "sad", "anxious", "lonely", "tired", "frustrated", "loved", or null if unclear
- stressLevel: A number 1-10 (1 = very low, 10 = very high)
- lonelinessLevel: A number 1-10 (1 = not lonely, 10 = very lonely)
- homesicknessLevel: A number 1-10 (1 = not homesick, 10 = very homesick)

Look for emotional indicators in the text. Be sensitive to subtle cues, not just explicit statements.`;

    const result = await geminiGenerate({
      contents: [{
        role: 'user',
        parts: [{ text: text.trim() }]
      }],
      systemPrompt,
      config: { 
        responseMimeType: 'application/json', 
        responseSchema: MOOD_SCHEMA 
      }
    });

    const parsed = JSON.parse(result.text || '{}');

    return json({
      mood: parsed.mood || null,
      stressLevel: parsed.stressLevel || 5,
      lonelinessLevel: parsed.lonelinessLevel || 5,
      homesicknessLevel: parsed.homesicknessLevel || 5
    });
  } catch (err) {
    console.error('Mood extraction error:', err);
    return json({ 
      error: 'Failed to extract mood from text',
      details: err?.message 
    }, { status: 500 });
  }
}

