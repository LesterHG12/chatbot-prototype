<script>
  import { onMount } from 'svelte';
  import MessageBubble from './MessageBubble.svelte';
  import JournalPrompts from './JournalPrompts.svelte';
  import { MetricsCollector } from '../metrics/MetricsCollector.js';
  import { DiaryStore } from '../diary/DiaryStore.js';
  
  export let diaryContext = '';
  export let includeTodayEntry = false; // Option to include today's entry explicitly
  export let todayEntry = ''; // Today's diary entry text
  
  let messages = [];
  let input = '';
  let isLoading = false;
  let errorMsg = '';
  let replierInput = null;
  let currentMode = 'reflection'; // Automatically determined by orchestrator
  let showDiaryContext = false;
  let showImportDiary = false;
  let availableEntries = [];
  let selectedEntryDate = '';
  let selectedEntryText = '';
  let selectedCategory = 'daily';
  
  const metricsCollector = new MetricsCollector();
  const diaryStore = new DiaryStore();

  function loadAvailableEntries() {
    const allEntries = diaryStore.getAllEntries();
    const dates = Object.keys(allEntries)
      .filter(date => allEntries[date] && allEntries[date].trim().length > 0)
      .sort((a, b) => {
        // Sort in descending order (most recent first)
        return new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00');
      });
    
    availableEntries = dates.map(date => ({
      date,
      content: allEntries[date],
      display: formatDateDisplay(date)
    }));
  }

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
    
    const options = { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined };
    return date.toLocaleDateString('en-US', options);
  }

  function toggleImportDiary() {
    if (!showImportDiary) {
      loadAvailableEntries();
    }
    showImportDiary = !showImportDiary;
  }

  function selectEntry(entry) {
    selectedEntryDate = entry.date;
    selectedEntryText = entry.content;
    const today = diaryStore.formatDate();
    
    // If it's today's entry, use the todayEntry prop
    if (entry.date === today) {
      includeTodayEntry = true;
    } else {
      // Otherwise, add it to diary context manually
      if (!diaryContext.includes(entry.date)) {
        const entryContext = `Date: ${entry.date}\n${entry.content}`;
        diaryContext = diaryContext 
          ? `${diaryContext}\n\n---\n\n${entryContext}`
          : entryContext;
      }
    }
    
    showImportDiary = false;
    showDiaryContext = true;
  }

  // Initialize greeting on mount
  onMount(() => {
    if (messages.length === 0) {
      const greeting = getInitialGreeting();
      messages = [{ role: 'assistant', content: greeting }];
    }
  });

  function getInitialGreeting() {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${timeGreeting}! 💙 This is a space for you to explore your thoughts and feelings. I'll listen and reflect with you as you process your experiences, especially when you're feeling isolated, homesick, or far from your support system. What would you like to explore today?`;
  }
  
  function handlePromptSelected(prompt) {
    input = prompt;
    // Optionally auto-send, but better to let user edit
  }
  
  function handleCategoryChange(category) {
    selectedCategory = category;
  }

  function getModeDisplayName(mode) {
    if (mode === 'reflection') return 'Reflection';
    if (mode === 'validator') return 'Validation';
    if (mode === 'conflict') return 'Conflict Support';
    return 'Support';
  }

  function getModeIcon(mode) {
    if (mode === 'reflection') return '💭';
    if (mode === 'validator') return '💚';
    if (mode === 'conflict') return '🤝';
    return '💙';
  }

  async function send() {
    const content = input.trim();
    if (!content || isLoading) return;

    // Add user message
    messages = [...messages, { role: 'user', content }];
    input = '';
    isLoading = true;
    errorMsg = '';

    try {
      // Build diary context - include today's entry if requested
      let contextToSend = diaryContext;
      if (includeTodayEntry && todayEntry && todayEntry.trim()) {
        const today = new Date().toISOString().split('T')[0];
        const todayEntryContext = `Today's diary entry (${today}):\n${todayEntry}`;
        contextToSend = contextToSend 
          ? `${contextToSend}\n\n---\n\n${todayEntryContext}`
          : todayEntryContext;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: messages,
          diaryContext: contextToSend
          // Mode is determined automatically by orchestrator based on metrics
        })
      });

      const data = await res.json();

      if (!res.ok || data?.error) {
        errorMsg = data?.error || 'Request failed';
        isLoading = false;
        return;
      }

      if (data.assistantMessage) {
        messages = [...messages, { role: 'assistant', content: data.assistantMessage }];
        replierInput = data.replierInput || null;
        
        // Update current mode based on orchestrator's selection
        if (data.replierInput?.agent) {
          currentMode = data.replierInput.agent;
        }
        
        // Save metrics to client-side storage
        if (data.replierInput?.metrics) {
          metricsCollector.saveMetricsHistory(data.replierInput.metrics);
        }
      }
    } catch (err) {
      errorMsg = 'Failed to send message. Please try again.';
      console.error('Chat error:', err);
    } finally {
      isLoading = false;
    }
  }

  function toggleMode() {
    mode = mode === 'reflection' ? 'validator' : 'reflection';
  }
