import { json } from '@sveltejs/kit';
import { geminiGenerate } from '$lib/gemini.js';

export async function POST({ request }) {
  const body = await request.json();
  const { text } = body || {};

  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return json({ events: [] });
  }

  const today = new Date().toISOString().split('T')[0];
  const systemPrompt = `Extract up to 3 upcoming events/reminders from the user's note.
Return JSON array: [{ "date": "YYYY-MM-DD", "summary": "short description" }]
- Prefer events within the next 30 days.
- If a weekday is mentioned (e.g., Tuesday) assume the next occurrence of that weekday.
- If no date is clear, skip.
- If the event is clearly in the past, skip it.
- Keep summaries concise (max 12 words).`;

  try {
    const { text: result } = await geminiGenerate({
      contents: [
        { role: 'user', parts: [{ text: `Today is ${today}. Text:\n${text}` }] }
      ],
      systemPrompt,
      config: { responseMimeType: 'application/json' }
    });

    let parsed = [];
    try {
      parsed = JSON.parse(result || '[]');
    } catch {
      parsed = [];
    }

    if (!Array.isArray(parsed)) parsed = [];
    const events = parsed
      .filter((e) => e?.date && e?.summary)
      .map((e) => ({ date: e.date, summary: e.summary }));

    return json({ events });
  } catch (err) {
    console.error('extract-events error', err);
    return json({ events: [] }, { status: 500 });
  }
}
