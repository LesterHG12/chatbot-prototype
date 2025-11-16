// Diary storage using localStorage for client-side persistence
// Could be replaced with backend storage in production

export class DiaryStore {
  constructor() {
    this.storageKey = 'diary_entries';
    this.metadataKey = 'diary_metadata'; // For stars, tags, moods, etc.
  }

  // Get all diary entries
  getAllEntries() {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.error('Error reading diary entries:', err);
      return {};
    }
  }

  // Get entry for a specific date (YYYY-MM-DD format)
  getEntry(date, storageKeyOverride = null) {
    const key = storageKeyOverride || this.storageKey;
    if (typeof window === 'undefined') return '';
    
    try {
      const stored = localStorage.getItem(key);
      const entries = stored ? JSON.parse(stored) : {};
      return entries[date] || '';
    } catch (err) {
      console.error('Error reading diary entry:', err);
      return '';
    }
  }

  // Save entry for a specific date
  saveEntry(date, content, storageKeyOverride = null) {
    if (typeof window === 'undefined') return;
    
    const key = storageKeyOverride || this.storageKey;
    try {
      const stored = localStorage.getItem(key);
      const entries = stored ? JSON.parse(stored) : {};
      entries[date] = content;
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (err) {
      console.error('Error saving diary entry:', err);
    }
  }

  // Delete entry for a specific date
  deleteEntry(date, storageKeyOverride = null) {
    if (typeof window === 'undefined') return;
    
    const key = storageKeyOverride || this.storageKey;
    try {
      const stored = localStorage.getItem(key);
      const entries = stored ? JSON.parse(stored) : {};
      delete entries[date];
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (err) {
      console.error('Error deleting diary entry:', err);
    }
  }

  // Get entries for context (recent entries to provide to agents)
  getRecentEntries(limit = 5) {
    const entries = this.getAllEntries();
    const dates = Object.keys(entries)
      .filter(date => entries[date] && entries[date].trim().length > 0)
      .sort((a, b) => {
        // Sort in descending order (most recent first)
        return new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00');
      })
      .slice(0, limit);
    
    return dates.map(date => ({
      date,
      content: entries[date]
    }));
  }

  // Get entries formatted for agent context
  getContextForAgents(limit = 5) {
    const recentEntries = this.getRecentEntries(limit);
    if (recentEntries.length === 0) return '';

    const contextParts = recentEntries.map(entry => 
      `Date: ${entry.date}\n${entry.content}`
    );

    return `Previous diary entries for context:\n\n${contextParts.join('\n\n---\n\n')}`;
  }

  // Format date as YYYY-MM-DD
  formatDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get metadata for all entries
  getAllMetadata() {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(this.metadataKey);
      return stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.error('Error reading diary metadata:', err);
      return {};
    }
  }

  // Get metadata for a specific date
  getMetadata(date) {
    const allMetadata = this.getAllMetadata();
    return allMetadata[date] || {
      starred: false,
      tags: [],
      mood: null,
      wordCount: 0
    };
  }

  // Save metadata for a specific date
  saveMetadata(date, metadata) {
    if (typeof window === 'undefined') return;
    
    try {
      const allMetadata = this.getAllMetadata();
      allMetadata[date] = { ...this.getMetadata(date), ...metadata };
      localStorage.setItem(this.metadataKey, JSON.stringify(allMetadata));
    } catch (err) {
      console.error('Error saving diary metadata:', err);
    }
  }

  // Toggle star for a date
  toggleStar(date) {
    const metadata = this.getMetadata(date);
    this.saveMetadata(date, { starred: !metadata.starred });
    return !metadata.starred;
  }

  // Get all starred entries
  getStarredEntries() {
    const allMetadata = this.getAllMetadata();
    return Object.keys(allMetadata).filter(date => allMetadata[date].starred);
  }

  // Add tag to entry
  addTag(date, tag) {
    const metadata = this.getMetadata(date);
    if (!metadata.tags.includes(tag)) {
      this.saveMetadata(date, { tags: [...metadata.tags, tag] });
    }
  }

  // Remove tag from entry
  removeTag(date, tag) {
    const metadata = this.getMetadata(date);
    this.saveMetadata(date, { tags: metadata.tags.filter(t => t !== tag) });
  }

  // Set mood for entry
  setMood(date, mood) {
    this.saveMetadata(date, { mood });
  }

  // Calculate word count
  getWordCount(content) {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

