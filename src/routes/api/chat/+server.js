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
// Validate history array format
function validateHistory(history) {
  if (!Array.isArray(history)) {
    return { valid: false, error: 'history must be an array' };
  }
  
  if (history.length === 0) {
    return { valid: false, error: 'history cannot be empty' };
  }
  
  // Check that there's at least one user message
  const hasUserMessage = history.some(msg => msg.role === 'user');
  if (!hasUserMessage) {
    return { valid: false, error: 'history must contain at least one user message' };
  }
  
  // Validate each message
  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: `history[${i}] must be an object` };
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return { valid: false, error: `history[${i}].role must be 'user' or 'assistant'` };
    }
    if (!msg.content || typeof msg.content !== 'string') {
      return { valid: false, error: `history[${i}].content must be a non-empty string` };
    }
    if (msg.content.trim().length === 0) {
      return { valid: false, error: `history[${i}].content cannot be empty` };
    }
  }
  
  return { valid: true };
}

export async function POST({ request }) {
  const body = await request.json();
  const { history, diaryContext = '' } = body || {};
  // Mode is determined automatically by orchestrator based on metrics

  // Validate history
  const historyValidation = validateHistory(history);
  if (!historyValidation.valid) {
    return json({ error: historyValidation.error }, { status: 400 });
  }

  try {
    // Build contents array for Gemini API
    const contents = [];
    
    // Add diary context as system context if available
    // This helps the AI understand the user's ongoing emotional journey
    if (diaryContext && typeof diaryContext === 'string' && diaryContext.trim().length > 0) {
      contents.push({
        role: 'user',
        parts: [{ text: `Context from the user's diary entries (to help you understand their ongoing emotional journey and provide more personalized support):\n\n${diaryContext}\n\n---\n\nBased on the above context, continue the conversation with understanding and empathy, especially if the user seems isolated, homesick, or far from their support system:` }]
      });
    }

    // Add conversation history - filter out any invalid messages
    history.forEach((msg) => {
      // Double-check message is valid before adding
      if (msg && msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content.trim() }]
        });
      }
    });
    
    // Validate contents array is not empty
    if (contents.length === 0) {
      return json({ error: 'No valid messages to process. Please ensure history contains valid messages.' }, { status: 400 });
    }

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
    const errorDetails = err?.message || String(err);
    
    // Log full error for debugging
    console.error('Chat API error:', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      details: errorDetails
    });
    
    // Handle specific error types
    if (msg.includes('gemini_api_key') || msg.includes('gemini') || msg.includes('api key')) {
      return json({ error: 'Gemini API key not found. Please check your environment variables.' }, { status: 400 });
    }
    
    if (msg.includes('invalid') || msg.includes('malformed') || msg.includes('format')) {
      return json({ error: 'Invalid request format', details: errorDetails }, { status: 400 });
    }
    
    if (msg.includes('empty') || msg.includes('required')) {
      return json({ error: 'Missing required data', details: errorDetails }, { status: 400 });
    }
    
    if (msg.includes('rate limit') || msg.includes('quota')) {
      return json({ error: 'API rate limit exceeded. Please try again later.', details: errorDetails }, { status: 429 });
    }
    
    // Generic error with details for debugging
    return json({ 
      error: 'Pipeline error', 
      details: errorDetails,
      hint: 'Check server logs for more information'
    }, { status: 500 });
  }
}

