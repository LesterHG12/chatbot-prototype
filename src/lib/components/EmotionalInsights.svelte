<script>
  import { MetricsCollector } from '../metrics/MetricsCollector.js';
  import { onMount } from 'svelte';

  let insights = null;
  const metricsCollector = new MetricsCollector();

  onMount(() => {
    updateInsights();
  });

  function updateInsights() {
    insights = metricsCollector.getEmotionalInsights();
    
    // Add feedback statistics
    if (typeof window !== 'undefined') {
      try {
        const feedbackHistory = JSON.parse(localStorage.getItem('response_feedback') || '[]');
        const helpfulCount = feedbackHistory.filter(f => f.helpful === true).length;
        const notHelpfulCount = feedbackHistory.filter(f => f.helpful === false).length;
        const totalFeedback = helpfulCount + notHelpfulCount;
        
        insights.feedbackStats = {
          helpful: helpfulCount,
          notHelpful: notHelpfulCount,
          total: totalFeedback,
          helpfulRate: totalFeedback > 0 ? Math.round((helpfulCount / totalFeedback) * 100) : 0
        };
      } catch (err) {
        console.error('Error loading feedback stats:', err);
      }
    }
  }

  export function refresh() {
    updateInsights();
  }

  function getSentimentTrendIcon(trend) {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  }

  function getSentimentTrendColor(trend) {
    if (trend === 'improving') return '#22c55e';
    if (trend === 'declining') return '#ef4444';
    return '#6b7280';
  }

  function getLevelColor(level) {
    if (level <= 3) return '#22c55e';
    if (level <= 5) return '#eab308';
    if (level <= 7) return '#f97316';
    return '#ef4444';
  }
</script>

{#if insights}
  <div class="insights-card">
    <div class="insights-header">
      <h3>Your Emotional Journey 💙</h3>
      <button class="refresh-btn" on:click={updateInsights} title="Refresh">🔄</button>
    </div>

    <div class="insights-grid">
      <div class="insight-item">
        <div class="insight-label">Average Stress (7 days)</div>
        <div class="insight-value" style="color: {getLevelColor(insights.avgStress)}">
          {insights.avgStress}/10
        </div>
        <div class="insight-bar">
          <div 
            class="insight-bar-fill" 
            style="width: {insights.avgStress * 10}%; background: {getLevelColor(insights.avgStress)}"
          ></div>
        </div>
      </div>

      <div class="insight-item">
        <div class="insight-label">Average Loneliness (7 days)</div>
        <div class="insight-value" style="color: {getLevelColor(insights.avgLoneliness)}">
          {insights.avgLoneliness}/10
        </div>
        <div class="insight-bar">
          <div 
            class="insight-bar-fill" 
            style="width: {insights.avgLoneliness * 10}%; background: {getLevelColor(insights.avgLoneliness)}"
          ></div>
        </div>
      </div>

      <div class="insight-item">
        <div class="insight-label">Sentiment Trend</div>
        <div class="insight-value" style="color: {getSentimentTrendColor(insights.sentimentTrend)}">
          {getSentimentTrendIcon(insights.sentimentTrend)} {insights.sentimentTrend}
        </div>
      </div>

      <div class="insight-item">
        <div class="insight-label">Connection Reminders</div>
        <div class="insight-value">
          {insights.connectionEncouragements} times this week
        </div>
        <div class="insight-note">
          {#if insights.connectionEncouragements > 0}
            Great job! Keep reaching out to friends and family.
          {:else}
            Remember: reaching out to loved ones can help when you're feeling isolated.
          {/if}
        </div>
      </div>

      {#if insights.feedbackStats && insights.feedbackStats.total > 0}
        <div class="insight-item">
          <div class="insight-label">Response Helpfulness</div>
          <div class="insight-value" style="color: {insights.feedbackStats.helpfulRate >= 70 ? '#22c55e' : insights.feedbackStats.helpfulRate >= 50 ? '#eab308' : '#ef4444'}">
            {insights.feedbackStats.helpfulRate}% helpful
          </div>
          <div class="insight-note">
            {insights.feedbackStats.helpful} helpful, {insights.feedbackStats.notHelpful} not helpful
          </div>
        </div>
      {/if}
    </div>

    <div class="insights-footer">
      <p class="support-message">
        💬 You've had {insights.totalInteractions} conversation{insights.totalInteractions !== 1 ? 's' : ''} this week. 
        Keep taking care of yourself!
      </p>
    </div>
  </div>
{/if}

<style>
  .insights-card {
    background: linear-gradient(135deg, #fff9f0 0%, #fff5e6 100%);
    border-radius: 16px;
    padding: 1.5rem;
    border: 2px solid rgba(139, 115, 85, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
  }

  .insights-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid rgba(139, 115, 85, 0.2);
  }

  .insights-header h3 {
    margin: 0;
    color: #4a3728;
    font-family: 'Georgia', serif;
    font-size: 1.25rem;
  }

  .refresh-btn {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    transition: background 0.2s ease;
  }

  .refresh-btn:hover {
    background: rgba(139, 115, 85, 0.1);
  }

  .insights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1rem;
  }

  .insight-item {
    background: rgba(255, 255, 255, 0.6);
    padding: 1rem;
    border-radius: 12px;
    border: 1px solid rgba(139, 115, 85, 0.1);
  }

  .insight-label {
    font-size: 0.85rem;
    color: #6b5743;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .insight-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #4a3728;
    margin-bottom: 0.5rem;
  }

  .insight-bar {
    width: 100%;
    height: 8px;
    background: rgba(139, 115, 85, 0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.5rem;
  }

  .insight-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .insight-note {
    font-size: 0.85rem;
    color: #6b5743;
    margin-top: 0.5rem;
    font-style: italic;
  }

  .insights-footer {
    padding-top: 1rem;
    border-top: 1px solid rgba(139, 115, 85, 0.2);
    margin-top: 1rem;
  }

  .support-message {
    margin: 0;
    color: #4a3728;
    font-size: 0.95rem;
    text-align: center;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .insights-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

