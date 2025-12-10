<script>
  import { journalPrompts, getRandomPrompt } from '../prompts/JournalPrompts.js';
  
  export let onSelectPrompt = null; // Function to call when prompt is selected
  
  let showPrompts = false;
  let selectedCategory = 'daily';
  
  function selectPrompt(prompt) {
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    }
    showPrompts = false;
  }
  
  function getCategoryLabel(category) {
    const labels = {
      daily: 'Daily Check-in',
      reflection: 'Deep Reflection',
      emotional: 'Emotions',
      relationships: 'Relationships',
      challenges: 'Challenges',
      homesickness: 'Homesickness'
    };
    return labels[category] || category;
  }

  function getCategoryDescription(category) {
    const descriptions = {
      daily: 'Quick prompts for daily thoughts and experiences',
      reflection: 'Thoughtful prompts for deeper self-exploration',
      emotional: 'Prompts to explore and understand your feelings',
      relationships: 'Prompts about connections with others',
      challenges: 'Prompts for navigating difficulties and obstacles',
      homesickness: 'Prompts about missing home and adjusting to new places'
    };
    return descriptions[category] || '';
  }
  
  function getCategoryIcon(category) {
    const icons = {
      daily: '📅',
      reflection: '💭',
      emotional: '💙',
      relationships: '🤝',
      challenges: '💪',
      homesickness: '🏠'
    };
    return icons[category] || '✨';
  }
</script>

<div class="prompts-container-diary">
  <button 
    class="prompts-toggle-diary"
    on:click={() => showPrompts = !showPrompts}
    title="Get a journal prompt"
    type="button"
  >
    ✨ Prompt
  </button>
  
  {#if showPrompts}
    <div class="prompts-modal-diary">
      <div class="prompts-header-diary">
        <div class="header-left">
          <span class="header-eyebrow">Prompt focus</span>
          <div class="header-title-row">
            <div class="category-chip compact">
              <span class="chip-icon">{getCategoryIcon(selectedCategory)}</span>
              <span class="chip-label">{getCategoryLabel(selectedCategory)}</span>
            </div>
            <span class="prompt-count">{(journalPrompts[selectedCategory] || []).length} prompts</span>
          </div>
          <p class="header-description">{getCategoryDescription(selectedCategory)}</p>
        </div>
        <button
          class="close-prompts close-prompts-compact"
          on:click={() => showPrompts = false}
          type="button"
          aria-label="Close prompts"
        >
          ×
        </button>
      </div>
      
      <div class="prompts-categories-diary">
        {#each Object.keys(journalPrompts) as category}
          <button
            class="category-btn-diary"
            class:active={selectedCategory === category}
            on:click={() => selectedCategory = category}
            type="button"
          >
            {getCategoryIcon(category)}
          </button>
        {/each}
      </div>
      
      <div class="prompts-list-diary">
        {#each journalPrompts[selectedCategory].slice(0, 5) as prompt}
          <button
            class="prompt-item-diary"
            on:click={() => selectPrompt(prompt)}
            type="button"
          >
            {prompt}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .prompts-container-diary {
    position: relative;
    margin-top: 0.5rem;
    padding: 0 1.5rem;
  }

  .prompts-toggle-diary {
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(139, 115, 85, 0.25);
    border-radius: 16px;
    color: rgba(74, 55, 40, 0.7);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .prompts-toggle-diary:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(139, 115, 85, 0.4);
    color: #4a3728;
  }

  .prompts-modal-diary {
    position: absolute;
    bottom: 100%;
    left: 1.5rem;
    right: 1.5rem;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border: 1px solid rgba(139, 115, 85, 0.25);
    border-radius: 12px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12), 0 1px 0 rgba(255, 255, 255, 0.8) inset;
    z-index: 100;
    max-height: 300px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .prompts-header-diary {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.8rem 1rem;
    border-bottom: 1px solid rgba(139, 115, 85, 0.18);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.95) 0%, rgba(255, 243, 230, 0.9) 100%);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .header-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.65rem;
    font-weight: 700;
    color: rgba(74, 55, 40, 0.7);
  }

  .header-title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .category-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    background: #fffdf8;
    border: 1px solid rgba(139, 115, 85, 0.25);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05), 0 1px 0 rgba(255, 255, 255, 0.75) inset;
    color: #3a2e1e;
    font-weight: 650;
  }

  .category-chip.compact {
    padding: 0.3rem 0.65rem;
  }

  .chip-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .chip-label {
    font-size: 0.9rem;
  }

  .prompt-count {
    font-size: 0.78rem;
    color: rgba(74, 55, 40, 0.75);
    padding: 0.2rem 0.45rem;
    border-radius: 10px;
    background: rgba(139, 115, 85, 0.08);
    border: 1px solid rgba(139, 115, 85, 0.12);
  }

  .header-description {
    margin: 0;
    color: rgba(58, 46, 30, 0.95);
    font-size: 0.85rem;
    line-height: 1.3;
  }

  .close-prompts {
    background: #fff;
    border: 1px solid rgba(139, 115, 85, 0.35);
    font-size: 1rem;
    color: #5b4734;
    cursor: pointer;
    line-height: 1;
    padding: 0.25rem;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.07);
  }

  .close-prompts-compact {
    margin-top: 0.1rem;
  }

  .close-prompts:hover {
    background: rgba(139, 115, 85, 0.12);
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(0, 0, 0, 0.1);
  }

  .prompts-categories-diary {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    overflow-x: auto;
    border-bottom: 1px solid rgba(139, 115, 85, 0.15);
  }

  .category-btn-diary {
    padding: 0.4rem 0.6rem;
    background: rgba(139, 115, 85, 0.1);
    border: 1px solid rgba(139, 115, 85, 0.2);
    border-radius: 12px;
    color: #4a3728;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .category-btn-diary.active {
    background: rgba(139, 115, 85, 0.25);
    border-color: rgba(139, 115, 85, 0.5);
  }

  .prompts-list-diary {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .prompt-item-diary {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(139, 115, 85, 0.2);
    border-radius: 8px;
    color: #4a3728;
    cursor: pointer;
    font-size: 0.85rem;
    line-height: 1.4;
    text-align: left;
    transition: all 0.2s ease;
  }

  .prompt-item-diary:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(139, 115, 85, 0.4);
    transform: translateX(2px);
  }
</style>

