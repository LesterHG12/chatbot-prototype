<script>
  import { DiaryStore } from '../diary/DiaryStore.js';
  import { onMount } from 'svelte';

  const diaryStore = new DiaryStore();
  
  let showMoodTracker = false;
  let selectedMood = null;
  let stressLevel = 5;
  let lonelinessLevel = 5;
  let homesicknessLevel = 5;
  let quickNotes = '';

  const moods = [
    { emoji: '😊', label: 'Happy', value: 'happy' },
    { emoji: '😌', label: 'Calm', value: 'calm' },
    { emoji: '😢', label: 'Sad', value: 'sad' },
    { emoji: '😰', label: 'Anxious', value: 'anxious' },
    { emoji: '😔', label: 'Lonely', value: 'lonely' },
    { emoji: '😴', label: 'Tired', value: 'tired' },
    { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
    { emoji: '❤️', label: 'Loved', value: 'loved' }
  ];

  onMount(() => {
    loadTodayMood();
    checkIfShouldShowMoodTracker();
  });

  function loadTodayMood() {
    if (typeof window === 'undefined') return;
    const today = diaryStore.formatDate();
    try {
      const stored = localStorage.getItem(`mood_${today}`);
      if (stored) {
        const mood = JSON.parse(stored);
        selectedMood = mood.mood;
        stressLevel = mood.stressLevel || 5;
        lonelinessLevel = mood.lonelinessLevel || 5;
        homesicknessLevel = mood.homesicknessLevel || 5;
        quickNotes = mood.notes || '';
      }
    } catch (err) {
      console.error('Error loading mood:', err);
    }
  }

  function checkIfShouldShowMoodTracker() {
    const today = diaryStore.formatDate();
    const lastShown = localStorage.getItem('last_mood_check');
    const userPreference = localStorage.getItem('mood_tracker_preference');
    
    // Only auto-show if user hasn't disabled it and it's a new day
    if (userPreference !== 'disabled' && lastShown !== today) {
      // Show mood tracker if it's a new day (but not blocking - user can skip)
      showMoodTracker = true;
    }
  }

  function saveMood() {
    if (!selectedMood) return;
    
    const today = diaryStore.formatDate();
    const moodData = {
      mood: selectedMood,
      stressLevel,
      lonelinessLevel,
      homesicknessLevel,
      notes: quickNotes,
      timestamp: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(`mood_${today}`, JSON.stringify(moodData));
      localStorage.setItem('last_mood_check', today);
      // Also save mood to diary metadata
      diaryStore.setMood(today, selectedMood);
      showMoodTracker = false;
      
      // Dispatch event to update diary page
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('moodSaved', { 
          detail: { date: today, mood: selectedMood } 
        }));
      }
    } catch (err) {
      console.error('Error saving mood:', err);
    }
  }

  function skipMoodCheck() {
    const today = diaryStore.formatDate();
    localStorage.setItem('last_mood_check', today);
    showMoodTracker = false;
    // Don't disable permanently, just skip for today
  }

  export function toggleMoodTracker() {
    showMoodTracker = !showMoodTracker;
  }

  export let showMoodTrackerProp = false;
  $: if (showMoodTrackerProp !== undefined) {
    showMoodTracker = showMoodTrackerProp;
  }
</script>

