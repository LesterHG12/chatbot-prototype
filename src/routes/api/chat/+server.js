import { json } from '@sveltejs/kit';
import { DiaryOrchestrator } from '$lib/orchestrators/DiaryOrchestrator.js';
import { MetricsCollectorServer } from '$lib/metrics/MetricsCollectorServer.js';

/**
 * Handle chat POST requests for the diary chatbot system.
 * 
 * Expected request body:
 * {
 *   history: Array<{role: 'user'|'assistant', content: string}>,
 *   mode: 'reflection'|'validator',
 *   diaryContext: string (optional)
 * }
 * 
 * Returns:
 * {
 *   assistantMessage: string,
 *   replierInput: {
 *     frameSet: object,
 *     agent: string,
 *     reasons: string,
 *     metrics: object
 *   }
 * }
 */
export async function POST({ request }) {
  const body = await request.json();
  const { history, diaryContext = '' } = body || {};
  // Mode is determined automatically by orchestrator based on metrics

  if (!Array.isArray(history)) {
    return json({ error: 'history array is required' }, { status: 400 });
  }

  try {
    // Build contents array for Gemini API
    const contents = [];
    
    // Add diary context as system context if available
    // This helps the AI understand the user's ongoing emotional journey
    if (diaryContext) {
      contents.push({
        role: 'user',
        parts: [{ text: `Context from the user's diary entries (to help you understand their ongoing emotional journey and provide more personalized support):\n\n${diaryContext}\n\n---\n\nBased on the above context, continue the conversation with understanding and empathy, especially if the user seems isolated, homesick, or far from their support system:` }]
      });
    }

    // Add conversation history
    history.forEach((msg) => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    });

        // Collect comprehensive metrics (server-side AI analysis)
        const metricsCollectorServer = new MetricsCollectorServer();
        // Use 'auto' mode to let orchestrator decide
        const metrics = await metricsCollectorServer.collectMetrics(contents, 'auto');
        
        // Safety check: detect potential safety concerns
        const lastUserMessage = contents[contents.length - 1]?.parts?.[0]?.text || '';
        const safetyKeywords = {
          selfHarm: ['suicide', 'kill myself', 'end it', 'want to die', 'hurt myself', 'cut myself', 'self harm'],
          harmOthers: ['hurt them', 'kill them', 'attack', 'violence', 'abuse', 'threat'],
          crisis: ['can\'t go on', 'give up', 'no point', 'hopeless', 'no way out']
        };
        
        let safetyConcern = null;
        const lowerMessage = lastUserMessage.toLowerCase();
        for (const [type, keywords] of Object.entries(safetyKeywords)) {
          if (keywords.some(keyword => lowerMessage.includes(keyword))) {
            safetyConcern = type;
            break;
          }
        }
        
        // If metrics indicate high loneliness, homesickness, or isolation, ensure connection is encouraged
        if ((metrics.lonelinessLevel >= 7 || metrics.homesicknessLevel >= 7) && !metrics.encouragesConnection) {
          // This will influence the orchestrator/agents to encourage connection
          metrics.needsSupport = true;
        }
        
        // Add safety concern to metrics
        if (safetyConcern) {
          metrics.safetyConcern = safetyConcern;
          metrics.needsSupport = true;
        }
    
    // Note: Metrics will be saved client-side when the response is received

    // Orchestrate and get response - orchestrator determines mode automatically
    const orchestrator = new DiaryOrchestrator();
    const { assistantMessage, frameSet, agent, reasons } = await orchestrator.orchestrate(
      contents,
      'auto', // Let orchestrator decide based on metrics
      metrics
    );

    // Update metrics with agent selection info
    const updatedMetrics = {
      ...metrics,
      selectedAgent: agent,
      agentReasons: reasons
    };

    return json({
      assistantMessage,
      replierInput: {
        frameSet,
        contextCount: history.length,
        agent,
        reasons,
        metrics: updatedMetrics
      }
    });
  } catch (err) {
    const msg = String(err?.message || err || '').toLowerCase();
    if (msg.includes('gemini_api_key') || msg.includes('gemini') || msg.includes('api key')) {
      return json({ error: 'Gemini API key not found' }, { status: 400 });
    }
    console.error('Chat API error:', err);
    return json({ error: 'Pipeline error', details: String(err?.message || err) }, { status: 500 });
  }
}

