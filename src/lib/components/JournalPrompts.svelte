<script>
  import { createEventDispatcher } from 'svelte';
  import { journalPrompts, getRandomPrompt } from '../prompts/JournalPrompts.js';
  
  export let onSelectPrompt = null; // Function to call when prompt is selected
  export let selectedCategory = 'daily';
  export let onCategoryChange = null; // Function to call when category changes
  export let showLabels = false; // Whether to show category labels (true for chat, false for diary)
  export let showRandomButton = true; // Whether to show the random button (false for diary mode, true for chat)
  export let suggestedCategory = null; // Optional suggested category id (string)
  
  const dispatch = createEventDispatcher();

  let showPrompts = false;
  let randomPrompt = '';
  let isCollapsed = false;
  
  $: if (showPrompts) {
    randomPrompt = getRandomPrompt();
  }

  $: if (suggestedCategory && !showPrompts && !isCollapsed) {
    selectedCategory = suggestedCategory;
  }
  
  function selectPrompt(prompt) {
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    }
    showPrompts = false;
    isCollapsed = true; // Collapse after selection to save space
  }
  
  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (!isCollapsed) {
      showPrompts = false;
    } else {
      dispatch('collapse');
    }
  }
  
  function showRandomPrompt() {
    randomPrompt = getRandomPrompt();
    if (onSelectPrompt) {
      onSelectPrompt(randomPrompt);
    }
    showPrompts = false;
    isCollapsed = true;
  }
  
  function selectCategory(category) {
    selectedCategory = category;
    if (onCategoryChange) {
      onCategoryChange(category);
    }
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

<div class="prompts-container">
  <div class="prompts-header-bar" class:collapsed={isCollapsed}>
    <div class="prompt-actions" class:collapsed={isCollapsed}>
      {#if !isCollapsed}
        <span class="prompt-label">Prompts</span>
      {/if}
      <div class="prompt-scroll">
        {#if showRandomButton && !isCollapsed}
          <button
            class="random-prompt-header-btn"
            on:click={showRandomPrompt}
            title="Get a random writing prompt to help you start"
            type="button"
          >
            <span class="random-icon">✨</span>
            <span class="random-label">Random</span>
          </button>
        {/if}
        
        <div class="categories-bar">
          {#each Object.keys(journalPrompts) as category}
            <button
              class="category-btn-bar"
              class:active={selectedCategory === category}
              class:suggested={suggestedCategory === category}
              class:with-labels={showLabels}
              on:click={() => {
                selectCategory(category);
                showPrompts = true;
                isCollapsed = false;
              }}
              type="button"
              title={getCategoryLabel(category)}
            >
              <span class="category-icon">{getCategoryIcon(category)}</span>
              {#if showLabels || !isCollapsed}
                <span class="category-label">{getCategoryLabel(category)}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <button
      class="collapse-toggle"
      on:click={toggleCollapse}
      title={isCollapsed ? 'Show prompts' : 'Hide prompts'}
      type="button"
    >
      {isCollapsed ? '▲' : '▼'}
    </button>
  </div>
  
  {#if showPrompts}
    <div class="prompts-modal">
      <div class="prompts-header">
        <div class="header-left">
          <span class="header-eyebrow">Prompt focus</span>
          <div class="header-title-row">
            <div class="category-chip">
              <span class="chip-icon">{getCategoryIcon(selectedCategory)}</span>
              <span class="chip-label">{getCategoryLabel(selectedCategory)}</span>
            </div>
            <span class="prompt-count">{(journalPrompts[selectedCategory] || []).length} prompts</span>
          </div>
          <p class="header-description">{getCategoryDescription(selectedCategory)}</p>
        </div>
        <button
          class="close-prompts"
          on:click={() => showPrompts = false}
          type="button"
          aria-label="Close prompts"
        >
          ×
        </button>
      </div>
      
      {#if randomPrompt}
        <div class="random-prompt-section">
          <div class="random-prompt-header">
            <span class="sparkle">✨</span>
            <span>Random Prompt</span>
          </div>
          <button 
            class="random-prompt-btn"
            on:click={() => selectPrompt(randomPrompt)}
            type="button"
          >
            {randomPrompt}
          </button>
        </div>
      {/if}
      
      <div class="prompts-list">
        {#each journalPrompts[selectedCategory] as prompt}
          <button
            class="prompt-item"
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
  .prompts-container {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    overflow: visible;
    --prompt-accent: #4aa06e;
    --prompt-accent-strong: #3b8b5e;
    --prompt-accent-bg: rgba(74, 160, 110, 0.22);
    --prompt-accent-bg-strong: rgba(74, 160, 110, 0.3);
    --prompt-suggest: #3a7bd5;
    --prompt-suggest-bg: rgba(58, 123, 213, 0.18);
  }

  .prompts-header-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    width: 100%;
  }

  .prompts-header-bar.collapsed {
    justify-content: flex-end;
  }

  .prompt-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
    min-width: 0;
    overflow: visible;
    padding-bottom: 0.1rem;
    flex: 1;
  }

  .prompt-actions.collapsed {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    padding: 0;
    margin: 0;
  }

  .prompt-scroll {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow-x: auto;
    overflow-y: visible;
    padding-bottom: 0.25rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(139, 115, 85, 0.3) transparent;
    -webkit-overflow-scrolling: touch;
  }

  .prompt-scroll::-webkit-scrollbar {
    height: 4px;
  }

  .prompt-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .prompt-scroll::-webkit-scrollbar-thumb {
    background: rgba(139, 115, 85, 0.3);
    border-radius: 2px;
  }

  .prompt-label {
    font-size: 0.82rem;
    font-weight: 650;
    color: rgba(74, 55, 40, 0.75);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .suggested-chip {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--prompt-suggest);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    background: var(--prompt-suggest-bg);
    border: 1px solid var(--prompt-suggest);
    border-radius: 10px;
    padding: 0.25rem 0.5rem;
  }

  .random-prompt-header-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 223, 0, 0.15) 100%);
    border: 2px solid rgba(255, 193, 7, 0.4);
    border-radius: 20px;
    color: #4a3728;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.25s ease;
    white-space: nowrap;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(255, 193, 7, 0.15);
  }

  .random-prompt-header-btn:hover {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 223, 0, 0.25) 100%);
    border-color: rgba(255, 193, 7, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 193, 7, 0.25);
  }

  .random-icon {
    font-size: 1.2rem;
  }

  .random-label {
    font-weight: 600;
  }


  .categories-bar {
    display: flex;
    gap: 0.5rem;
    position: relative;
  }

  .collapse-toggle {
    padding: 0.35rem;
    background: rgba(255, 255, 255, 0.75);
    border: 1px solid rgba(139, 115, 85, 0.25);
    border-radius: 12px;
    color: #6b5743;
    cursor: pointer;
    font-size: 0.82rem;
    transition: all 0.2s ease;
    flex-shrink: 0;
    min-width: 30px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .collapse-toggle:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(139, 115, 85, 0.45);
    transform: translateY(-1px);
  }

  .categories-bar::-webkit-scrollbar {
    height: 4px;
  }

  .categories-bar::-webkit-scrollbar-track {
    background: transparent;
  }

  .categories-bar::-webkit-scrollbar-thumb {
    background: rgba(139, 115, 85, 0.3);
    border-radius: 2px;
  }

  .category-btn-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 250, 245, 0.9) 100%);
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 20px;
    color: #4a3728;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 550;
    transition: all 0.25s ease;
    white-space: nowrap;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
    min-width: 44px;
    height: 44px;
    z-index: 1;
  }

  .category-btn-bar:hover {
    z-index: 1001;
  }

  .category-btn-bar.with-labels {
    padding: 0.625rem 1rem;
    min-width: auto;
  }

  .category-btn-bar:not(.with-labels) .category-label {
    display: none;
  }

  .category-btn-bar::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    transition: left 0.5s ease;
    pointer-events: none;
  }

  .category-btn-bar:hover::before {
    left: 100%;
  }

  .category-btn-bar:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 250, 245, 1) 100%);
    border-color: rgba(139, 115, 85, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 115, 85, 0.2);
  }

  .category-btn-bar:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .category-btn-bar.active {
    background: linear-gradient(135deg, var(--prompt-accent-bg) 0%, var(--prompt-accent-bg) 100%);
    border-color: rgba(74, 160, 110, 0.85);
    color: var(--prompt-accent-strong);
    font-weight: 700;
    box-shadow: 0 3px 12px rgba(74, 160, 110, 0.32);
  }

  .category-btn-bar.active:hover {
    background: linear-gradient(135deg, var(--prompt-accent-bg-strong) 0%, var(--prompt-accent-bg-strong) 100%);
    border-color: rgba(74, 160, 110, 1);
  }

  .category-btn-bar.suggested:not(.active) {
    background: linear-gradient(135deg, var(--prompt-suggest-bg) 0%, var(--prompt-suggest-bg) 100%);
    border-color: rgba(58, 123, 213, 0.55);
    color: #1f4f94;
    box-shadow: 0 2px 10px rgba(58, 123, 213, 0.2);
  }

  .category-btn-bar.suggested:not(.active):hover {
    border-color: rgba(58, 123, 213, 0.75);
  }

  .category-icon {
    font-size: 1.4rem;
    line-height: 1;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
    flex-shrink: 0;
  }

  .category-label {
    font-size: 0.9rem;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .prompts-modal {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #fdfbf7 0%, #fff7ec 100%);
    border: 1px solid rgba(139, 115, 85, 0.25);
    border-radius: 16px;
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.12), 0 1px 0 rgba(255, 255, 255, 0.8) inset;
    z-index: 1000;
    max-width: 400px;
    min-width: 300px;
    width: 100%;
    max-height: 50vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  @media (max-width: 640px) {
    .prompts-modal {
      left: 0;
      right: auto;
      max-width: calc(100vw - 2rem);
      min-width: auto;
    }
  }
  
  .prompts-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(139, 115, 85, 0.18);
    background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.6), transparent 55%), linear-gradient(135deg, rgba(255, 248, 240, 0.95) 0%, rgba(255, 243, 230, 0.9) 100%);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .header-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.7rem;
    font-weight: 700;
    color: rgba(74, 55, 40, 0.7);
  }

  .header-title-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .category-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    background: #fffdf8;
    border: 1px solid rgba(139, 115, 85, 0.25);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05), 0 1px 0 rgba(255, 255, 255, 0.7) inset;
    color: #3a2e1e;
    font-weight: 650;
    letter-spacing: 0.01em;
  }

  .chip-icon {
    font-size: 1.1rem;
    line-height: 1;
  }

  .chip-label {
    font-size: 0.95rem;
  }

  .prompt-count {
    font-size: 0.82rem;
    color: rgba(74, 55, 40, 0.7);
    padding: 0.25rem 0.5rem;
    border-radius: 10px;
    background: rgba(139, 115, 85, 0.08);
    border: 1px solid rgba(139, 115, 85, 0.15);
  }

  .header-description {
    margin: 0;
    color: rgba(58, 46, 30, 0.95);
    font-size: 0.9rem;
    line-height: 1.35;
    max-width: 28rem;
  }

  .close-prompts {
    background: #fff;
    border: 1px solid rgba(139, 115, 85, 0.35);
    font-size: 1.15rem;
    color: #5b4734;
    cursor: pointer;
    line-height: 1;
    padding: 0.3rem;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.07);
  }

  .close-prompts:hover {
    background: rgba(139, 115, 85, 0.12);
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(0, 0, 0, 0.1);
  }

  .random-prompt-section {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(139, 115, 85, 0.15);
    background: rgba(255, 245, 230, 0.5);
  }

  .random-prompt-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #6b5743;
  }

  .sparkle {
    font-size: 1rem;
  }

  .random-prompt-btn {
    width: 100%;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.9);
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 10px;
    color: #4a3728;
    cursor: pointer;
    font-size: 0.85rem;
    line-height: 1.4;
    text-align: left;
    transition: all 0.2s ease;
    font-style: italic;
  }

  .random-prompt-btn:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(139, 115, 85, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .prompts-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .prompt-item {
    padding: 0.625rem 0.75rem;
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

  .prompt-item:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(139, 115, 85, 0.4);
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
</style>
