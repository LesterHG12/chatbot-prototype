// Server-side metrics collection with AI analysis
// This file should ONLY be imported in server-side code (API routes)

import { geminiGenerate } from '../gemini.js';

const METRICS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sentiment: { type: 'STRING' },
    stressLevel: { type: 'NUMBER' },
    lonelinessLevel: { type: 'NUMBER' },
    homesicknessLevel: { type: 'NUMBER' },
    hasConflict: { type: 'BOOLEAN' },
    exploresRole: { type: 'BOOLEAN' },
    encouragesConnection: { type: 'BOOLEAN' },
    overallTone: { type: 'STRING' },
    emotionalKeywords: { type: 'ARRAY', items: { type: 'STRING' } },
    needsSupport: { type: 'BOOLEAN' },
    safetyConcern: { type: 'STRING' } // 'selfHarm', 'harmOthers', 'crisis', or null
  },
  required: ['sentiment', 'stressLevel', 'hasConflict']
};

export class MetricsCollectorServer {
  async collectMetrics(contents, mode) {
    const systemPrompt = `Analyze the conversation and extract comprehensive metrics about the user's emotional state, especially focusing on feelings of isolation, homesickness, loneliness, and stress.

Extract the following:
- sentiment: "positive", "neutral", or "negative" based on the user's overall emotional tone
- stressLevel: A number between 1-10 representing the user's stress level (1 = very low stress, 10 = very high stress)
- lonelinessLevel: A number between 1-10 representing feelings of loneliness or isolation (1 = not lonely, 10 = very lonely)
- homesicknessLevel: A number between 1-10 representing feelings of missing home or being away from family (1 = not homesick, 10 = very homesick)
- hasConflict: true if the user mentions conflicts, disagreements, or relational problems
- exploresRole: true if the conversation explores the user's role in a conflict or relationship dynamic
- encouragesConnection: true if the assistant response encourages reaching out to friends/family/partners
- overallTone: A brief description of the conversation tone (e.g., "sad and lonely", "anxious about exams", "missing family")
- emotionalKeywords: Array of key emotional words/phrases mentioned (e.g., ["lonely", "homesick", "stressed", "anxious"])
- needsSupport: true if the user seems to need additional emotional support or connection
- safetyConcern: "selfHarm" if the user mentions self-harm or suicidal thoughts, "harmOthers" if they mention harming others, "crisis" if they express hopelessness or inability to continue, or null if no safety concerns

IMPORTANT: Pay careful attention to safety concerns. Look for:
- Self-harm or suicidal ideation (mentions of hurting self, ending life, suicide, etc.)
- Thoughts of harming others (violence, threats, abuse)
- Crisis situations (hopelessness, wanting to give up, no way out)

Focus on identifying signs of:
- Isolation or loneliness
- Homesickness or missing family/home
- Academic stress
- Relationship difficulties
- Overall emotional well-being
- Safety concerns that require immediate professional support

Pay special attention to language that indicates the user is far from their support system.`;

    try {
      const result = await geminiGenerate({
        contents,
        systemPrompt,
        config: { responseMimeType: 'application/json', responseSchema: METRICS_SCHEMA }
      });

      const parsed = JSON.parse(result.text || '{}');
      
      // Check for safety concerns in the text
      const lastMessage = contents[contents.length - 1]?.parts?.[0]?.text || '';
      const lowerMessage = lastMessage.toLowerCase();
      
      let safetyConcern = parsed.safetyConcern || null;
      if (!safetyConcern) {
        // Fallback check if AI didn't catch it
        if (['suicide', 'kill myself', 'end it', 'want to die', 'hurt myself', 'cut myself', 'self harm'].some(k => lowerMessage.includes(k))) {
          safetyConcern = 'selfHarm';
        } else if (['hurt them', 'kill them', 'attack', 'violence', 'abuse', 'threat'].some(k => lowerMessage.includes(k))) {
          safetyConcern = 'harmOthers';
        } else if (['can\'t go on', 'give up', 'no point', 'hopeless', 'no way out'].some(k => lowerMessage.includes(k))) {
          safetyConcern = 'crisis';
        }
      }
      
      const metrics = {
        sentiment: parsed.sentiment || 'neutral',
        stressLevel: parsed.stressLevel || 5,
        lonelinessLevel: parsed.lonelinessLevel || 5,
        homesicknessLevel: parsed.homesicknessLevel || 5,
        hasConflict: parsed.hasConflict || false,
        exploresRole: parsed.exploresRole || false,
        encouragesConnection: parsed.encouragesConnection || false,
        overallTone: parsed.overallTone || '',
        emotionalKeywords: parsed.emotionalKeywords || [],
        needsSupport: parsed.needsSupport || false,
        safetyConcern: safetyConcern,
        mode: mode,
        timestamp: new Date().toISOString()
      };

      return metrics;
    } catch (err) {
      console.error('Metrics collection error:', err);
      return {
        sentiment: 'neutral',
        stressLevel: 5,
        lonelinessLevel: 5,
        homesicknessLevel: 5,
        hasConflict: false,
        exploresRole: false,
        encouragesConnection: false,
        overallTone: '',
          emotionalKeywords: [],
          needsSupport: false,
          safetyConcern: null,
          mode: mode,
          timestamp: new Date().toISOString()
        };
    }
  }
}

