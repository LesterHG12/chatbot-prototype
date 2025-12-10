// Local-only store for upcoming events/reminders inferred from chat
// Events: { id, date: 'YYYY-MM-DD', summary, source, createdAt }

export class EventStore {
  constructor() {
    this.key = 'event_reminders';
  }

  getAll() {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(this.key);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error reading events:', err);
      return [];
    }
  }

  saveAll(events) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.key, JSON.stringify(events));
    } catch (err) {
      console.error('Error saving events:', err);
    }
  }

  purgePast() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = this.getAll().filter((e) => new Date(e.date + 'T00:00:00') >= today);
    this.saveAll(filtered);
    return filtered;
  }

  addEvents(events = []) {
    if (!Array.isArray(events) || events.length === 0) return;
    const existing = this.purgePast();
    const byKey = new Set(existing.map((e) => `${e.date}-${e.summary}`.toLowerCase()));
    const newOnes = [];
    events.forEach((ev) => {
      if (!ev?.date || !ev?.summary) return;
      const key = `${ev.date}-${ev.summary}`.toLowerCase();
      if (byKey.has(key)) return;
      newOnes.push({
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: ev.date,
        summary: ev.summary.trim(),
        source: ev.source || 'chat',
        createdAt: new Date().toISOString()
      });
      byKey.add(key);
    });
    if (newOnes.length) {
      this.saveAll([...existing, ...newOnes]);
    }
  }

  getTodayContext() {
    const todayStr = new Date().toISOString().split('T')[0];
    const events = this.purgePast().filter((e) => e.date === todayStr);
    if (events.length === 0) return '';
    const lines = events.map((e) => `- ${e.summary} (today)`);
    return `Today's important items:\n${lines.join('\n')}`;
  }
}
