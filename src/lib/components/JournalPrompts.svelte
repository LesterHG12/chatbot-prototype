<script>
  import { journalPrompts, getRandomPrompt } from '../prompts/JournalPrompts.js';
  
  export let onSelectPrompt = null; // Function to call when prompt is selected
  export let selectedCategory = 'daily';
  export let onCategoryChange = null; // Function to call when category changes
  export let showLabels = false; // Whether to show category labels (true for chat, false for diary)
  
  let showPrompts = false;
  let randomPrompt = '';
  let isCollapsed = false;
  
  $: if (showPrompts) {
    randomPrompt = getRandomPrompt();
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
  <div class="prompts-header-bar">
    <div class="prompts-intro">
      <span class="prompts-hint">💡 Click a category or use Random to get started</span>
    </div>
    <button
      class="random-prompt-header-btn"
      on:click={showRandomPrompt}
      title="Get a random writing prompt to help you start"
      type="button"
    >
      <span class="random-icon">✨</span>
      <span class="random-label">Random Prompt</span>
    </button>
    
    <div class="categories-bar" class:collapsed={isCollapsed}>
      {#each Object.keys(journalPrompts) as category}
        <button
          class="category-btn-bar"
          class:active={selectedCategory === category}
          class:with-labels={showLabels}
          on:click={() => {
            selectCategory(category);
            showPrompts = true;
            isCollapsed = false;
          }}
          title={getCategoryLabel(category)}
          type="button"
        >
          <span class="category-icon">{getCategoryIcon(category)}</span>
          {#if showLabels || !isCollapsed}
            <span class="category-label">{getCategoryLabel(category)}</span>
          {/if}
        </button>
      {/each}
    </div>
    
    <button
      class="collapse-toggle"
      on:click={toggleCollapse}
      title={isCollapsed ? 'Show prompts' : 'Hide prompts'}
      type="button"
    >
      {isCollapsed ? '▼' : '▲'}
    </button>
  </div>
  
  {#if showPrompts}
    <div class="prompts-modal">
      <div class="prompts-header">
        <h3>{getCategoryLabel(selectedCategory)}</h3>
        <button class="close-prompts" on:click={() => showPrompts = false} type="button">×</button>
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
  }

  .prompts-header-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
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

  .prompts-intro {
    display: flex;
    align-items: center;
    padding: 0.5rem 0;
    font-size: 0.9rem;
    color: #4a3728;
    opacity: 0.9;
    font-weight: 500;
    flex: 1;
  }

  .prompts-hint {
    white-space: nowrap;
  }

  .categories-bar.collapsed + .collapse-toggle {
    /* When collapsed, make the collapse button more prominent */
  }

  .categories-bar.collapsed ~ .prompts-intro {
    /* Keep hint visible even when collapsed */
    opacity: 1;
  }

  .categories-bar {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(139, 115, 85, 0.3) transparent;
    -webkit-overflow-scrolling: touch;
    flex: 1;
    transition: max-height 0.3s ease, opacity 0.3s ease;
  }

  .categories-bar.collapsed {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    padding: 0;
    margin: 0;
  }

  .prompts-container:has(.categories-bar.collapsed) .prompts-intro {
    /* Make hint more prominent when prompts are collapsed */
    font-weight: 600;
    color: #4a3728;
  }

  .collapse-toggle {
    padding: 0.625rem 0.75rem;
    background: rgba(255, 255, 255, 0.6);
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 20px;
    color: #6b5743;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    flex-shrink: 0;
    min-width: 36px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .collapse-toggle:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(139, 115, 85, 0.5);
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
  }

  .category-btn-bar.with-labels {
    padding: 0.625rem 1rem;
    min-width: auto;
  }

  .category-btn-bar:not(.with-labels):not(:hover) .category-label {
    display: none;
  }

  .category-btn-bar:hover .category-label {
    display: inline;
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
    background: linear-gradient(135deg, rgba(139, 115, 85, 0.2) 0%, rgba(107, 87, 67, 0.2) 100%);
    border-color: rgba(139, 115, 85, 0.6);
    color: #3a2e1e;
    font-weight: 650;
    box-shadow: 0 3px 10px rgba(139, 115, 85, 0.25);
  }

  .category-btn-bar.active:hover {
    background: linear-gradient(135deg, rgba(139, 115, 85, 0.25) 0%, rgba(107, 87, 67, 0.25) 100%);
    border-color: rgba(139, 115, 85, 0.7);
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
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .prompts-header h3 {
    margin: 0;
    color: #4a3728;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .close-prompts {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: #6b5743;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s ease;
  }

  .close-prompts:hover {
    background: rgba(107, 87, 67, 0.1);
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

