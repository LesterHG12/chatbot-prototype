<script>
  import { createEventDispatcher } from 'svelte';
  import { DiaryStore } from '../diary/DiaryStore.js';
  import JournalPrompts from './JournalPrompts.svelte';
  import ToastNotification from './ToastNotification.svelte';
  import { getRandomPrompt } from '../prompts/JournalPrompts.js';
  import { onMount } from 'svelte';

  const dispatch = createEventDispatcher();
  const diaryStore = new DiaryStore();
  
  let selectedDate = '';
  let entryText = '';
  let nextDate = '';
  let nextEntryText = '';
  let showCalendar = false;
  let isInteractiveMode = false;
  let showDeleteConfirm = false;
  let deleteTargetDate = '';
  let deleteTargetSide = ''; // 'left' or 'right'
  let leftEntryMetadata = { starred: false, mood: null, wordCount: 0, isPrivate: false };
  let rightEntryMetadata = { starred: false, mood: null, wordCount: 0, isPrivate: false };
  let toastMessage = '';
  let toastVisible = false;
  let toastType = 'success';
  let contextMenuVisible = false;
  let contextMenuDate = '';
  let contextMenuX = 0;
  let contextMenuY = 0;
  let lastFocusedSide = 'left'; // Track which textarea was last focused: 'left' or 'right'

  onMount(() => {
    // Set to today's date by default
    selectedDate = diaryStore.formatDate();
    // loadEntry will be called by reactive statement
  });

  function loadEntry() {
    // Ensure selectedDate is valid before loading
    if (!selectedDate) return;
    
    entryText = diaryStore.getEntry(selectedDate);
    const metadata = diaryStore.getMetadata(selectedDate);
    leftEntryMetadata = { 
      starred: metadata.starred || false, 
      mood: metadata.mood || null, 
      wordCount: diaryStore.getWordCount(entryText),
      isPrivate: metadata.isPrivate || false
    };
    
    // Calculate and load next day's entry (always selectedDate + 1 day)
    const currentDate = new Date(selectedDate + 'T00:00:00'); // Add time to avoid timezone issues
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDate = diaryStore.formatDate(nextDay);
    nextEntryText = diaryStore.getEntry(nextDate);
    const nextMetadata = diaryStore.getMetadata(nextDate);
    rightEntryMetadata = { 
      starred: nextMetadata.starred || false, 
      mood: nextMetadata.mood || null, 
      wordCount: diaryStore.getWordCount(nextEntryText),
      isPrivate: nextMetadata.isPrivate || false
    };
  }

  function saveEntry() {
    diaryStore.saveEntry(selectedDate, entryText);
  }

  function saveNextEntry() {
    diaryStore.saveEntry(nextDate, nextEntryText);
  }


  function goToPreviousDay(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    saveEntry();
    saveNextEntry();
    // Create date object with time to avoid timezone issues
    // Navigate by 2 days (both pages move together)
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() - 2);
    selectedDate = diaryStore.formatDate(date);
    // loadEntry will be triggered by reactive statement when selectedDate changes
  }

  function goToNextDay(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    saveEntry();
    saveNextEntry();
    // Create date object with time to avoid timezone issues
    // Navigate by 2 days (both pages move together)
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() + 2);
    selectedDate = diaryStore.formatDate(date);
    // loadEntry will be triggered by reactive statement when selectedDate changes
  }

  function handleDateSelect(date) {
    saveEntry();
    saveNextEntry();
    selectedDate = diaryStore.formatDate(date);
    showCalendar = false;
    // loadEntry will be triggered by reactive statement
  }

  function handleDateChange(event) {
    saveEntry();
    saveNextEntry();
    selectedDate = event.target.value;
    // loadEntry will be triggered by reactive statement
  }

  function toggleCalendar() {
    showCalendar = !showCalendar;
  }

  function startInteractiveMode() {
    saveEntry();
    saveNextEntry();
    isInteractiveMode = true;
    dispatch('startInteractive');
  }

  function handleRightClick(event, date, side) {
    if (event.button === 2) { // Right click
      event.preventDefault();
      const entryContent = side === 'left' ? entryText : nextEntryText;
      if (entryContent && entryContent.trim()) {
        contextMenuDate = date;
        contextMenuX = event.clientX;
        contextMenuY = event.clientY;
        contextMenuVisible = true;
      }
    }
  }

  function handleContextMenuAction(action) {
    if (action === 'talkAboutDay' && contextMenuDate) {
      // Dispatch event to open interactive mode with this day's entry
      dispatch('talkAboutDay', { date: contextMenuDate });
      contextMenuVisible = false;
    }
  }

  function closeContextMenu() {
    contextMenuVisible = false;
  }

  // Close context menu on click outside
  function handleClickOutside(event) {
    if (contextMenuVisible && !event.target.closest('.context-menu')) {
      closeContextMenu();
    }
  }

  // Auto-save on text change with debounce
  let saveTimeout;
  let nextSaveTimeout;
  
  function showToast(message, type = 'success') {
    toastMessage = message;
    toastType = type;
    toastVisible = true;
  }

  async function extractMoodFromText(text, date) {
    if (!text || text.trim().length < 10) return; // Skip if text is too short
    
    try {
      const res = await fetch('/api/extract-mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.mood) {
          diaryStore.setMood(date, data.mood);
          // Also save stress, loneliness, homesickness levels
          const today = diaryStore.formatDate();
          if (date === today || date === selectedDate) {
            leftEntryMetadata.mood = data.mood;
          } else if (date === nextDate) {
            rightEntryMetadata.mood = data.mood;
          }
          
          // Save mood data to localStorage for mood tracker
          const moodData = {
            mood: data.mood,
            stressLevel: data.stressLevel || 5,
            lonelinessLevel: data.lonelinessLevel || 5,
            homesicknessLevel: data.homesicknessLevel || 5,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(`mood_${date}`, JSON.stringify(moodData));
        }
      }
    } catch (err) {
      console.error('Error extracting mood:', err);
      // Silently fail - mood extraction is optional
    }
  }

  function handleTextChange() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      if (entryText.trim()) {
        diaryStore.saveEntry(selectedDate, entryText);
        const wordCount = diaryStore.getWordCount(entryText);
        diaryStore.saveMetadata(selectedDate, { wordCount });
        leftEntryMetadata.wordCount = wordCount;
        showToast('Entry saved', 'success');
        
        // Extract mood from text automatically
        await extractMoodFromText(entryText, selectedDate);
      } else {
        // Auto-delete if entry is empty
        diaryStore.deleteEntry(selectedDate);
      }
      dispatch('entrySaved');
    }, 500);
  }

  function handleNextEntryChange() {
    clearTimeout(nextSaveTimeout);
    nextSaveTimeout = setTimeout(async () => {
      if (nextEntryText.trim()) {
        diaryStore.saveEntry(nextDate, nextEntryText);
        const wordCount = diaryStore.getWordCount(nextEntryText);
        diaryStore.saveMetadata(nextDate, { wordCount });
        rightEntryMetadata.wordCount = wordCount;
        showToast('Entry saved', 'success');
        
        // Extract mood from text automatically
        await extractMoodFromText(nextEntryText, nextDate);
      } else {
        // Auto-delete if entry is empty
        diaryStore.deleteEntry(nextDate);
      }
      dispatch('entrySaved');
    }, 500);
  }

  function toggleStar(side) {
    const date = side === 'left' ? selectedDate : nextDate;
    const isStarred = diaryStore.toggleStar(date);
    
    if (side === 'left') {
      leftEntryMetadata.starred = isStarred;
    } else {
      rightEntryMetadata.starred = isStarred;
    }
  }

  function togglePrivate(side) {
    const date = side === 'left' ? selectedDate : nextDate;
    const metadata = diaryStore.getMetadata(date);
    const newPrivateState = !metadata.isPrivate;
    diaryStore.saveMetadata(date, { isPrivate: newPrivateState });
    
    if (side === 'left') {
      leftEntryMetadata.isPrivate = newPrivateState;
    } else {
      rightEntryMetadata.isPrivate = newPrivateState;
    }
    
    showToast(newPrivateState ? 'Entry marked as private' : 'Entry marked as public', 'info');
  }


  function getMoodEmoji(mood) {
    const moodMap = {
      'happy': '😊',
      'calm': '😌',
      'sad': '😢',
      'anxious': '😰',
      'lonely': '😔',
      'tired': '😴',
      'frustrated': '😤',
      'loved': '🥰'
    };
    return moodMap[mood] || '';
  }

  // Sync mood from MoodTracker if available
  function syncMoodFromTracker(date, mood) {
    if (mood) {
      diaryStore.setMood(date, mood);
      if (date === selectedDate) {
        leftEntryMetadata.mood = mood;
      } else if (date === nextDate) {
        rightEntryMetadata.mood = mood;
      }
    }
  }

  // Export function to sync mood when mood tracker saves
  export function updateMoodForDate(date, mood) {
    syncMoodFromTracker(date, mood);
    loadEntry(); // Reload to refresh UI
  }

  function confirmDelete() {
    deleteTargetDate = selectedDate;
    deleteTargetSide = 'left';
    showDeleteConfirm = true;
  }

  function confirmDeleteNext() {
    deleteTargetDate = nextDate;
    deleteTargetSide = 'right';
    showDeleteConfirm = true;
  }

  function deleteEntry() {
    if (deleteTargetDate) {
      diaryStore.deleteEntry(deleteTargetDate);
      
      // Clear the entry from the UI
      if (deleteTargetSide === 'left') {
        entryText = '';
      } else if (deleteTargetSide === 'right') {
        nextEntryText = '';
      }
      
      dispatch('entrySaved');
      showDeleteConfirm = false;
      deleteTargetDate = '';
      deleteTargetSide = '';
    }
  }

  function cancelDelete() {
    showDeleteConfirm = false;
    deleteTargetDate = '';
    deleteTargetSide = '';
  }

  let selectedCategory = 'daily';

  function handlePromptSelected(prompt) {
    // Add prompt to the current entry text
    if (!entryText.trim()) {
      entryText = prompt + ' ';
    } else {
      entryText += '\n\n' + prompt + ' ';
    }
    // Trigger save
    handleTextChange();
    // Focus the textarea
    setTimeout(() => {
      const textarea = document.querySelector('.entry-textarea');
      if (textarea) textarea.focus();
    }, 100);
  }

  function handleNextPromptSelected(prompt) {
    // Add prompt to the next day's entry text
    if (!nextEntryText.trim()) {
      nextEntryText = prompt + ' ';
    } else {
      nextEntryText += '\n\n' + prompt + ' ';
    }
    // Trigger save
    handleNextEntryChange();
    // Focus the textarea
    setTimeout(() => {
      const textareas = document.querySelectorAll('.entry-textarea');
      if (textareas && textareas.length > 1) textareas[1].focus();
    }, 100);
  }

  function handleCategoryChange(category) {
    selectedCategory = category;
  }

  function handleRandomPrompt() {
    const randomPrompt = getRandomPrompt();
    handlePromptSelected(randomPrompt);
  }


  // Format date for display
  function formatDateDisplay(dateString) {
    const date = new Date(dateString);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  // Get all dates with entries for calendar (sorted by date, most recent first)
  function getDatesWithEntries() {
    const entries = diaryStore.getAllEntries();
    return Object.keys(entries)
      .filter(date => entries[date].trim().length > 0)
      .sort((a, b) => {
        // Sort in descending order (most recent first)
        return new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00');
      });
  }

  // Export function to get diary context
  export function getDiaryContext() {
    return diaryStore.getContextForAgents();
  }

  export function getCurrentDate() {
    return selectedDate;
  }

  $: formattedDate = selectedDate ? formatDateDisplay(selectedDate) : '';
  $: nextFormattedDate = nextDate ? formatDateDisplay(nextDate) : '';
  $: datesWithEntries = getDatesWithEntries();
  
  // Reactive: reload entries when selectedDate changes
  $: if (selectedDate) {
    loadEntry();
  }

</script>

<div class="diary-book-container">
  <!-- Calendar button at top center -->
  <div class="journal-header">
    <button class="calendar-toggle-top" on:click|preventDefault={toggleCalendar} type="button" title="Open calendar">
      📅
    </button>
  </div>

  <!-- Single prompts component for both pages -->
  <div class="global-prompts-container">
    <JournalPrompts 
      onSelectPrompt={(prompt) => handlePromptSelected(prompt)}
      bind:selectedCategory={selectedCategory}
      onCategoryChange={handleCategoryChange}
      showLabels={false}
      showRandomButton={true}
    />
  </div>

  <div class="diary-pages-container">
    {#if showCalendar}
      <div class="calendar-overlay">
        <div class="calendar">
          <div class="calendar-header">
            <h3>Select Date</h3>
            <button class="close-calendar" on:click|preventDefault={toggleCalendar} type="button">×</button>
          </div>
          <div class="calendar-body">
            <input 
              type="date" 
              bind:value={selectedDate} 
              on:change={handleDateChange}
              class="calendar-input"
            />
            {#if datesWithEntries.length > 0}
              <div class="entries-list">
                <h4>Dates with entries:</h4>
                <div class="entry-dates">
                  {#each datesWithEntries as date}
                    <button 
                      class="entry-date-btn"
                      class:active={date === selectedDate}
                      on:click={() => handleDateSelect(new Date(date))}
                      type="button"
                    >
                      {formatDateDisplay(date)}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Left page -->
    <div class="diary-page left-page">
      <div class="page-content">
        <div class="page-header">
          <button class="nav-arrow left-arrow" on:click|preventDefault|stopPropagation={goToPreviousDay} aria-label="Previous day" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          
          <div class="date-display">
            <h2 class="date-title">{formattedDate}</h2>
          </div>

          <div class="entry-actions-left">
            <button 
              class="star-btn"
              class:starred={leftEntryMetadata.starred}
              on:click|preventDefault={() => toggleStar('left')}
              title={leftEntryMetadata.starred ? 'Unstar entry' : 'Star entry'}
              type="button"
            >
              {leftEntryMetadata.starred ? '⭐' : '☆'}
            </button>
            <button 
              class="private-btn"
              class:private={leftEntryMetadata.isPrivate}
              on:click|preventDefault={() => togglePrivate('left')}
              title={leftEntryMetadata.isPrivate ? 'Entry is private (not shared with chatbot)' : 'Mark as private (exclude from chatbot)'}
              type="button"
            >
              {leftEntryMetadata.isPrivate ? '🔒' : '🔓'}
            </button>
          </div>
          {#if entryText.trim()}
            <button 
              class="delete-btn"
              on:click|preventDefault={() => confirmDelete()}
              title="Delete entry"
              type="button"
            >
              🗑️
            </button>
          {/if}
        </div>


        <div class="entry-area" on:contextmenu|preventDefault={(e) => handleRightClick(e, selectedDate, 'left')}>
          <div class="entry-lines"></div>
          <textarea
            bind:value={entryText}
            on:input={handleTextChange}
            on:focus={() => handleFocus('left')}
            on:contextmenu|preventDefault={(e) => handleRightClick(e, selectedDate, 'left')}
            placeholder=""
            class="entry-textarea left"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Book binding/spine -->
    <div class="book-binding"></div>

    <!-- Right page -->
    <div class="diary-page right-page">
      <div class="page-content">
      <div class="page-header">
        <div class="entry-actions-right">
          <button 
            class="star-btn"
            class:starred={rightEntryMetadata.starred}
            on:click|preventDefault={() => toggleStar('right')}
            title={rightEntryMetadata.starred ? 'Unstar entry' : 'Star entry'}
            type="button"
          >
            {rightEntryMetadata.starred ? '⭐' : '☆'}
          </button>
          <button 
            class="private-btn"
            class:private={rightEntryMetadata.isPrivate}
            on:click|preventDefault={() => togglePrivate('right')}
            title={rightEntryMetadata.isPrivate ? 'Entry is private (not shared with chatbot)' : 'Mark as private (exclude from chatbot)'}
            type="button"
          >
            {rightEntryMetadata.isPrivate ? '🔒' : '🔓'}
          </button>
        </div>
        
        <div class="date-display">
          <h2 class="date-title">{formatDateDisplay(nextDate)}</h2>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem;">
          {#if nextEntryText.trim()}
            <button 
              class="delete-btn"
              on:click|preventDefault={() => confirmDeleteNext()}
              title="Delete entry"
              type="button"
            >
              🗑️
            </button>
          {/if}
          <button class="nav-arrow right-arrow" on:click|preventDefault|stopPropagation={goToNextDay} aria-label="Next day" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

        <div class="entry-area" on:contextmenu|preventDefault={(e) => handleRightClick(e, nextDate, 'right')}>
          <div class="entry-lines"></div>
          <textarea
            bind:value={nextEntryText}
            on:input={handleNextEntryChange}
            on:focus={() => handleFocus('right')}
            on:contextmenu|preventDefault={(e) => handleRightClick(e, nextDate, 'right')}
            placeholder=""
            class="entry-textarea right"
          ></textarea>
        </div>
      </div>
    </div>
  </div>

  {#if showDeleteConfirm}
    <div class="delete-confirm-overlay">
      <div class="delete-confirm-modal">
        <div class="delete-confirm-header">
          <h3>Delete Entry?</h3>
        </div>
        <div class="delete-confirm-body">
          <p>Are you sure you want to delete the entry for <strong>{formatDateDisplay(deleteTargetDate)}</strong>?</p>
          <p class="delete-warning">This action cannot be undone.</p>
        </div>
        <div class="delete-confirm-actions">
          <button 
            class="delete-cancel-btn"
            on:click={cancelDelete}
            type="button"
          >
            Cancel
          </button>
          <button 
            class="delete-confirm-btn"
            on:click={deleteEntry}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  {/if}

  <ToastNotification 
    message={toastMessage} 
    type={toastType} 
    bind:visible={toastVisible}
  />

  {#if contextMenuVisible}
    <div 
      class="context-menu-overlay"
      on:click={closeContextMenu}
      on:contextmenu|preventDefault={closeContextMenu}
    >
      <div 
        class="context-menu"
        style="left: {contextMenuX}px; top: {contextMenuY}px;"
        on:click|stopPropagation
      >
        <button 
          class="context-menu-item"
          on:click={() => handleContextMenuAction('talkAboutDay')}
          type="button"
        >
          💬 Talk about this day
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .diary-book-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    max-width: 1400px;
    margin: 0 auto;
    background: linear-gradient(135deg, #8b7355 0%, #6b5743 100%);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    position: relative;
    overflow: visible;
  }

  .journal-header {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    position: relative;
    z-index: 5;
  }

  .calendar-toggle-top {
    padding: 0.75rem 1.5rem;
    background: rgba(139, 115, 85, 0.2);
    border: 2px solid rgba(139, 115, 85, 0.4);
    border-radius: 8px;
    color: #4a3728;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .random-prompt-global-btn {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 223, 0, 0.15) 100%);
    border: 2px solid rgba(255, 193, 7, 0.4);
    border-radius: 8px;
    color: #4a3728;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(255, 193, 7, 0.15);
    white-space: nowrap;
  }

  .random-prompt-global-btn:hover {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 223, 0, 0.25) 100%);
    border-color: rgba(255, 193, 7, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 193, 7, 0.25);
  }

  .global-prompts-container {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    width: calc(100% - 4rem);
    max-width: 1000px;
    pointer-events: none;
  }

  .global-prompts-container :global(.prompts-container) {
    pointer-events: all;
    background: linear-gradient(135deg, rgba(255, 254, 249, 0.98) 0%, rgba(255, 249, 240, 0.98) 100%);
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 16px;
    padding: 0.75rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    position: relative;
    overflow: visible;
  }

  .calendar-toggle-top:hover {
    background: rgba(139, 115, 85, 0.3);
    border-color: rgba(139, 115, 85, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .diary-pages-container {
    display: flex;
    flex: 1;
    width: 100%;
    position: relative;
  }

  /* Book binding/spine effect */
  .diary-pages-container::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 20px;
    background: linear-gradient(90deg, 
      rgba(0, 0, 0, 0.3) 0%,
      rgba(0, 0, 0, 0.5) 50%,
      rgba(0, 0, 0, 0.3) 100%);
    transform: translateX(-50%);
    z-index: 2;
    box-shadow: inset -2px 0 10px rgba(0, 0, 0, 0.4);
  }

  .diary-page {
    flex: 1;
    background: 
      repeating-linear-gradient(
        0deg,
        #faf8f3 0px,
        #faf8f3 24px,
        #e8e6e0 24px,
        #e8e6e0 25px
      ),
      linear-gradient(to bottom, #fffef9 0%, #faf8f3 100%);
    box-shadow: 
      inset 0 0 30px rgba(0, 0, 0, 0.05),
      2px 2px 10px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
    border-radius: 4px;
  }

  .left-page {
    margin-right: 10px;
    border-right: 1px solid rgba(139, 115, 85, 0.3);
  }

  .right-page {
    margin-left: 10px;
    border-left: 1px solid rgba(139, 115, 85, 0.3);
  }

  .page-content {
    padding: 1.5rem 3rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(139, 115, 85, 0.15);
    gap: 1rem;
    position: relative;
  }

  .date-display {
    flex: 1;
    text-align: center;
  }

  .date-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: rgba(74, 55, 40, 0.8);
    font-family: 'Georgia', serif;
    letter-spacing: 0.3px;
  }

  .nav-arrow {
    background: transparent;
    border: none;
    border-radius: 6px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgba(107, 87, 67, 0.6);
    transition: all 0.2s ease;
    padding: 0;
  }

  .nav-arrow:hover {
    background: rgba(139, 115, 85, 0.1);
    color: #6b5743;
  }

  .date-display {
    flex: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .date-title {
    margin: 0;
    color: #4a3728;
    font-weight: 600;
    font-size: 1.25rem;
    font-family: 'Georgia', serif;
  }


  .calendar-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    border-radius: 12px;
  }

  .calendar {
    background: #faf8f3;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
    border: 2px solid #6b5743;
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(139, 115, 85, 0.3);
  }

  .calendar-header h3 {
    margin: 0;
    color: #4a3728;
    font-family: 'Georgia', serif;
  }

  .close-calendar {
    background: transparent;
    border: none;
    font-size: 2rem;
    color: #6b5743;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 30px;
    height: 30px;
  }

  .close-calendar:hover {
    color: #4a3728;
  }

  .calendar-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(139, 115, 85, 0.3);
    border-radius: 6px;
    background: white;
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .entries-list h4 {
    margin: 0 0 0.75rem 0;
    color: #4a3728;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .entry-dates {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 200px;
    overflow-y: auto;
  }

  .entry-date-btn {
    padding: 0.5rem 1rem;
    background: rgba(139, 115, 85, 0.05);
    border: 1px solid rgba(139, 115, 85, 0.2);
    border-radius: 6px;
    color: #4a3728;
    cursor: pointer;
    text-align: left;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .entry-date-btn:hover {
    background: rgba(139, 115, 85, 0.15);
    border-color: rgba(139, 115, 85, 0.4);
  }

  .entry-date-btn.active {
    background: rgba(139, 115, 85, 0.2);
    border-color: rgba(139, 115, 85, 0.5);
    font-weight: 600;
  }

  .entry-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    margin-top: 0.5rem;
  }

  .entry-lines {
    position: absolute;
    top: 0;
    left: 1.5rem;
    right: 1.5rem;
    bottom: 0;
    pointer-events: none;
    z-index: 1;
    background: repeating-linear-gradient(
      transparent,
      transparent 31px,
      rgba(139, 115, 85, 0.1) 31px,
      rgba(139, 115, 85, 0.1) 32px
    );
  }

  .entry-textarea {
    flex: 1;
    padding: 0 1.5rem;
    border: none;
    background: transparent;
    color: #2d1f14;
    font-size: 1rem;
    line-height: 32px;
    font-family: 'Georgia', 'Times New Roman', serif;
    resize: none;
    min-height: 400px;
    outline: none;
    position: relative;
    z-index: 2;
  }

  .entry-textarea::placeholder {
    color: rgba(107, 87, 67, 0.3);
    font-style: italic;
  }



  .book-binding {
    width: 20px;
    background: linear-gradient(90deg, 
      rgba(0, 0, 0, 0.2) 0%,
      rgba(0, 0, 0, 0.4) 50%,
      rgba(0, 0, 0, 0.2) 100%);
    position: relative;
    z-index: 3;
  }

  @media (max-width: 1024px) {
    .diary-book-container {
      flex-direction: column;
      padding: 1rem;
    }

    .diary-page {
      margin: 0;
      margin-bottom: 1rem;
    }

    .left-page {
      border-right: none;
      border-bottom: 1px solid rgba(139, 115, 85, 0.3);
    }

    .right-page {
      border-left: none;
    }

    .book-binding {
      display: none;
    }

    .diary-book-container::before {
      display: none;
    }
  }

  .export-actions {
    display: flex;
    justify-content: center;
    padding: 0.5rem 0;
    margin-bottom: 0.5rem;
  }

  .export-to-chat-btn {
    padding: 0.6rem 1.2rem;
    border: 2px solid rgba(139, 115, 85, 0.4);
    border-radius: 8px;
    background: rgba(139, 115, 85, 0.1);
    color: #4a3728;
    cursor: pointer;
    font-weight: 550;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .export-to-chat-btn:hover:not(:disabled) {
    background: rgba(139, 115, 85, 0.2);
    border-color: rgba(139, 115, 85, 0.6);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .export-to-chat-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }


  .entry-actions {
    display: flex;
    justify-content: center;
    padding: 0.5rem 0;
    margin-bottom: 0.5rem;
  }

  .delete-entry-btn {
    padding: 0.5rem 1rem;
    border: 2px solid rgba(220, 38, 38, 0.4);
    border-radius: 8px;
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
    cursor: pointer;
    font-weight: 550;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .delete-entry-btn:hover {
    background: rgba(220, 38, 38, 0.2);
    border-color: rgba(220, 38, 38, 0.6);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .delete-confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 2rem;
  }

  .delete-confirm-modal {
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border-radius: 16px;
    border: 2px solid rgba(139, 115, 85, 0.3);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    max-width: 450px;
    width: 100%;
    overflow: hidden;
  }

  .delete-confirm-header {
    padding: 1.5rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .delete-confirm-header h3 {
    margin: 0;
    color: #dc2626;
    font-size: 1.25rem;
    font-weight: 650;
  }

  .delete-confirm-body {
    padding: 1.5rem;
    color: #4a3728;
    line-height: 1.6;
  }

  .delete-confirm-body p {
    margin: 0 0 0.75rem 0;
  }

  .delete-confirm-body p:last-child {
    margin: 0;
  }

  .delete-warning {
    color: #dc2626;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .delete-confirm-actions {
    display: flex;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-top: 2px solid rgba(139, 115, 85, 0.2);
    justify-content: flex-end;
  }

  .delete-cancel-btn {
    padding: 0.75rem 1.5rem;
    border: 2px solid rgba(139, 115, 85, 0.4);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.8);
    color: #4a3728;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.2s ease;
  }

  .delete-cancel-btn:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(139, 115, 85, 0.6);
    transform: translateY(-1px);
  }

  .delete-confirm-btn {
    padding: 0.75rem 1.5rem;
    border: 2px solid #dc2626;
    border-radius: 10px;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    color: white;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
  }

  .delete-confirm-btn:hover {
    background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  }

  .entry-actions-left,
  .entry-actions-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .private-btn {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 6px;
    transition: all 0.2s ease;
    opacity: 0.7;
  }

  .private-btn:hover {
    opacity: 1;
    background: rgba(139, 115, 85, 0.1);
  }

  .private-btn.private {
    opacity: 1;
    color: #dc2626;
  }

  .context-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
    background: transparent;
  }

  .context-menu {
    position: fixed;
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    padding: 0.5rem;
    z-index: 2001;
    min-width: 200px;
  }

  .context-menu-item {
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: #4a3728;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    text-align: left;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .context-menu-item:hover {
    background: rgba(139, 115, 85, 0.1);
  }
</style>
