// Client-side metrics storage and retrieval
// Note: collectMetrics with AI analysis is in MetricsCollectorServer.js (server-only)

export class MetricsCollector {
  constructor() {
    this.storageKey = 'diary_metrics_history';
  }

  saveMetricsHistory(metrics) {
    if (typeof window === 'undefined') return;
    
    try {
      const history = this.getMetricsHistory();
      history.push(metrics);
      
      // Keep only last 100 entries
      const recentHistory = history.slice(-100);
      localStorage.setItem(this.storageKey, JSON.stringify(recentHistory));
    } catch (err) {
      console.error('Error saving metrics history:', err);
    }
  }

  getMetricsHistory() {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error reading metrics history:', err);
      return [];
    }
  }

  getRecentMetrics(days = 7) {
    const history = this.getMetricsHistory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return history.filter(m => new Date(m.timestamp) >= cutoffDate);
  }

  getAverageStressLevel(days = 7) {
    const recent = this.getRecentMetrics(days);
    if (recent.length === 0) return 5;
    
    const sum = recent.reduce((acc, m) => acc + (m.stressLevel || 5), 0);
    return sum / recent.length;
  }

  getAverageLonelinessLevel(days = 7) {
    const recent = this.getRecentMetrics(days);
    if (recent.length === 0) return 5;
    
    const sum = recent.reduce((acc, m) => acc + (m.lonelinessLevel || 5), 0);
    return sum / recent.length;
  }

  getSentimentTrend(days = 7) {
    const recent = this.getRecentMetrics(days);
    if (recent.length < 2) return 'stable';
    
    const positiveCount = recent.filter(m => m.sentiment === 'positive').length;
    const negativeCount = recent.filter(m => m.sentiment === 'negative').length;
    const earlyPositive = recent.slice(0, Math.floor(recent.length / 2)).filter(m => m.sentiment === 'positive').length;
    const latePositive = recent.slice(Math.floor(recent.length / 2)).filter(m => m.sentiment === 'positive').length;
    
    if (latePositive > earlyPositive) return 'improving';
    if (latePositive < earlyPositive) return 'declining';
    return 'stable';
  }

  trackSentimentShift(history) {
    // Simple sentiment tracking - checks if conversation shifted positively
    const recentMessages = history.slice(-4);
    const positiveIndicators = ['better', 'good', 'relieved', 'calm', 'thanks', 'helpful', 'understand', 'grateful', 'appreciate'];
    const negativeIndicators = ['bad', 'worst', 'awful', 'terrible', 'stressed', 'anxious', 'angry', 'lonely', 'homesick', 'miss'];
    
    const lastMessage = recentMessages[recentMessages.length - 1]?.content?.toLowerCase() || '';
    const hasPositiveShift = positiveIndicators.some(indicator => lastMessage.includes(indicator));
    
    return hasPositiveShift;
  }

  getEmotionalInsights() {
    const recent = this.getRecentMetrics(7);
    if (recent.length === 0) return null;

    const avgStress = this.getAverageStressLevel(7);
    const avgLoneliness = this.getAverageLonelinessLevel(7);
    const sentimentTrend = this.getSentimentTrend(7);
    const connectionEncouragements = recent.filter(m => m.encouragesConnection).length;

    return {
      avgStress: Math.round(avgStress * 10) / 10,
      avgLoneliness: Math.round(avgLoneliness * 10) / 10,
      sentimentTrend,
      connectionEncouragements,
      totalInteractions: recent.length
    };
  }
}
