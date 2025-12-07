<script>
  import { onMount } from 'svelte';
  import DiaryPage from '$lib/components/DiaryPage.svelte';
  import ChatInterface from '$lib/components/ChatInterface.svelte';
  import MoodTracker from '$lib/components/MoodTracker.svelte';
  import EmotionalInsights from '$lib/components/EmotionalInsights.svelte';
  import ConnectionReminders from '$lib/components/ConnectionReminders.svelte';
  import FavoritesView from '$lib/components/FavoritesView.svelte';
  import PrivacyInfo from '$lib/components/PrivacyInfo.svelte';
  import { DiaryStore } from '$lib/diary/DiaryStore.js';

  let currentView = 'diary'; // 'diary', 'chat', or 'insights'
  let diaryContext = '';
  let includeTodayEntry = false;
  let todayEntryText = '';
  let diaryPageRef;
  let chatInterfaceRef;
  let moodTrackerRef;
  let insightsRef;
  let favoritesRef;

  const diaryStore = new DiaryStore();

  onMount(() => {
    updateDiaryContext();
    updateTodayEntry();
  });

  function updateDiaryContext() {
    diaryContext = diaryStore.getContextForAgents();
  }

  function updateTodayEntry() {
    const today = diaryStore.formatDate();
    todayEntryText = diaryStore.getEntry(today);
  }

  // Update today's entry when switching to chat or when diary is saved
  function handleDiaryUpdate() {
    updateTodayEntry();
    updateDiaryContext();
  }

  function handleStartInteractive() {
    updateDiaryContext();
    updateTodayEntry();
    currentView = 'chat';
  }

  function switchToDiary() {
    currentView = 'diary';
  }

  function switchToFavorites() {
    currentView = 'favorites';
    if (favoritesRef && favoritesRef.refresh) {
      favoritesRef.refresh();
    }
  }

  function handleMoodSaved(event) {
    const { date, mood } = event.detail;
    if (diaryPageRef && diaryPageRef.updateMoodForDate) {
      diaryPageRef.updateMoodForDate(date, mood);
    }
  }

  function handleTalkAboutDay(event) {
    const { date } = event.detail;
    // Switch to chat mode
    updateDiaryContext();
    updateTodayEntry();
    currentView = 'chat';
    
    // If chat interface is available, import that day's entry
    if (chatInterfaceRef && chatInterfaceRef.importEntryForDate) {
      chatInterfaceRef.importEntryForDate(date);
    }
  }

  function switchToChat() {
    updateDiaryContext();
    updateTodayEntry();
    currentView = 'chat';
  }

  function switchToInsights() {
    currentView = 'insights';
    if (insightsRef) {
      insightsRef.refresh();
    }
  }

  function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
</script>

<svelte:head>
  <title>Diary Chatbot</title>
</svelte:head>

<div class="app-container">
  <MoodTracker bind:this={moodTrackerRef} />
  <PrivacyInfo />

  <div class="nav-tabs">
    <button 
      class="tab-btn" 
      class:active={currentView === 'diary'}
      on:click={switchToDiary}
    >
      📖 Diary
    </button>
    <button 
      class="tab-btn" 
      class:active={currentView === 'chat'}
      on:click={switchToChat}
    >
      💬 Interactive Mode
    </button>
    <button 
      class="tab-btn" 
      class:active={currentView === 'insights'}
      on:click={switchToInsights}
    >
      📊 Insights
    </button>
    <button 
      class="tab-btn" 
      class:active={currentView === 'favorites'}
      on:click={switchToFavorites}
    >
      ⭐ Favorites
    </button>
  </div>

  <div class="content-area">
    {#if currentView === 'diary'}
      <div class="diary-view">
        <DiaryPage 
          bind:this={diaryPageRef} 
          on:startInteractive={handleStartInteractive}
          on:entrySaved={handleDiaryUpdate}
          on:moodSaved={handleMoodSaved}
          on:talkAboutDay={handleTalkAboutDay}
        />
      </div>
    {/if}
    
    <!-- Keep ChatInterface mounted but hidden when not active -->
    <div class="chat-view" class:hidden={currentView !== 'chat'}>
      <ChatInterface 
        bind:this={chatInterfaceRef}
        {diaryContext} 
        includeTodayEntry={includeTodayEntry}
        todayEntry={todayEntryText}
      />
    </div>
    
    {#if currentView === 'insights'}
      <div class="insights-view">
        <EmotionalInsights bind:this={insightsRef} />
        <ConnectionReminders />
      </div>
    {/if}
    
    {#if currentView === 'favorites'}
      <div class="favorites-view">
        <FavoritesView bind:this={favoritesRef} />
      </div>
    {/if}
  </div>
</div>

<style>
  :global(:root) {
    --bg: #0f172a;
    --bg-grad-a: #0b1223;
    --bg-grad-b: #111827;
    --card: #ffffff;
    --card-muted: #f8fafc;
    --border: #e5e7eb;
    --text: #0f172a;
    --muted: #64748b;
    --primary: #2563eb;
    --primary-600: #1d4ed8;
  }

  :global(html, body) {
    height: 100%;
    margin: 0;
    background: linear-gradient(135deg, 
      rgba(255, 248, 240, 1) 0%,
      rgba(255, 245, 230, 1) 50%,
      rgba(250, 240, 220, 1) 100%),
      radial-gradient(circle at 20% 30%, rgba(255, 200, 150, 0.1), transparent),
      radial-gradient(circle at 80% 70%, rgba(200, 230, 255, 0.08), transparent);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
    overflow: hidden;
  }

  :global(*), :global(*::before), :global(*::after) {
    box-sizing: border-box;
  }

  .app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.5rem;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .subtitle {
    color: #6b5743;
    font-size: 1rem;
    margin: 0;
    font-style: italic;
  }

  .nav-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
    padding-bottom: 0.5rem;
  }

  .tab-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 10px 10px 0 0;
    background: rgba(255, 255, 255, 0.5);
    color: #6b5743;
    cursor: pointer;
    font-weight: 550;
    font-size: 1rem;
    transition: all 0.2s ease;
    position: relative;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.8);
    color: #4a3728;
    transform: translateY(-2px);
  }

  .tab-btn.active {
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    color: #8b7355;
    border-bottom: 3px solid #8b7355;
    margin-bottom: -3px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  }

  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .diary-view,
  .chat-view,
  .insights-view,
  .favorites-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }

  .chat-view.hidden {
    display: none;
  }

  .insights-view,
  .favorites-view {
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    padding: 0 1rem;
  }

  :global(.diary-container),
  :global(.chat-container) {
    flex: 1;
    min-height: 0;
  }

  @media (max-width: 768px) {
    .app-container {
      padding: 1rem 0.5rem;
    }

    .header h1 {
      font-size: 1.5rem;
    }

    .nav-tabs {
      gap: 0.25rem;
    }

    .tab-btn {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }
  }
</style>

