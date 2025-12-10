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

  getWeight(timestamp, halfLifeDays = 7) {
    const now = Date.now();
    const ts = timestamp ? new Date(timestamp).getTime() : now;
    if (Number.isNaN(ts)) return 1;
    const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
    const decay = Math.pow(0.5, ageDays / halfLifeDays);
    return Math.max(decay, 0.05); // avoid zero weight
  }

  getAverageStressLevel(days = 30) {
    const recent = this.getRecentMetrics(days);
    if (recent.length === 0) return 5;
    
    let weightedSum = 0;
    let weightTotal = 0;
    recent.forEach((m) => {
      const w = this.getWeight(m.timestamp);
      weightedSum += (m.stressLevel ?? 5) * w;
      weightTotal += w;
    });
    return weightTotal > 0 ? weightedSum / weightTotal : 5;
  }

  getAverageLonelinessLevel(days = 30) {
    const recent = this.getRecentMetrics(days);
    if (recent.length === 0) return 5;
    
    let weightedSum = 0;
    let weightTotal = 0;
    recent.forEach((m) => {
      const w = this.getWeight(m.timestamp);
      weightedSum += (m.lonelinessLevel ?? 5) * w;
      weightTotal += w;
    });
    return weightTotal > 0 ? weightedSum / weightTotal : 5;
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
    const recent = this.getRecentMetrics(30);
    if (recent.length === 0) return null;

    const avgStress = this.getAverageStressLevel(30);
    const avgLoneliness = this.getAverageLonelinessLevel(30);
    const sentimentTrend = this.getSentimentTrend(30);
    const connectionEncouragements = recent.filter(m => m.encouragesConnection).length;

    return {
      avgStress: Math.round(avgStress * 10) / 10,
      avgLoneliness: Math.round(avgLoneliness * 10) / 10,
      sentimentTrend,
      connectionEncouragements,
      totalInteractions: recent.length
    };
  }

  getSuggestedPromptCategory() {
    const recent = this.getRecentMetrics(30);
    if (recent.length === 0) return 'daily';

    // Weight by recency
    let stressScore = 0;
    let lonelyScore = 0;
    let homesickScore = 0;
    let negSentiment = 0;
    let weightTotal = 0;

    recent.forEach((m) => {
      const w = this.getWeight(m.timestamp);
      stressScore += (m.stressLevel ?? 5) * w;
      lonelyScore += (m.lonelinessLevel ?? 5) * w;
      homesickScore += (m.homesicknessLevel ?? 5) * w;
      negSentiment += (m.sentiment === 'negative' ? 1 : 0) * w;
      weightTotal += w;
    });

    const stressAvg = weightTotal ? stressScore / weightTotal : 5;
    const lonelyAvg = weightTotal ? lonelyScore / weightTotal : 5;
    const homesickAvg = weightTotal ? homesickScore / weightTotal : 5;
    const negAvg = weightTotal ? negSentiment / weightTotal : 0;

    if (homesickAvg >= 7 || (homesickAvg > lonelyAvg && homesickAvg >= 6)) return 'homesickness';
    if (lonelyAvg >= 7) return 'relationships';
    if (stressAvg >= 7) return 'challenges';
    if (negAvg >= 0.4) return 'reflection';
    return 'daily';
  }
}
