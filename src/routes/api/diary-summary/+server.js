import { json } from '@sveltejs/kit';
import { geminiGenerate } from '$lib/gemini.js';

// Simple schema-free summarizer to produce a concise diary-ready note
export async function POST({ request }) {
  const body = await request.json();
  const { history, date = null } = body || {};

  if (!Array.isArray(history) || history.length === 0) {
    return json({ error: 'history must be a non-empty array' }, { status: 400 });
  }

  try {
    const contents = history
      .filter((msg) => msg?.content && typeof msg.content === 'string')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content.trim() }]
      }));

    const systemPrompt = `Summarize this chat into a brief diary note (3-6 sentences).
- Keep only the most important feelings, events, decisions, and relationship details.
- Use first person ("I").
- Do NOT include advice or next steps, just what was shared or realized.
- If safety concerns appear, state them plainly.
- Keep it simple and readable.`;

    const { text } = await geminiGenerate({
      contents,
      systemPrompt
    });

    return json({
      summary: text || '',
      date: date || new Date().toISOString().split('T')[0]
    });
  } catch (err) {
    console.error('Diary summary error:', err);
    return json({ error: 'Failed to summarize chat' }, { status: 500 });
  }
}
