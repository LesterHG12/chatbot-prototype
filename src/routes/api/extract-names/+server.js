import { json } from '@sveltejs/kit';
import { geminiGenerate } from '$lib/gemini.js';

const NAME_SCHEMA = {
  type: 'OBJECT',
  properties: {
    names: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    }
  },
  required: ['names']
};

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { text } = body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return json({ error: 'Text is required' }, { status: 400 });
    }

    const systemPrompt = `Extract real-person names from the provided diary snippets.

Rules:
- Return only human first/last names (people the writer mentions).
- Exclude places, organizations, holidays, events, objects, and generic nouns.
- Exclude relatives without names (e.g., "mom", "roommate") unless paired with a name.
- Keep each name title-cased exactly as it appears (e.g., "Alex Kim").
- Output a JSON array of unique names (no duplicates).`;

    const result = await geminiGenerate({
      contents: [{
        role: 'user',
        parts: [{ text: text.trim() }]
      }],
      systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: NAME_SCHEMA
      }
    });

    const parsed = JSON.parse(result.text || '{}');
    const names = Array.isArray(parsed.names) ? parsed.names : [];
    const clean = Array.from(new Set(
      names
        .map((n) => (typeof n === 'string' ? n.trim() : ''))
        .filter(Boolean)
    ));

    return json({ names: clean });
  } catch (err) {
    console.error('Name extraction error:', err);
    return json({
      error: 'Failed to extract names',
      details: err?.message
    }, { status: 500 });
  }
}
