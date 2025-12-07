import { geminiGenerate } from '../gemini.js';

export class ResponseAggregator {
  constructor() {
    this.name = 'response_aggregator';
  }

  /**
   * Synthesize multiple agent responses into a single, more nuanced response
   * This allows the system to combine perspectives from different agents
   */
  async aggregate(responses, contents, metrics) {
    if (!responses || responses.length === 0) {
      return null;
    }

    // If only one response, return it
    if (responses.length === 1) {
      return responses[0];
    }

    const systemPrompt = `You are synthesizing multiple therapeutic responses into a single, more nuanced and helpful response. 

The responses come from different agents with different approaches:
- Reflection agent: Focuses on gentle exploration and thought-provoking questions
- Validator agent: Focuses on validation and acknowledgment
- Conflict agent: Focuses on relationship dynamics and conflict navigation

Your job is to:
1. Identify the best elements from each response
2. Combine them into a single, coherent response that feels natural
3. Ensure the response asks 1-2 thoughtful follow-up questions (like a therapist would)
4. Use shorter sentences for better readability
5. Maintain the humane, non-fixing tone - guide users to share with real people
6. Pay special attention to feelings of isolation, homesickness, or loneliness

The user's emotional state: ${JSON.stringify(metrics)}

Combine these responses into one that feels more complete and nuanced:
${responses.map((r, i) => `Response ${i + 1}:\n${r}`).join('\n\n---\n\n')}

Create a synthesized response that:
- Acknowledges what the user shared
- Asks 1-2 specific follow-up questions
- Uses shorter, more digestible sentences
- Feels natural and not like it's trying to be multiple things at once
- Guides them toward real-world connections (friends, family, counselors)
- Never positions you as the one helping - you're preparing them to get help from others`;

    try {
      const result = await geminiGenerate({
        contents: [
          ...contents,
          {
            role: 'user',
            parts: [{ text: 'Please synthesize the above responses into a single, more nuanced response.' }]
          }
        ],
        systemPrompt
      });

      return result.text || responses[0]; // Fallback to first response if synthesis fails
    } catch (err) {
      console.error('Aggregation error:', err);
      // Return the first response as fallback
      return responses[0];
    }
  }
}

