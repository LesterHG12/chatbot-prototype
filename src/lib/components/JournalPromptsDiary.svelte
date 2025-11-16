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
        <h4>Journal Prompts</h4>
        <button class="close-prompts" on:click={() => showPrompts = false} type="button">×</button>
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
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    z-index: 100;
    max-height: 300px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .prompts-header-diary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(139, 115, 85, 0.2);
  }

  .prompts-header-diary h4 {
    margin: 0;
    color: #4a3728;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .close-prompts {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    color: #6b5743;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
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

