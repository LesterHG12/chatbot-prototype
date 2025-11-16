<script>
  export let message;
  export let mode = 'reflection'; // 'reflection', 'validator', or 'conflict'
  
  let isVisible = false;
  
  $: if (message.role === 'assistant') {
    // Trigger animation when message appears
    setTimeout(() => {
      isVisible = true;
    }, 50);
  } else {
    isVisible = true;
  }
</script>

<div class="bubble-container" class:assistant={message.role === 'assistant'} class:user={message.role === 'user'}>
  {#if message.role === 'user'}
    <div class="bubble user">
      {message.content}
    </div>
  {:else}
    <div 
      class="bubble assistant" 
      class:reflection-mode={mode === 'reflection'} 
      class:validator-mode={mode === 'validator'}
      class:conflict-mode={mode === 'conflict'}
      class:visible={isVisible}
    >
      {message.content}
    </div>
  {/if}
</div>

<style>
  .bubble-container {
    display: flex;
    flex-direction: column;
    margin: 0.5rem 0;
  }

  .bubble-container.user {
    align-items: flex-end;
  }

  .bubble-container.assistant {
    align-items: flex-start;
  }

  .bubble {
    padding: 0.75rem 1rem;
    border-radius: 12px;
    max-width: 75%;
    white-space: pre-wrap;
    line-height: 1.5;
    word-wrap: break-word;
    transition: opacity 0.2s ease-in;
  }

  .bubble.user {
    background: linear-gradient(135deg, #fff5e6 0%, #fff9f0 100%);
    color: #4a3728;
    border: 2px solid rgba(139, 115, 85, 0.3);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .bubble.assistant {
    opacity: 0;
  }

  .bubble.assistant.visible {
    opacity: 1;
  }

  /* Reflection Mode: Rounded bubbles, subtle colors, calm energy */
  .bubble.assistant.reflection-mode {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 250, 245, 0.95) 100%);
    color: #4a3728;
    border: 2px solid rgba(139, 115, 85, 0.2);
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  /* Validator Mode: Dark green bubbles, serious tone */
  .bubble.assistant.validator-mode {
    background: #1e5f3e;
    color: #ffffff;
    border: 1px solid #155d2e;
    border-radius: 12px;
    font-weight: 450;
  }

  /* Conflict Mode: Warm orange/amber bubbles, supportive but direct */
  .bubble.assistant.conflict-mode {
    background: #c9732e;
    color: #ffffff;
    border: 1px solid #b8631e;
    border-radius: 12px;
    font-weight: 450;
  }

  @media (max-width: 640px) {
    .bubble {
      max-width: 85%;
    }
  }
</style>