</script>

<div class="chat-container">
  <div class="chat-header">
      <div class="header-row">
        <div class="mode-indicator">
          <span class="mode-icon">{getModeIcon(currentMode)}</span>
          <span class="mode-label">{getModeDisplayName(currentMode)}</span>
          {#if replierInput?.reasons}
            <span class="mode-hint" title={replierInput.reasons}>ℹ️</span>
          {/if}
        </div>
        <div class="header-actions">
        <button 
          class="import-diary-btn"
          on:click={toggleImportDiary}
          title="Import diary entry to chat"
        >
          📥 Import Diary
        </button>
        {#if diaryContext || includeTodayEntry}
          <button 
            class="diary-context-btn"
            on:click={() => showDiaryContext = !showDiaryContext}
            title="Show diary context being used"
          >
            📖 {diaryContext ? 'Diary Connected' : 'No Diary'}
          </button>
        {/if}
      </div>
    </div>
    
    {#if showDiaryContext}
      <div class="diary-context-info">
        <div class="context-header">
          <strong>📝 Diary Context Used:</strong>
          <button class="close-context" on:click={() => showDiaryContext = false}>×</button>
        </div>
        {#if diaryContext}
          <div class="context-text">
            {diaryContext.split('\n').slice(0, 10).join('\n')}
            {diaryContext.split('\n').length > 10 ? '...' : ''}
          </div>
        {:else}
          <div class="context-text muted">No diary entries found. Start writing in your diary to provide context!</div>
        {/if}
        {#if includeTodayEntry && todayEntry}
          <div class="context-text" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(139,115,85,0.2);">
            <strong>Today's Entry:</strong><br/>
            {todayEntry.substring(0, 200)}
            {todayEntry.length > 200 ? '...' : ''}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if errorMsg}
    <div class="error" role="alert">
      {errorMsg}
    </div>
  {/if}

  {#if showImportDiary}
    <div class="import-diary-modal">
      <div class="import-diary-content">
        <div class="import-header">
          <h3>📖 Import Diary Entry</h3>
          <button class="close-import" on:click={toggleImportDiary} type="button">×</button>
        </div>
        <div class="entries-list">
          {#if availableEntries.length > 0}
            <p class="import-subtitle">Select an entry to include in this conversation:</p>
            <div class="entries-grid">
              {#each availableEntries as entry}
                <button
                  class="entry-option"
                  class:selected={selectedEntryDate === entry.date}
                  on:click={() => selectEntry(entry)}
                  type="button"
                >
                  <div class="entry-date">{entry.display}</div>
                  <div class="entry-preview">{entry.content.substring(0, 100)}{entry.content.length > 100 ? '...' : ''}</div>
                </button>
              {/each}
            </div>
          {:else}
            <div class="no-entries">
              <p>No diary entries found. Start writing in your diary first!</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <div class="chat-messages">
    {#each messages as message, i}
      <MessageBubble {message} mode={currentMode} />
    {/each}
    
    {#if isLoading}
      <div class="bubble-container assistant">
        <div class="bubble assistant thinking" class:reflection-mode={currentMode === 'reflection'} class:validator-mode={currentMode === 'validator'} class:conflict-mode={currentMode === 'conflict'}>
          <div class="typing" aria-label="Assistant is thinking">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    {/if}
  </div>

      <div class="chat-input-container">
        <JournalPrompts 
          onSelectPrompt={handlePromptSelected} 
          bind:selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          showLabels={true}
        />
        <div class="input-wrapper">
          <input
            type="text"
            bind:value={input}
            on:keydown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Share what's on your heart... 💙"
            class="chat-input"
            disabled={isLoading}
          />
          <button on:click={send} disabled={isLoading || !input.trim()} class="send-btn">
            Send
          </button>
        </div>
      </div>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border-radius: 16px;
    border: 2px solid rgba(139, 115, 85, 0.2);
    box-shadow: 
      0 8px 24px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    overflow: hidden;
  }

  .chat-header {
    padding: 1rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.15);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .mode-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 10px;
    border: 2px solid rgba(139, 115, 85, 0.2);
    font-size: 0.95rem;
    color: #4a3728;
    font-weight: 550;
  }

  .mode-icon {
    font-size: 1.1rem;
  }

  .mode-label {
    font-weight: 600;
  }

  .mode-hint {
    font-size: 0.85rem;
    cursor: help;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  .mode-hint:hover {
    opacity: 1;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .import-diary-btn {
    padding: 0.5rem 1rem;
    border: 2px solid rgba(107, 87, 67, 0.5);
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(139, 115, 85, 0.15) 0%, rgba(107, 87, 67, 0.15) 100%);
    color: #4a3728;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .import-diary-btn:hover {
    background: linear-gradient(135deg, rgba(139, 115, 85, 0.25) 0%, rgba(107, 87, 67, 0.25) 100%);
    border-color: rgba(107, 87, 67, 0.7);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .diary-context-btn {
    padding: 0.5rem 1rem;
    border: 2px solid rgba(139, 115, 85, 0.4);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.9);
    color: #4a3728;
    cursor: pointer;
    font-weight: 550;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .diary-context-btn:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(139, 115, 85, 0.6);
    transform: translateY(-1px);
  }

  .diary-context-info {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 10px;
    border: 2px solid rgba(139, 115, 85, 0.25);
    font-size: 0.9rem;
    max-height: 200px;
    overflow-y: auto;
  }

  .context-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    color: #4a3728;
    font-size: 0.95rem;
  }

  .close-context {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: #6b5743;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    transition: background 0.2s ease;
  }

  .close-context:hover {
    background: rgba(107, 87, 67, 0.1);
  }

  .context-text {
    color: #4a3728;
    line-height: 1.6;
    white-space: pre-wrap;
    font-size: 0.85rem;
  }

  .context-text.muted {
    color: #6b5743;
    font-style: italic;
  }

  .import-diary-modal {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .import-diary-content {
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border-radius: 16px;
    border: 2px solid rgba(139, 115, 85, 0.3);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .import-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .import-header h3 {
    margin: 0;
    color: #4a3728;
    font-size: 1.25rem;
    font-weight: 650;
  }

  .close-import {
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

  .close-import:hover {
    background: rgba(107, 87, 67, 0.1);
  }

  .entries-list {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .import-subtitle {
    color: #6b5743;
    font-size: 0.95rem;
    margin: 0 0 1rem 0;
    font-style: italic;
  }

  .entries-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .entry-option {
    padding: 1rem;
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.8);
    color: #4a3728;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .entry-option:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(139, 115, 85, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .entry-option.selected {
    background: linear-gradient(135deg, rgba(139, 115, 85, 0.2) 0%, rgba(107, 87, 67, 0.2) 100%);
    border-color: #8b7355;
    box-shadow: 0 4px 12px rgba(139, 115, 85, 0.2);
  }

  .entry-date {
    font-weight: 650;
    font-size: 0.95rem;
    color: #8b7355;
    margin-bottom: 0.5rem;
  }

  .entry-preview {
    font-size: 0.9rem;
    color: #4a3728;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .no-entries {
    text-align: center;
    padding: 2rem;
    color: #6b5743;
    font-style: italic;
  }

  .mode-btn {
    padding: 0.6rem 1.2rem;
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.8);
    color: #4a3728;
    cursor: pointer;
    font-weight: 550;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(139, 115, 85, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .mode-btn.active {
    background: linear-gradient(135deg, #8b7355 0%, #6b5743 100%);
    color: white;
    border-color: #6b5743;
    box-shadow: 0 4px 12px rgba(107, 87, 67, 0.3);
  }

  .error {
    background: #fff1f2;
    color: #7f1d1d;
    border: 1px solid #fecaca;
    padding: 0.75rem 1rem;
    margin: 1rem;
    border-radius: 8px;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    -webkit-overflow-scrolling: touch;
  }

  .bubble-container {
    display: flex;
    flex-direction: column;
    margin: 0.25rem 0;
  }

  .bubble-container.assistant {
    align-items: flex-start;
  }

  .bubble.thinking {
    opacity: 1 !important;
  }

  .bubble.thinking.reflection-mode {
    background: #f5f7fb;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
  }

  .bubble.thinking.validator-mode {
    background: #1e5f3e;
    border: 1px solid #155d2e;
    border-radius: 12px;
  }

  .bubble.thinking.conflict-mode {
    background: #c9732e;
    border: 1px solid #b8631e;
    border-radius: 12px;
  }

  .typing {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 0.5rem 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: currentColor;
    border-radius: 50%;
    opacity: 0.4;
    animation: blink 1.4s infinite both;
  }

  .bubble.thinking.validator-mode .dot {
    background: #ffffff;
  }

  .bubble.thinking.conflict-mode .dot {
    background: #ffffff;
  }

  .bubble.thinking.reflection-mode .dot {
    background: #64748b;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes blink {
    0%, 80%, 100% {
      opacity: 0.4;
    }
    40% {
      opacity: 1;
    }
  }

  .chat-input-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    border-top: 2px solid rgba(139, 115, 85, 0.15);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .input-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .chat-input {
    flex: 1;
    padding: 0.875rem 1.125rem;
    border-radius: 12px;
    border: 2px solid rgba(139, 115, 85, 0.25);
    background: rgba(255, 255, 255, 0.9);
    color: #4a3728;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .chat-input:focus {
    outline: none;
    border-color: #8b7355;
    box-shadow: 0 0 0 4px rgba(139, 115, 85, 0.15);
    background: white;
  }

  .chat-input::placeholder {
    color: rgba(107, 87, 67, 0.5);
    font-style: italic;
  }

  .chat-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .send-btn {
    padding: 0.875rem 1.75rem;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #8b7355 0%, #6b5743 100%);
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(107, 87, 67, 0.2);
  }

  .send-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #6b5743 0%, #5b4733 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(107, 87, 67, 0.3);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
</style>

