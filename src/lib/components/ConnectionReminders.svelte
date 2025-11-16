<script>
  import { onMount } from 'svelte';
  import { DiaryStore } from '../diary/DiaryStore.js';

  const diaryStore = new DiaryStore();
  
  let reminders = [];
  let showAddReminder = false;
  let newReminderName = '';
  let newReminderType = 'friend';
  let lastContactDate = '';

  const reminderTypes = [
    { value: 'friend', label: 'Friend', emoji: '👫' },
    { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { value: 'partner', label: 'Partner', emoji: '💑' },
    { value: 'mentor', label: 'Mentor', emoji: '🧑‍🏫' }
  ];

  onMount(() => {
    loadReminders();
  });

  function loadReminders() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('connection_reminders');
      if (stored) {
        reminders = JSON.parse(stored);
      } else {
        // Default reminders
        reminders = [
          { id: 1, name: 'Mom', type: 'family', emoji: '👩', daysSince: 0, lastContact: null },
          { id: 2, name: 'Best Friend', type: 'friend', emoji: '👫', daysSince: 0, lastContact: null }
        ];
        saveReminders();
      }
    } catch (err) {
      console.error('Error loading reminders:', err);
      reminders = [];
    }
  }

  function saveReminders() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('connection_reminders', JSON.stringify(reminders));
    } catch (err) {
      console.error('Error saving reminders:', err);
    }
  }

  function updateLastContact(reminder) {
    const today = diaryStore.formatDate();
    reminder.lastContact = today;
    reminder.daysSince = 0;
    saveReminders();
    reminders = [...reminders];
  }

  function addReminder() {
    if (!newReminderName.trim()) return;
    
    const typeInfo = reminderTypes.find(t => t.value === newReminderType);
    const newReminder = {
      id: Date.now(),
      name: newReminderName,
      type: newReminderType,
      emoji: typeInfo?.emoji || '👤',
      daysSince: lastContactDate ? calculateDaysSince(lastContactDate) : 999,
      lastContact: lastContactDate || null
    };
    
    reminders = [...reminders, newReminder];
    saveReminders();
    newReminderName = '';
    lastContactDate = '';
    showAddReminder = false;
  }

  function deleteReminder(id) {
    reminders = reminders.filter(r => r.id !== id);
    saveReminders();
  }

  function calculateDaysSince(dateString) {
    if (!dateString) return 999;
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  function updateDaysSince() {
    reminders = reminders.map(r => ({
      ...r,
      daysSince: r.lastContact ? calculateDaysSince(r.lastContact) : 999
    }));
  }

  function getUrgencyColor(daysSince) {
    if (daysSince <= 3) return '#22c55e';
    if (daysSince <= 7) return '#eab308';
    if (daysSince <= 14) return '#f97316';
    return '#ef4444';
  }

  $: if (reminders.length > 0) {
    updateDaysSince();
  }
</script>

<div class="connection-reminders-card">
  <div class="reminders-header">
    <h3>Stay Connected 💙</h3>
    <button class="add-btn" on:click={() => showAddReminder = !showAddReminder}>+ Add</button>
  </div>

  {#if showAddReminder}
    <div class="add-reminder-form">
      <input
        type="text"
        bind:value={newReminderName}
        placeholder="Name"
        class="reminder-input"
      />
      <select bind:value={newReminderType} class="reminder-select">
        {#each reminderTypes as type}
          <option value={type.value}>{type.emoji} {type.label}</option>
        {/each}
      </select>
      <input
        type="date"
        bind:value={lastContactDate}
        placeholder="Last contact date (optional)"
        class="reminder-input"
      />
      <div class="form-actions">
        <button class="save-btn" on:click={addReminder}>Save</button>
        <button class="cancel-btn" on:click={() => showAddReminder = false}>Cancel</button>
      </div>
    </div>
  {/if}

  <div class="reminders-list">
    {#each reminders as reminder}
      <div class="reminder-item">
        <div class="reminder-info">
          <span class="reminder-emoji">{reminder.emoji}</span>
          <div class="reminder-details">
            <div class="reminder-name">{reminder.name}</div>
            <div class="reminder-status" style="color: {getUrgencyColor(reminder.daysSince)}">
              {#if reminder.daysSince === 0}
                Contacted today! ✨
              {:else if reminder.daysSince <= 7}
                {reminder.daysSince} day{reminder.daysSince !== 1 ? 's' : ''} ago
              {:else}
                Over {reminder.daysSince} days ago - time to reach out!
              {/if}
            </div>
          </div>
        </div>
        <div class="reminder-actions">
          <button 
            class="contact-btn" 
            on:click={() => updateLastContact(reminder)}
            title="Mark as contacted"
          >
            ✓
          </button>
          <button 
            class="delete-btn" 
            on:click={() => deleteReminder(reminder.id)}
            title="Remove"
          >
            ×
          </button>
        </div>
      </div>
    {/each}
    {#if reminders.length === 0}
      <div class="empty-state">
        <p>Add people you want to stay in touch with! 💙</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .connection-reminders-card {
    background: linear-gradient(135deg, #fff9f0 0%, #fff5e6 100%);
    border-radius: 16px;
    padding: 1.5rem;
    border: 2px solid rgba(139, 115, 85, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
  }

  .reminders-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
  }

  .reminders-header h3 {
    margin: 0;
    color: #4a3728;
    font-family: 'Georgia', serif;
    font-size: 1.25rem;
  }

  .add-btn {
    background: linear-gradient(135deg, #8b7355 0%, #6b5743 100%);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .add-btn:hover {
    transform: translateY(-2px);
  }

  .add-reminder-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 12px;
    margin-bottom: 1rem;
  }

  .reminder-input, .reminder-select {
    padding: 0.75rem;
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 8px;
    background: white;
    font-family: inherit;
    font-size: 0.95rem;
  }

  .reminder-input:focus, .reminder-select:focus {
    outline: none;
    border-color: #8b7355;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
  }

  .save-btn, .cancel-btn {
    flex: 1;
    padding: 0.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .save-btn {
    background: #8b7355;
    color: white;
  }

  .save-btn:hover {
    background: #6b5743;
  }

  .cancel-btn {
    background: transparent;
    color: #6b5743;
    border: 2px solid rgba(139, 115, 85, 0.3);
  }

  .cancel-btn:hover {
    background: rgba(139, 115, 85, 0.1);
  }

  .reminders-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .reminder-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 12px;
    border: 1px solid rgba(139, 115, 85, 0.1);
    transition: transform 0.2s ease;
  }

  .reminder-item:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .reminder-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }

  .reminder-emoji {
    font-size: 2rem;
  }

  .reminder-details {
    flex: 1;
  }

  .reminder-name {
    font-weight: 600;
    color: #4a3728;
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  .reminder-status {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .reminder-actions {
    display: flex;
    gap: 0.5rem;
  }

  .contact-btn, .delete-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1.25rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .contact-btn {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .contact-btn:hover {
    background: rgba(34, 197, 94, 0.3);
    transform: scale(1.1);
  }

  .delete-btn {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.3);
    transform: scale(1.1);
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b5743;
    font-style: italic;
  }
</style>

