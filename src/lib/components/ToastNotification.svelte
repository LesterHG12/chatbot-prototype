<script>
  import { onMount } from 'svelte';
  
  export let message = '';
  export let type = 'success'; // 'success', 'info', 'error'
  export let duration = 2000;
  export let visible = false;
  
  let timeoutId;
  
  $: if (visible && message) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      visible = false;
    }, duration);
  }
  
  onMount(() => {
    return () => {
      clearTimeout(timeoutId);
    };
  });
</script>

{#if visible && message}
  <div class="toast" class:success={type === 'success'} class:info={type === 'info'} class:error={type === 'error'}>
    <span class="toast-icon">
      {#if type === 'success'}
        ✓
      {:else if type === 'error'}
        ✕
      {:else}
        ℹ️
      {/if}
    </span>
    <span class="toast-message">{message}</span>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    z-index: 10000;
    animation: slideIn 0.3s ease, fadeOut 0.3s ease 1.7s;
    max-width: 350px;
  }
  
  .toast.success {
    border-color: rgba(34, 197, 94, 0.4);
    background: linear-gradient(135deg, rgba(240, 253, 244, 0.95) 0%, rgba(220, 252, 231, 0.95) 100%);
  }
  
  .toast.info {
    border-color: rgba(59, 130, 246, 0.4);
    background: linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(219, 234, 254, 0.95) 100%);
  }
  
  .toast.error {
    border-color: rgba(239, 68, 68, 0.4);
    background: linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 226, 226, 0.95) 100%);
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  
  .toast-icon {
    font-size: 1.25rem;
    font-weight: bold;
    flex-shrink: 0;
  }
  
  .toast.success .toast-icon {
    color: #22c55e;
  }
  
  .toast.info .toast-icon {
    color: #3b82f6;
  }
  
  .toast.error .toast-icon {
    color: #ef4444;
  }
  
  .toast-message {
    color: #4a3728;
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.4;
  }
  
  @media (max-width: 640px) {
    .toast {
      bottom: 1rem;
      right: 1rem;
      left: 1rem;
      max-width: none;
    }
  }
</style>