{#if showMoodTracker}
  <div class="mood-tracker-overlay">
    <div class="mood-tracker-card">
      <div class="mood-header">
        <h2>How are you feeling today? 💙</h2>
        <button class="close-btn" on:click={skipMoodCheck}>×</button>
      </div>
      
      <div class="mood-selector">
        <p class="mood-prompt">Select your mood:</p>
        <div class="mood-grid">
          {#each moods as mood}
            <button
              class="mood-btn"
              class:selected={selectedMood === mood.value}
              on:click={() => selectedMood = mood.value}
            >
              <span class="mood-emoji">{mood.emoji}</span>
              <span class="mood-label">{mood.label}</span>
            </button>
          {/each}
        </div>
      </div>

      {#if selectedMood}
        <div class="level-trackers">
          <div class="level-tracker">
            <div class="tracker-header">
              <label>Stress Level: {stressLevel}/10</label>
              <span class="tracker-hint" title="Daily stress - changes day to day based on immediate pressures, deadlines, or daily challenges">📅 Daily</span>
            </div>
            <div class="tracker-explanation">Changes day-to-day based on immediate pressures</div>
            <input type="range" min="1" max="10" bind:value={stressLevel} class="slider" />
          </div>
          
          <div class="level-tracker">
            <div class="tracker-header">
              <label>Loneliness: {lonelinessLevel}/10</label>
              <span class="tracker-hint" title="Longer-term feeling - may change over weeks or months, not daily">📆 Long-term</span>
            </div>
            <div class="tracker-explanation">Longer-term feeling that changes over weeks</div>
            <input type="range" min="1" max="10" bind:value={lonelinessLevel} class="slider" />
          </div>
          
          <div class="level-tracker">
            <div class="tracker-header">
              <label>Homesickness: {homesicknessLevel}/10</label>
              <span class="tracker-hint" title="Longer-term feeling - may change over weeks or months, not daily">📆 Long-term</span>
            </div>
            <div class="tracker-explanation">Longer-term feeling that changes over weeks</div>
            <input type="range" min="1" max="10" bind:value={homesicknessLevel} class="slider" />
          </div>
        </div>

        <div class="quick-notes">
          <label>Quick notes (optional):</label>
          <textarea
            bind:value={quickNotes}
            placeholder="What's on your mind today?"
            class="notes-input"
          ></textarea>
        </div>

        <div class="mood-actions">
          <button class="save-btn" on:click={saveMood}>Save & Continue</button>
          <button class="skip-btn" on:click={skipMoodCheck}>Skip for now</button>
        </div>
        <div class="mood-footer">
          <label class="disable-checkbox">
            <input type="checkbox" on:change={(e) => {
              if (e.target.checked) {
                localStorage.setItem('mood_tracker_preference', 'disabled');
              } else {
                localStorage.removeItem('mood_tracker_preference');
              }
            }} />
            <span>Don't show this daily reminder</span>
          </label>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .mood-tracker-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .mood-tracker-card {
    background: linear-gradient(135deg, #fff9f0 0%, #fff5e6 100%);
    border-radius: 20px;
    padding: 2rem;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(139, 115, 85, 0.2);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .mood-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
  }

  .mood-header h2 {
    margin: 0;
    color: #4a3728;
    font-family: 'Georgia', serif;
    font-size: 1.5rem;
  }

  .close-btn {
    background: transparent;
    border: none;
    font-size: 2rem;
    color: #6b5743;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    transition: background 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(107, 87, 67, 0.1);
  }

  .mood-prompt {
    margin: 0 0 1rem 0;
    color: #4a3728;
    font-size: 1rem;
    font-weight: 500;
  }

  .mood-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .mood-btn {
    background: white;
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 12px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .mood-btn:hover {
    border-color: rgba(139, 115, 85, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .mood-btn.selected {
    background: rgba(139, 115, 85, 0.1);
    border-color: #8b7355;
    border-width: 3px;
  }

  .mood-emoji {
    font-size: 2rem;
  }

  .mood-label {
    font-size: 0.85rem;
    color: #4a3728;
    font-weight: 500;
  }

  .level-trackers {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 12px;
  }

  .level-tracker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .level-tracker label {
    color: #4a3728;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .tracker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .tracker-hint {
    font-size: 0.75rem;
    color: #6b5743;
    opacity: 0.7;
    font-weight: 500;
  }

  .tracker-explanation {
    font-size: 0.8rem;
    color: #6b5743;
    opacity: 0.8;
    font-style: italic;
    margin-bottom: 0.5rem;
  }

  .mood-footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(139, 115, 85, 0.2);
  }

  .disable-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #6b5743;
    cursor: pointer;
  }

  .disable-checkbox input[type="checkbox"] {
    cursor: pointer;
  }

  .slider {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: rgba(139, 115, 85, 0.2);
    outline: none;
    -webkit-appearance: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #8b7355;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #8b7355;
    cursor: pointer;
    border: none;
  }

  .quick-notes {
    margin-bottom: 1.5rem;
  }

  .quick-notes label {
    display: block;
    color: #4a3728;
    font-weight: 600;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
  }

  .notes-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 8px;
    background: white;
    font-family: inherit;
    font-size: 0.95rem;
    min-height: 80px;
    resize: vertical;
  }

  .notes-input:focus {
    outline: none;
    border-color: #8b7355;
  }

  .mood-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .save-btn, .skip-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .save-btn {
    background: linear-gradient(135deg, #8b7355 0%, #6b5743 100%);
    color: white;
    flex: 1;
  }

  .save-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(107, 87, 67, 0.3);
  }

  .skip-btn {
    background: transparent;
    color: #6b5743;
    border: 2px solid rgba(139, 115, 85, 0.3);
  }

  .skip-btn:hover {
    background: rgba(139, 115, 85, 0.1);
    border-color: rgba(139, 115, 85, 0.5);
  }

  @media (max-width: 640px) {
    .mood-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .mood-tracker-card {
      padding: 1.5rem;
    }
  }
</style>

