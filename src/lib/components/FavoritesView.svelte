<script>
  import { onMount } from 'svelte';
  import { DiaryStore } from '../diary/DiaryStore.js';

  const diaryStore = new DiaryStore();
  let starredEntries = [];
  let selectedEntry = null;
  let selectedEntryContent = '';

  function formatDateDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - entryDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  }

  function loadStarredEntries() {
    const starredDates = diaryStore.getStarredEntries();
    starredEntries = starredDates.map(date => {
      const content = diaryStore.getEntry(date);
      const metadata = diaryStore.getMetadata(date);
      return {
        date,
        content,
        metadata,
        display: formatDateDisplay(date)
      };
    }).sort((a, b) => {
      // Sort in descending order (most recent first)
      return new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00');
    });
  }

  function viewEntry(entry) {
    selectedEntry = entry;
    selectedEntryContent = entry.content;
  }

  function closeEntry() {
    selectedEntry = null;
    selectedEntryContent = '';
  }

  function toggleStar(date) {
    diaryStore.toggleStar(date);
    loadStarredEntries();
    if (selectedEntry && selectedEntry.date === date) {
      selectedEntry.metadata.starred = !selectedEntry.metadata.starred;
    }
  }

  function getMoodEmoji(mood) {
    const moodMap = {
      'happy': '😊',
      'calm': '😌',
      'sad': '😢',
      'anxious': '😰',
      'lonely': '😔',
      'tired': '😴',
      'frustrated': '😤',
      'loved': '🥰'
    };
    return moodMap[mood] || '';
  }

  export function refresh() {
    loadStarredEntries();
  }

  onMount(() => {
    loadStarredEntries();
  });
</script>

<div class="favorites-view">
  <div class="favorites-header">
    <h2>⭐ Starred Entries</h2>
    <p class="favorites-subtitle">{starredEntries.length} {starredEntries.length === 1 ? 'entry' : 'entries'} saved</p>
  </div>

  {#if starredEntries.length === 0}
    <div class="empty-state">
      <div class="empty-icon">⭐</div>
      <h3>No starred entries yet</h3>
      <p>Star entries you want to remember by clicking the star icon on any diary entry.</p>
    </div>
  {:else}
    <div class="entries-grid">
      {#each starredEntries as entry}
        <div 
          class="entry-card"
          on:click={() => viewEntry(entry)}
          role="button"
          tabindex="0"
        >
          <div class="entry-card-header">
            <div class="entry-date">{entry.display}</div>
            <button 
              class="star-btn active"
              on:click|stopPropagation={() => toggleStar(entry.date)}
              title="Unstar entry"
              type="button"
            >
              ⭐
            </button>
          </div>
          {#if entry.metadata.mood}
            <div class="entry-meta">
              <span class="mood-indicator">{getMoodEmoji(entry.metadata.mood)}</span>
              {#if entry.metadata.wordCount > 0}
                <span class="word-count">{entry.metadata.wordCount} words</span>
              {/if}
            </div>
          {/if}
          {#if entry.metadata.tags && entry.metadata.tags.length > 0}
            <div class="entry-tags">
              {#each entry.metadata.tags.slice(0, 3) as tag}
                <span class="tag-small">{tag}</span>
              {/each}
              {#if entry.metadata.tags.length > 3}
                <span class="tag-small">+{entry.metadata.tags.length - 3}</span>
              {/if}
            </div>
          {/if}
          <div class="entry-preview">{entry.content.substring(0, 150)}{entry.content.length > 150 ? '...' : ''}</div>
        </div>
      {/each}
    </div>
  {/if}

  {#if selectedEntry}
    <div class="entry-modal">
      <div class="entry-modal-content">
        <div class="entry-modal-header">
          <div>
            <h3>{selectedEntry.display}</h3>
            {#if selectedEntry.metadata.mood || selectedEntry.metadata.wordCount > 0}
              <div class="entry-meta">
                {#if selectedEntry.metadata.mood}
                  <span class="mood-indicator">{getMoodEmoji(selectedEntry.metadata.mood)}</span>
                {/if}
                {#if selectedEntry.metadata.wordCount > 0}
                  <span class="word-count">{selectedEntry.metadata.wordCount} words</span>
                {/if}
              </div>
            {/if}
          </div>
          <button class="close-modal" on:click={closeEntry} type="button">×</button>
        </div>
        {#if selectedEntry.metadata.tags && selectedEntry.metadata.tags.length > 0}
          <div class="entry-tags-full">
            {#each selectedEntry.metadata.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        {/if}
        <div class="entry-content">
          {selectedEntryContent}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .favorites-view {
    width: 100%;
    height: 100%;
    padding: 2rem;
    overflow-y: auto;
  }

  .favorites-header {
    margin-bottom: 2rem;
  }

  .favorites-header h2 {
    color: #4a3728;
    font-size: 2rem;
    font-weight: 650;
    margin: 0 0 0.5rem 0;
  }

  .favorites-subtitle {
    color: #6b5743;
    font-size: 1rem;
    margin: 0;
    font-style: italic;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #6b5743;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    color: #4a3728;
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    font-size: 1rem;
    line-height: 1.6;
    max-width: 500px;
    margin: 0 auto;
  }

  .entries-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .entry-card {
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border: 2px solid rgba(139, 115, 85, 0.2);
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .entry-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    border-color: rgba(139, 115, 85, 0.4);
  }

  .entry-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .entry-date {
    font-weight: 650;
    font-size: 1.1rem;
    color: #8b7355;
  }

  .entry-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.5rem 0;
    font-size: 0.85rem;
    color: #6b5743;
  }

  .mood-indicator {
    font-size: 1.1rem;
  }

  .word-count {
    opacity: 0.8;
    font-style: italic;
  }

  .entry-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .tag-small {
    padding: 0.25rem 0.6rem;
    background: rgba(139, 115, 85, 0.15);
    border: 1px solid rgba(139, 115, 85, 0.3);
    border-radius: 15px;
    font-size: 0.75rem;
    color: #4a3728;
    font-weight: 500;
  }

  .entry-preview {
    color: #4a3728;
    line-height: 1.6;
    font-size: 0.95rem;
    white-space: pre-wrap;
  }

  .entry-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 2rem;
  }

  .entry-modal-content {
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border-radius: 16px;
    border: 2px solid rgba(139, 115, 85, 0.3);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .entry-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 2rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .entry-modal-header h3 {
    margin: 0 0 0.5rem 0;
    color: #4a3728;
    font-size: 1.5rem;
    font-weight: 650;
  }

  .close-modal {
    background: transparent;
    border: none;
    font-size: 2rem;
    color: #6b5743;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    transition: background 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-modal:hover {
    background: rgba(107, 87, 67, 0.1);
  }

  .entry-tags-full {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem 2rem;
    border-bottom: 1px solid rgba(139, 115, 85, 0.1);
  }

  .entry-tags-full .tag {
    padding: 0.4rem 0.8rem;
    background: rgba(139, 115, 85, 0.15);
    border: 1px solid rgba(139, 115, 85, 0.3);
    border-radius: 20px;
    font-size: 0.85rem;
    color: #4a3728;
    font-weight: 500;
  }

  .entry-content {
    padding: 2rem;
    color: #4a3728;
    line-height: 1.8;
    font-size: 1rem;
    white-space: pre-wrap;
    overflow-y: auto;
    flex: 1;
  }

  .star-btn {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    transition: all 0.2s ease;
  }

  .star-btn:hover {
    transform: scale(1.2);
  }

  .star-btn.active {
    filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.5));
  }
</style>

