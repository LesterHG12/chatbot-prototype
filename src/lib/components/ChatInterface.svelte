<script>
  import { onMount } from 'svelte';
  import MessageBubble from './MessageBubble.svelte';
  import JournalPrompts from './JournalPrompts.svelte';
  import { MetricsCollector } from '../metrics/MetricsCollector.js';
  import { DiaryStore } from '../diary/DiaryStore.js';
  import { ChatStore } from '../chat/ChatStore.js';
  import { PeopleStore } from '../people/PeopleStore.js';
  import { EventStore } from '../events/EventStore.js';
  
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
  let currentSessionId = null;
  let showChatHistory = false;
  let chatSessions = [];
  let deletingSessionId = null; // Track which session is being deleted
  let abortController = null; // Track current fetch request for cancellation
  let suggestedPromptCategory = 'daily';
  let summarySaving = false;
  let summaryMessage = '';
  let pendingEventCheck = false;
  
  const metricsCollector = new MetricsCollector();
  const diaryStore = new DiaryStore();
  const chatStore = new ChatStore();
  const peopleStore = new PeopleStore();
  const eventStore = new EventStore();

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
      // Otherwise, rebuild context centered on this date
      diaryContext = diaryStore.getContextForAgents(5, entry.date);
      includeTodayEntry = false;
    }
    
    showImportDiary = false;
    
    // Save to current session
    if (currentSessionId) {
      chatStore.updateSession(currentSessionId, {
        diaryContext,
        includeTodayEntry
      });
    }
    
    // Auto-engage: proactively start conversation about the imported entry
    autoEngageWithEntry(entry.date, entry.content);
  }

  // Export function to import entry for a specific date (called from right-click menu)
  export function importEntryForDate(date) {
    const entry = diaryStore.getEntry(date);
    if (entry && entry.trim()) {
      const today = diaryStore.formatDate();
      
      if (date === today) {
        includeTodayEntry = true;
      } else {
        diaryContext = diaryStore.getContextForAgents(5, date);
        includeTodayEntry = false;
      }
      
      // Save to current session
      if (currentSessionId) {
        chatStore.updateSession(currentSessionId, {
          diaryContext,
          includeTodayEntry
        });
      }
      
      // Auto-engage: send a proactive message based on the entry
      autoEngageWithEntry(date, entry);
    }
  }

  // Auto-engage bot when entry is imported
  async function autoEngageWithEntry(date, entryText) {
    // Create a more natural message that references the entry content
    // Extract a snippet to make it feel more conversational
    const snippet = entryText.substring(0, 100).trim();
    const importMessage = snippet.length < entryText.length 
      ? `I wrote about this: "${snippet}..."` 
      : `I wrote about this: "${snippet}"`;
    
    const userMessage = {
      role: 'user',
      content: importMessage,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    messages = [...messages, userMessage];
    
    // Persist immediately
    if (currentSessionId) {
      chatStore.setMessages(currentSessionId, messages);
    }
    
    // Send to bot
    input = '';
    isLoading = true;
    errorMsg = '';

    abortController = new AbortController();

    try {
      let contextToSend = diaryContext;
      if (includeTodayEntry && todayEntry && todayEntry.trim()) {
        const today = new Date().toISOString().split('T')[0];
        const todayEntryContext = `Today's diary entry (${today}):\n${todayEntry}`;
        contextToSend = contextToSend 
          ? `${contextToSend}\n\n---\n\n${todayEntryContext}`
          : todayEntryContext;
      }
      const peopleContext = peopleStore.getContextForAgents();
      const combinedContext = peopleContext
        ? contextToSend
          ? `${contextToSend}\n\n---\n\n${peopleContext}`
          : peopleContext
        : contextToSend;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: messages,
          diaryContext: combinedContext
        }),
        signal: abortController.signal
      });

      if (abortController.signal.aborted) {
        return;
      }

      const data = await res.json();

      if (abortController.signal.aborted) {
        return;
      }

      if (!res.ok || data?.error) {
        errorMsg = data?.error || 'Request failed';
        isLoading = false;
        abortController = null;
        return;
      }

      if (data.assistantMessage) {
        if (abortController.signal.aborted) {
          return;
        }

        const assistantMessage = {
          role: 'assistant',
          content: data.assistantMessage,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        messages = [...messages, assistantMessage];
        replierInput = data.replierInput || null;
        
        if (data.replierInput?.agent) {
          currentMode = data.replierInput.agent;
        }
        
        if (data.replierInput?.metrics) {
          metricsCollector.saveMetricsHistory(data.replierInput.metrics);
        }
        
        if (currentSessionId) {
          chatStore.setMessages(currentSessionId, messages);
          chatStore.updateSession(currentSessionId, {
            diaryContext,
            includeTodayEntry
          });
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        isLoading = false;
        abortController = null;
        return;
      }
      errorMsg = 'Failed to send message. Please try again.';
      console.error('Chat error:', err);
    } finally {
      if (!abortController?.signal.aborted) {
        isLoading = false;
        abortController = null;
      }
    }
  }

  // Load current session or create new one
  function loadCurrentSession() {
    const session = chatStore.getOrCreateCurrentSession();
    if (session) {
      currentSessionId = session.id;
      messages = session.messages || [];
      
      // If no messages, add greeting
      if (messages.length === 0) {
        const greeting = getInitialGreeting();
        messages = [{ 
          role: 'assistant', 
          content: greeting,
          id: `msg_${Date.now()}_greeting`
        }];
        chatStore.setMessages(currentSessionId, messages);
      }
      
      // Restore session context if available
      if (session.diaryContext) {
        diaryContext = session.diaryContext;
      }
      if (session.includeTodayEntry !== undefined) {
        includeTodayEntry = session.includeTodayEntry;
      }
    }
    refreshChatSessions();
  }

  // Check if a session has any user messages (not just the greeting)
  function hasUserMessages(session) {
    if (!session.messages || session.messages.length === 0) return false;
    return session.messages.some(msg => msg.role === 'user');
  }

  // Refresh the list of chat sessions (filter out empty ones)
  function refreshChatSessions() {
    const allSessions = chatStore.getAllSessions();
    // Only show sessions that have at least one user message
    chatSessions = allSessions.filter(session => hasUserMessages(session));
  }

  // Switch to a different chat session
  function switchToSession(sessionId) {
    const session = chatStore.getSession(sessionId);
    if (session) {
      // Cancel any in-progress request when switching sessions
      if (abortController && isLoading) {
        abortController.abort();
        abortController = null;
        isLoading = false;
      }
      
      // Save current session before switching
      if (currentSessionId) {
        chatStore.updateSession(currentSessionId, {
          diaryContext,
          includeTodayEntry
        });
      }
      
      currentSessionId = sessionId;
      chatStore.setCurrentSessionId(sessionId);
      messages = session.messages || [];
      
      if (messages.length === 0) {
        const greeting = getInitialGreeting();
        messages = [{ 
          role: 'assistant', 
          content: greeting,
          id: `msg_${Date.now()}_greeting`
        }];
        chatStore.setMessages(currentSessionId, messages);
      }
      
      diaryContext = session.diaryContext || '';
      includeTodayEntry = session.includeTodayEntry || false;
      showChatHistory = false;
    }
  }

  // Create a new chat session
  function createNewSession() {
    // Cancel any in-progress request when creating new session
    if (abortController && isLoading) {
      abortController.abort();
      abortController = null;
      isLoading = false;
    }
    
    // Save current session before creating new one
    if (currentSessionId) {
      chatStore.updateSession(currentSessionId, {
        diaryContext,
        includeTodayEntry
      });
    }
    
    const session = chatStore.createSession();
    if (session) {
      currentSessionId = session.id;
      messages = [];
      const greeting = getInitialGreeting();
      messages = [{ 
        role: 'assistant', 
        content: greeting,
        id: `msg_${Date.now()}_greeting`
      }];
      chatStore.setMessages(currentSessionId, messages);
      diaryContext = '';
      includeTodayEntry = false;
      showChatHistory = false;
      refreshChatSessions();
    }
  }

  // Start delete confirmation for a chat session
  function startDeleteSession(sessionId, event) {
    if (event) {
      event.stopPropagation();
    }
    deletingSessionId = sessionId;
  }

  // Cancel delete
  function cancelDelete(event) {
    if (event) {
      event.stopPropagation();
    }
    deletingSessionId = null;
  }

  // Confirm and delete a chat session
  function confirmDeleteSession(sessionId, event) {
    if (event) {
      event.stopPropagation();
    }
    
    // If deleting the current session and there's a request in progress, cancel it
    if (sessionId === currentSessionId && abortController && isLoading) {
      abortController.abort();
      abortController = null;
      isLoading = false;
      errorMsg = 'Request cancelled';
    }
    
    chatStore.deleteSession(sessionId);
    refreshChatSessions();
    deletingSessionId = null;
    
    // If deleting current session, create a new one
    if (sessionId === currentSessionId) {
      createNewSession();
    }
  }

  // Toggle chat history sidebar
  function toggleChatHistory() {
    if (!showChatHistory) {
      refreshChatSessions();
    }
    showChatHistory = !showChatHistory;
  }

  // Handle user feedback on responses
  function handleFeedback(feedback) {
    // Store feedback for insights
    if (typeof window !== 'undefined') {
      try {
        const feedbackHistory = JSON.parse(localStorage.getItem('response_feedback') || '[]');
        feedbackHistory.push({
          ...feedback,
          timestamp: new Date().toISOString(),
          sessionId: currentSessionId
        });
        localStorage.setItem('response_feedback', JSON.stringify(feedbackHistory));
      } catch (err) {
        console.error('Error saving feedback:', err);
      }
    }
  }

  // Initialize greeting on mount
  onMount(() => {
    loadCurrentSession();
    suggestedPromptCategory = metricsCollector.getSuggestedPromptCategory();
  });

  // Normalize any previously stored emoji that were mis-decoded
  function normalizeContent(text) {
    if (!text || typeof text !== 'string') return text;
    return text
      .replaceAll('ðŸ’™', '💙')
      .replaceAll('ðŸ’­', '💭')
      .replaceAll('ðŸ’š', '💚')
      .replaceAll('ðŸ¤', '🤝')
      .replaceAll('ðŸ—‘ï¸', '🗑️')
      .replaceAll('ðŸ“', '📝');
  }

  function getInitialGreeting() {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${timeGreeting}! 💖 This is a space for you to explore your thoughts and feelings. I'll listen and reflect with you as you process your experiences, especially when you're feeling isolated, homesick, or far from your support system. What would you like to explore today?`;
  }

  async function summarizeChatToDiary() {
    if (!messages || messages.length === 0 || summarySaving) return;
    summarySaving = true;
    summaryMessage = '';
    try {
      const targetDate = selectedEntryDate || diaryStore.formatDate();
      const res = await fetch('/api/diary-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: messages, date: targetDate })
      });
      if (!res.ok) {
        summaryMessage = 'Could not summarize right now.';
        return;
      }
      const data = await res.json();
      if (data?.summary) {
        const existing = diaryStore.getEntry(targetDate);
        const newContent = existing
          ? `${existing.trim()}\n\n---\n\nChat summary:\n${data.summary.trim()}`
          : `Chat summary:\n${data.summary.trim()}`;
        diaryStore.saveEntry(targetDate, newContent);
        summaryMessage = 'Saved a chat summary to your diary.';
      }
    } catch (err) {
      console.error('Summarize error:', err);
      summaryMessage = 'Could not summarize right now.';
    } finally {
      summarySaving = false;
    }
  }
  
  function handlePromptSelected(prompt) {
    input = prompt;
    // Optionally auto-send, but better to let user edit
  }

  async function extractEventsFromText(text) {
    // Skip if user marks as private in-line
    if (!text || text.toLowerCase().includes('[private]')) return;
    pendingEventCheck = true;
    try {
      const res = await fetch('/api/extract-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.events?.length) {
        eventStore.addEvents(data.events);
      }
    } catch (err) {
      console.error('event extraction error', err);
    } finally {
      pendingEventCheck = false;
    }
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
    return '💖';
  }

  async function send() {
    const content = input.trim();
    if (!content || isLoading) return;

    // Add user message with ID
    const userMessage = { 
      role: 'user', 
      content,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    messages = [...messages, userMessage];
    extractEventsFromText(content);
    
    // Persist user message immediately
    if (currentSessionId) {
      chatStore.setMessages(currentSessionId, messages);
    }
    
    input = '';
    isLoading = true;
    errorMsg = '';

    // Create AbortController for this request
    abortController = new AbortController();

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
      const peopleContext = peopleStore.getContextForAgents();
      const eventsContext = eventStore.getTodayContext();
      const combinedContext = [
        contextToSend,
        peopleContext || '',
        eventsContext || ''
      ].filter(Boolean).join('\n\n---\n\n');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: messages,
          diaryContext: combinedContext
          // Mode is determined automatically by orchestrator based on metrics
        }),
        signal: abortController.signal
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      const data = await res.json();

      // Check again if request was aborted after JSON parsing
      if (abortController.signal.aborted) {
        return;
      }

      if (!res.ok || data?.error) {
        errorMsg = data?.error || 'Request failed';
        isLoading = false;
        abortController = null;
        return;
      }

      if (data.assistantMessage) {
        // Check one more time if request was aborted before updating UI
        if (abortController.signal.aborted) {
          return;
        }

        const assistantMessage = { 
          role: 'assistant', 
          content: data.assistantMessage,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        messages = [...messages, assistantMessage];
        replierInput = data.replierInput || null;
        
        // Update current mode based on orchestrator's selection
        if (data.replierInput?.agent) {
          currentMode = data.replierInput.agent;
        }
        
        // Save metrics to client-side storage
        if (data.replierInput?.metrics) {
          metricsCollector.saveMetricsHistory(data.replierInput.metrics);
        }
        
        // Persist messages to store
        if (currentSessionId) {
          chatStore.setMessages(currentSessionId, messages);
          chatStore.updateSession(currentSessionId, {
            diaryContext,
            includeTodayEntry
          });
        }
      }
    } catch (err) {
      // Don't show error if request was aborted
      if (err.name === 'AbortError') {
        // Request was cancelled, clean up silently
        isLoading = false;
        abortController = null;
        return;
      }
      errorMsg = 'Failed to send message. Please try again.';
      console.error('Chat error:', err);
    } finally {
      if (!abortController?.signal.aborted) {
        isLoading = false;
        abortController = null;
      }
    }
  }

  function toggleMode() {
    mode = mode === 'reflection' ? 'validator' : 'reflection';
  }
</script>

<div class="chat-container" class:sidebar-open={showChatHistory}>
  <div class="chat-header">
      <div class="header-row">
        <!-- Mode indicator hidden to make UX less explicit - mode switching happens automatically -->
        <div class="header-actions">
        <button 
          class="chat-history-btn"
          on:click={toggleChatHistory}
          title="View previous chats"
        >
          💬 Chat History
        </button>
        <button 
          class="new-chat-btn"
          on:click={createNewSession}
          title="Start a new chat"
        >
          ➕ New Chat
        </button>
        <button 
          class="import-diary-btn"
          on:click={toggleImportDiary}
          title="Import diary entry to chat"
        >
          📥 Import Diary
        </button>
        <button 
          class="import-diary-btn"
          on:click={summarizeChatToDiary}
          title="Save a concise summary of this chat to your diary"
          disabled={summarySaving}
        >
          📝 Save Chat to Diary
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
    
  </div>

  {#if errorMsg}
    <div class="error" role="alert">
      {errorMsg}
    </div>
  {/if}
  {#if summaryMessage}
    <div class="info success">
      {summaryMessage}
    </div>
  {/if}

  <div class="chat-history-sidebar" class:open={showChatHistory}>
    <div class="chat-history-content">
      <div class="history-header">
        <h3>💬 Chat History</h3>
        <button class="close-history" on:click={toggleChatHistory} type="button">×</button>
      </div>
      <div class="sessions-list">
        {#if chatSessions.length > 0}
          {#each chatSessions as session}
            <div 
              class="session-item"
              class:active={session.id === currentSessionId}
              class:deleting={deletingSessionId === session.id}
              on:click={() => deletingSessionId !== session.id && switchToSession(session.id)}
            >
              <div class="session-info">
                <div class="session-title">{session.title}</div>
                <div class="session-date">{chatStore.formatDate(session.lastUpdated)}</div>
                <div class="session-preview">
                  {#if session.messages && session.messages.length > 0}
                    {@const lastUserMsg = [...session.messages].reverse().find(m => m.role === 'user')}
                    {#if lastUserMsg}
                    {#if normalizeContent(lastUserMsg.content)}
                      {normalizeContent(lastUserMsg.content).substring(0, 60)}{normalizeContent(lastUserMsg.content).length > 60 ? '...' : ''}
                    {:else}
                      {lastUserMsg.content.substring(0, 60)}{lastUserMsg.content.length > 60 ? '...' : ''}
                    {/if}
                    {:else}
                      {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
                    {/if}
                  {:else}
                    Empty chat
                  {/if}
                </div>
              </div>
              {#if deletingSessionId === session.id}
                <div class="delete-confirmation">
                  <span class="delete-text">Delete?</span>
                  <button 
                    class="confirm-delete-btn"
                    on:click={(e) => confirmDeleteSession(session.id, e)}
                    title="Confirm delete"
                  >
                    ✓
                  </button>
                  <button 
                    class="cancel-delete-btn"
                    on:click={(e) => cancelDelete(e)}
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              {:else}
                <button 
                  class="delete-session-btn"
                  on:click={(e) => startDeleteSession(session.id, e)}
                  title="Delete this chat"
                >
                  🗑️
                </button>
              {/if}
            </div>
          {/each}
        {:else}
          <div class="no-sessions">
            <p>No previous chats. Start a conversation!</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if showDiaryContext}
    <div class="diary-context-modal">
      <div class="diary-context-modal-content">
        <div class="context-modal-header">
          <h3>📝 Diary Context</h3>
          <button class="close-context-modal" on:click={() => showDiaryContext = false} type="button" aria-label="Close diary context">×</button>
        </div>
        <div class="context-modal-body">
          {#if diaryContext}
            <div class="context-section">
              <strong>Recent Diary Entries:</strong>
              <div class="context-text">
                {diaryContext}
              </div>
            </div>
          {:else}
            <div class="context-text muted">No diary entries found. Start writing in your diary to provide context!</div>
          {/if}
          {#if includeTodayEntry && todayEntry}
            <div class="context-section">
              <strong>Today's Entry:</strong>
              <div class="context-text">
                {todayEntry}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if showImportDiary}
    <div class="import-diary-modal">
      <div class="import-diary-content">
        <div class="import-header">
            <h3>📥 Import Diary Entry</h3>
          <button class="close-import" on:click={toggleImportDiary} type="button">?</button>
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
                  <div class="entry-preview">
                    {#if normalizeContent(entry.content)}
                      {normalizeContent(entry.content).substring(0, 100)}{normalizeContent(entry.content).length > 100 ? '...' : ''}
                    {:else}
                      {entry.content.substring(0, 100)}{entry.content.length > 100 ? '...' : ''}
                    {/if}
                  </div>
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
      <MessageBubble 
        {message} 
        mode={currentMode} 
        on:feedback={(e) => handleFeedback(e.detail)}
      />
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
        <div class="prompt-hint">
          {#if suggestedPromptCategory === 'homesickness'}
            Suggested prompts: Homesickness (based on recent writing).
          {:else if suggestedPromptCategory === 'relationships'}
            Suggested prompts: Relationships (based on recent writing).
          {:else if suggestedPromptCategory === 'challenges'}
            Suggested prompts: Challenges (based on recent writing).
          {:else if suggestedPromptCategory === 'reflection'}
            Suggested prompts: Deep Reflection (based on recent writing).
          {:else}
            Choose a prompt or just start typing to begin.
          {/if}
        </div>
        <JournalPrompts 
          onSelectPrompt={handlePromptSelected} 
          bind:selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          showLabels={false}
          suggestedCategory={suggestedPromptCategory}
        />
        <div class="input-wrapper">
          <input
            type="text"
            bind:value={input}
            on:keydown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Share what's on your heart... 💖"
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
    position: relative;
    transition: margin-left 0.3s ease;
  }

  .chat-container.sidebar-open {
    margin-left: 320px;
  }

  @media (max-width: 768px) {
    .chat-container.sidebar-open {
      margin-left: 0;
    }
    
    .chat-history-sidebar {
      width: 280px;
    }
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
    display: none; /* Hidden to make mode switching less explicit */
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
    flex-wrap: wrap;
  }

  .chat-history-btn,
  .new-chat-btn {
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

  .chat-history-btn:hover,
  .new-chat-btn:hover {
    background: linear-gradient(135deg, rgba(139, 115, 85, 0.25) 0%, rgba(107, 87, 67, 0.25) 100%);
    border-color: rgba(107, 87, 67, 0.7);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
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
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
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

  .diary-context-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    padding: 2rem;
  }

  .diary-context-modal-content {
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

  .context-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .context-modal-header h3 {
    margin: 0;
    color: #4a3728;
    font-size: 1.25rem;
    font-weight: 650;
  }

  .close-context-modal {
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

  .close-context-modal:hover {
    background: rgba(107, 87, 67, 0.1);
  }

  .context-modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .context-section {
    margin-bottom: 1.5rem;
  }

  .context-section:last-child {
    margin-bottom: 0;
  }

  .context-section strong {
    display: block;
    color: #4a3728;
    font-size: 0.95rem;
    font-weight: 650;
    margin-bottom: 0.75rem;
  }

  .context-text {
    color: #4a3728;
    line-height: 1.6;
    white-space: pre-wrap;
    font-size: 0.9rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    border: 1px solid rgba(139, 115, 85, 0.2);
  }

  .context-text.muted {
    color: #6b5743;
    font-style: italic;
    text-align: center;
    padding: 1.5rem;
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

  .info.success {
    background: #ecfdf3;
    color: #166534;
    border: 1px solid #bbf7d0;
    padding: 0.75rem 1rem;
    margin: 0 1rem 1rem 1rem;
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

  .prompt-hint {
    font-size: 0.85rem;
    color: rgba(74, 55, 40, 0.75);
    font-weight: 500;
    letter-spacing: 0.01em;
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

  .chat-history-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 320px;
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border-right: 2px solid rgba(139, 115, 85, 0.3);
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
    z-index: 999;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chat-history-sidebar.open {
    transform: translateX(0);
  }

  .chat-history-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .history-header h3 {
    margin: 0;
    color: #4a3728;
    font-size: 1.25rem;
    font-weight: 650;
  }

  .close-history {
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

  .close-history:hover {
    background: rgba(107, 87, 67, 0.1);
  }

  .sessions-list {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .session-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .session-item:hover:not(.deleting) {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(139, 115, 85, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .session-item.active {
    background: linear-gradient(135deg, rgba(139, 115, 85, 0.2) 0%, rgba(107, 87, 67, 0.2) 100%);
    border-color: #8b7355;
    box-shadow: 0 4px 12px rgba(139, 115, 85, 0.2);
  }

  .session-item.deleting {
    background: rgba(254, 242, 242, 0.9);
    border-color: rgba(220, 38, 38, 0.4);
    cursor: default;
  }

  .session-info {
    flex: 1;
    min-width: 0;
  }

  .session-title {
    font-weight: 650;
    font-size: 0.95rem;
    color: #8b7355;
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-date {
    font-size: 0.8rem;
    color: #6b5743;
    margin-bottom: 0.5rem;
  }

  .session-preview {
    font-size: 0.85rem;
    color: #4a3728;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .delete-session-btn {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    color: #6b5743;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
    opacity: 0.6;
    flex-shrink: 0;
  }

  .delete-session-btn:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
    opacity: 1;
  }

  .delete-confirmation {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .delete-text {
    font-size: 0.85rem;
    color: #dc2626;
    font-weight: 600;
    margin-right: 0.25rem;
  }

  .confirm-delete-btn,
  .cancel-delete-btn {
    background: transparent;
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 6px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    padding: 0;
  }

  .confirm-delete-btn {
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.4);
  }

  .confirm-delete-btn:hover {
    background: rgba(220, 38, 38, 0.1);
    border-color: #dc2626;
  }

  .cancel-delete-btn {
    color: #6b5743;
  }

  .cancel-delete-btn:hover {
    background: rgba(107, 87, 67, 0.1);
    border-color: rgba(107, 87, 67, 0.5);
  }

  .no-sessions {
    text-align: center;
    padding: 2rem;
    color: #6b5743;
    font-style: italic;
  }
</style>




