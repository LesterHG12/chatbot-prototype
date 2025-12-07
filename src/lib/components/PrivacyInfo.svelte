<script>
  let showPrivacyInfo = false;
  let hasSeenPrivacyInfo = false;

  import { onMount } from 'svelte';

  onMount(() => {
    if (typeof window !== 'undefined') {
      hasSeenPrivacyInfo = localStorage.getItem('has_seen_privacy_info') === 'true';
      if (!hasSeenPrivacyInfo) {
        // Show privacy info on first visit
        setTimeout(() => {
          showPrivacyInfo = true;
        }, 2000);
      }
    }
  });

  function dismissPrivacyInfo() {
    showPrivacyInfo = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_seen_privacy_info', 'true');
    }
  }

  function togglePrivacyInfo() {
    showPrivacyInfo = !showPrivacyInfo;
  }
</script>

<button 
  class="privacy-info-btn"
  on:click={togglePrivacyInfo}
  title="Privacy information"
  type="button"
>
  🔒 Privacy
</button>

{#if showPrivacyInfo}
  <div class="privacy-info-modal">
    <div class="privacy-info-content">
      <div class="privacy-header">
        <h3>🔒 Your Privacy Matters</h3>
        <button class="close-privacy" on:click={dismissPrivacyInfo} type="button">×</button>
      </div>
      <div class="privacy-body">
        <div class="privacy-point">
          <strong>✓ Your data stays local</strong>
          <p>All your diary entries and chat conversations are stored locally in your browser. Nothing is sent to external servers except for AI processing (which doesn't store your data).</p>
        </div>
        <div class="privacy-point">
          <strong>✓ Private entries</strong>
          <p>You can mark any diary entry as private (🔒). Private entries are never shared with the chatbot unless you explicitly allow it.</p>
        </div>
        <div class="privacy-point">
          <strong>✓ You're in control</strong>
          <p>You can delete any entry or chat at any time. Your data belongs to you.</p>
        </div>
        <div class="privacy-footer">
          <label class="dont-show-again">
            <input type="checkbox" on:change={(e) => {
              if (e.target.checked) {
                dismissPrivacyInfo();
              }
            }} />
            <span>Don't show this again</span>
          </label>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .privacy-info-btn {
    padding: 0.5rem 1rem;
    border: 2px solid rgba(139, 115, 85, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.7);
    color: #4a3728;
    cursor: pointer;
    font-weight: 550;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .privacy-info-btn:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(139, 115, 85, 0.5);
    transform: translateY(-1px);
  }

  .privacy-info-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 2rem;
  }

  .privacy-info-content {
    background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
    border-radius: 16px;
    border: 2px solid rgba(139, 115, 85, 0.3);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .privacy-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
    background: linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 245, 230, 0.8) 100%);
  }

  .privacy-header h3 {
    margin: 0;
    color: #4a3728;
    font-size: 1.25rem;
    font-weight: 650;
  }

  .close-privacy {
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

  .close-privacy:hover {
    background: rgba(107, 87, 67, 0.1);
  }

  .privacy-body {
    padding: 1.5rem;
  }

  .privacy-point {
    margin-bottom: 1.5rem;
  }

  .privacy-point:last-child {
    margin-bottom: 0;
  }

  .privacy-point strong {
    display: block;
    color: #4a3728;
    font-size: 1rem;
    font-weight: 650;
    margin-bottom: 0.5rem;
  }

  .privacy-point p {
    color: #6b5743;
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
  }

  .privacy-footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(139, 115, 85, 0.2);
  }

  .dont-show-again {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #6b5743;
    cursor: pointer;
  }

  .dont-show-again input[type="checkbox"] {
    cursor: pointer;
  }
</style>

