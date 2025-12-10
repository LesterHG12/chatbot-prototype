<script>
  import { createEventDispatcher } from 'svelte';
  
  export let message;
  export let mode = 'reflection'; // 'reflection', 'validator', or 'conflict'
  
  const dispatch = createEventDispatcher();
  
  let isVisible = false;
  let feedbackGiven = null; // 'helpful' or 'not-helpful'
  
  $: if (message.role === 'assistant') {
    // Trigger animation when message appears
    setTimeout(() => {
      isVisible = true;
    }, 50);
  } else {
    isVisible = true;
  }

  function giveFeedback(type) {
    if (feedbackGiven) return; // Only allow one feedback per message
    feedbackGiven = type;
    dispatch('feedback', { 
      messageId: message.id || Date.now(), 
      helpful: type === 'helpful',
      mode 
    });
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
      <div class="feedback-buttons">
        <button
          class="feedback-btn"
          class:active={feedbackGiven === 'helpful'}
          on:click={() => giveFeedback('helpful')}
          title="This response was helpful"
          type="button"
        >
          👍
        </button>
        <button
          class="feedback-btn"
          class:active={feedbackGiven === 'not-helpful'}
          on:click={() => giveFeedback('not-helpful')}
          title="This response was not helpful"
          type="button"
        >
          👎
        </button>
      </div>
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
    padding: 0.875rem 1.125rem;
    border-radius: 12px;
    max-width: 75%;
    white-space: pre-wrap;
    line-height: 1.6;
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

  /* Validator Mode: Lighter green bubbles, serious but softer tone */
  .bubble.assistant.validator-mode {
    background: linear-gradient(135deg, rgba(239, 250, 244, 0.97) 0%, rgba(214, 245, 225, 0.97) 100%);
    color: #2e6942;
    border: 2px solid rgba(46, 148, 99, 0.18);
    border-radius: 18px;
    font-weight: 500;
  }

  /* Conflict Mode: Warm orange/amber bubbles, supportive but direct */
  .bubble.assistant.conflict-mode {
    background: linear-gradient(135deg, #fdebd3 0%, #f9d9b7 100%);
    color: #7a3f0a;
    border: 1px solid rgba(201, 115, 46, 0.35);
    border-radius: 14px;
    font-weight: 500;
  }

  .feedback-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(139, 115, 85, 0.15);
  }

  .feedback-btn {
    background: transparent;
    border: 1px solid rgba(139, 115, 85, 0.3);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    opacity: 0.6;
  }

  .feedback-btn:hover {
    opacity: 1;
    background: rgba(139, 115, 85, 0.1);
    border-color: rgba(139, 115, 85, 0.5);
  }

  .feedback-btn.active {
    opacity: 1;
    background: rgba(139, 115, 85, 0.2);
    border-color: rgba(139, 115, 85, 0.6);
  }

  .bubble.assistant.validator-mode .feedback-btn {
    border-color: rgba(34, 197, 94, 0.3);
    color: #166534;
  }

  .bubble.assistant.validator-mode .feedback-btn:hover {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.5);
  }

  @media (max-width: 640px) {
    .bubble {
      max-width: 85%;
    }
  }
</style>

