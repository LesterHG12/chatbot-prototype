import { json } from '@sveltejs/kit';
import { geminiGenerate } from '$lib/gemini.js';

const CONTACT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    contacts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          contacted: { type: 'BOOLEAN' }
        },
        required: ['name', 'contacted']
      }
    }
  },
  required: ['contacts']
};

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { text, candidates = [] } = body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return json({ error: 'Text is required' }, { status: 400 });
    }

    const systemPrompt = `Identify whether the writer interacted directly with any people mentioned in the text.

Return an array of { name, contacted }.
Guidelines:
- "contacted" means a clear indication of talking/texting/meeting/reaching out (including "called", "FaceTimed", "hung out", "saw", "messaged", "emailed").
- Mere thoughts or plans ("miss", "want to call", "should text") are NOT contacted.
- Only include human names. Ignore holidays, greetings, and non-person entities.
- Use the provided candidate list to guide name selection, but ignore a candidate if the text doesn't reference them as a person.`;

    const result = await geminiGenerate({
      contents: [{
        role: 'user',
        parts: [
          { text: `Text:\n${text.trim()}\n\nCandidates (if any): ${candidates.join(', ')}` }
        ]
      }],
      systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: CONTACT_SCHEMA
      }
    });

    const parsed = JSON.parse(result.text || '{}');
    const contacts = Array.isArray(parsed.contacts) ? parsed.contacts : [];
    const clean = contacts
      .map((c) => ({
        name: typeof c.name === 'string' ? c.name.trim() : '',
        contacted: !!c.contacted
      }))
      .filter((c) => c.name);

    return json({ contacts: clean });
  } catch (err) {
    console.error('Contact extraction error:', err);
    return json({
      error: 'Failed to extract contact signals',
      details: err?.message
    }, { status: 500 });
  }
}
