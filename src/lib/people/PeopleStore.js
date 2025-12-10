// Lightweight local storage for people you want to stay connected with
// Stores name, type, notes, and a short activity history for chat context

export class PeopleStore {
  constructor() {
    this.storageKey = 'people_profiles';
  }

  getAll() {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error reading people profiles:', err);
      return [];
    }
  }

  saveAll(list) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    } catch (err) {
      console.error('Error saving people profiles:', err);
    }
  }

  findByName(name) {
    if (!name) return null;
    const lower = name.trim().toLowerCase();
    return this.getAll().find((p) => p.name.toLowerCase() === lower) || null;
  }

  upsertPerson(name, data = {}) {
    if (!name || !name.trim()) return;
    const profiles = this.getAll();
    const lower = name.trim().toLowerCase();
    const idx = profiles.findIndex((p) => p.name.toLowerCase() === lower);
    if (idx === -1) {
      profiles.push({
        name: name.trim(),
        type: data.type || 'friend',
        notes: data.notes || '',
        lastMentioned: data.lastMentioned || new Date().toISOString(),
        activities: data.activities || []
      });
    } else {
      profiles[idx] = {
        ...profiles[idx],
        ...data,
        name: profiles[idx].name, // keep original casing
        lastMentioned: data.lastMentioned || profiles[idx].lastMentioned
      };
    }
    this.saveAll(profiles);
  }

  addActivity(name, activity) {
    if (!name || !activity) return;
    const profiles = this.getAll();
    const lower = name.trim().toLowerCase();
    const idx = profiles.findIndex((p) => p.name.toLowerCase() === lower);
    if (idx === -1) {
      profiles.push({
        name: name.trim(),
        type: 'friend',
        notes: '',
        lastMentioned: new Date().toISOString(),
        activities: [activity]
      });
    } else {
      const existingActivities = profiles[idx].activities || [];
      profiles[idx] = {
        ...profiles[idx],
        activities: [{ ...activity, addedAt: new Date().toISOString() }, ...existingActivities].slice(0, 10),
        lastMentioned: activity.date ? activity.date : new Date().toISOString()
      };
    }
    this.saveAll(profiles);
  }

  listNames() {
    return this.getAll().map((p) => p.name);
  }

  getContextForAgents(limit = 5) {
    const profiles = this.getAll().slice(0, limit);
    if (profiles.length === 0) return '';
    const sections = profiles.map((p) => {
      const activityLines = (p.activities || [])
        .slice(0, 3)
        .map((a) => {
          const dateLabel = a.date ? ` on ${a.date}` : '';
          const feelings = a.feelings ? ` (felt: ${a.feelings})` : '';
          return `- ${a.summary || 'Activity'}${dateLabel}${feelings}`;
        })
        .join('\n');
      const notesLine = p.notes ? `Notes: ${p.notes}\n` : '';
      return `Person: ${p.name} (${p.type || 'friend'})\n${notesLine}${activityLines}`;
    });
    return `People to stay connected with (for relational context):\n\n${sections.join('\n\n---\n\n')}`;
  }
}
