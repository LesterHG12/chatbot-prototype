<script>
  import { onMount } from 'svelte';
  
  export let onSelectTool = null;
  
  let showTools = false;
  let selectedTool = null;
  
  const reflectionTools = [
    {
      id: 'breathing',
      icon: '🌬️',
      title: 'Breathing Exercise',
      description: 'Take a moment to breathe and center yourself'
    },
    {
      id: 'gratitude',
      icon: '🙏',
      title: 'Gratitude List',
      description: 'Write down three things you\'re grateful for'
    },
    {
      id: 'perspective',
      icon: '🔭',
      title: 'Perspective Shift',
      description: 'Explore this situation from a different angle'
    },
    {
      id: 'values',
      icon: '💎',
      title: 'Core Values',
      description: 'Reflect on what matters most to you'
    }
  ];
  
  function selectTool(tool) {
    if (onSelectTool) {
      onSelectTool(tool);
    }
    showTools = false;
    selectedTool = tool;
  }
</script>

<div class="tools-container">
  <button 
    class="tools-toggle"
    on:click={() => showTools = !showTools}
    title="Reflection tools"
    type="button"
  >
    <span class="tools-icon">🧘</span>
    <span class="tools-label">Tools</span>
  </button>
  
  {#if showTools}
    <div class="tools-modal">
      <div class="tools-header">
        <h3>Reflection Tools</h3>
        <button class="close-tools" on:click={() => showTools = false} type="button">×</button>
      </div>
      
      <div class="tools-grid">
        {#each reflectionTools as tool}
          <button
            class="tool-card"
            on:click={() => selectTool(tool)}
            type="button"
          >
            <div class="tool-icon">{tool.icon}</div>
            <div class="tool-content">
              <div class="tool-title">{tool.title}</div>
              <div class="tool-description">{tool.description}</div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .tools-container {
    position: relative;
  }

  .tools-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(139, 115, 85, 0.3);
    border-radius: 20px;
    color: #4a3728;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .tools-toggle:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(139, 115, 85, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .tools-icon {
    font-size: 1.1rem;
  }

  .tools-modal {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-width: 350px;
    width: 90vw;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tools-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .tools-header h3 {
    margin: 0;
    color: #4a3728;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .close-tools {
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

  .close-tools:hover {
    background: rgba(107, 87, 67, 0.1);
  }

  .tools-grid {
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
  }

  .tool-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(139, 115, 85, 0.2);
    border-radius: 12px;
    color: #4a3728;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
  }

  .tool-card:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(139, 115, 85, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .tool-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .tool-content {
    flex: 1;
  }

  .tool-title {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
    color: #4a3728;
  }

  .tool-description {
    font-size: 0.85rem;
    color: #6b5743;
    line-height: 1.4;
  }
</style>

