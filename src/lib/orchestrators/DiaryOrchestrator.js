import { geminiGenerate } from '../gemini.js';
import { ReflectionAgent } from '../agents/ReflectionAgent.js';
import { ValidatorAgent } from '../agents/ValidatorAgent.js';
import { ConflictAgent } from '../agents/ConflictAgent.js';

const SELECTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    agent: { type: 'STRING' },
    reasons: { type: 'STRING' }
  },
  required: ['agent']
};

export class DiaryOrchestrator {
  constructor() {
    this.name = 'diary_orchestrator';
    this.agentByName = {
      reflection: new ReflectionAgent(),
      validator: new ValidatorAgent(),
      conflict: new ConflictAgent()
    };
  }

  async _respondWith(agentName, contents) {
    const agent = this.agentByName[agentName] || this.agentByName.reflection;
    const res = await agent.respond(contents);
    return res?.text || '';
  }

  async orchestrate(contents, mode, metrics) {
    const orchestratorPrompt = `Your job is to choose which agent should respond to the user right now based on their needs and emotional state, with special attention to feelings of isolation, homesickness, loneliness, or being far from their support system.

Available agents:
1. "reflection" - For gentle, thought-provoking reflection when the user needs to explore their thoughts and feelings calmly. Especially helpful for feelings of loneliness, homesickness, or isolation. Use when user needs help processing emotions or reflecting on their situation.
2. "validator" - For validation and acknowledgment when the user needs to feel heard and validated. Essential when they're expressing feelings of being alone, missing home, or struggling with distance from loved ones. Use when user needs emotional support and validation of their feelings.
3. "conflict" - For navigating conflicts and relationship issues when the user mentions conflicts, disagreements, or relational problems. Also consider when they're struggling with maintaining connections while far from home. Use when there are interpersonal issues or relationship challenges.

Consider:
- User's current emotional state and sentiment
- Feelings of loneliness, isolation, homesickness (lonelinessLevel, homesicknessLevel from metrics)
- Whether the conversation involves conflicts or relationship issues
- Stress level and overall emotional tone
- If needsSupport is true, prioritize validation and connection encouragement
- Metrics: ${JSON.stringify(metrics)}

    Decision rules (in priority order):
    1. SAFETY FIRST: If safetyConcern is present (selfHarm, harmOthers, crisis) → prioritize "validator" to provide immediate validation AND safety redirection to professional help
    2. If the user mentions conflicts, disagreements, fights, or relational problems → choose "conflict"
    3. If lonelinessLevel >= 7 or homesicknessLevel >= 7 → choose "validator" to provide validation and support
    4. If stressLevel >= 8 → choose "validator" to provide immediate emotional support
    5. If sentiment is "negative" and stressLevel >= 6 → choose "validator"
    6. If needsSupport is true → choose "validator" or "conflict" (depending on context)
    7. If the user is asking reflective questions or exploring emotions → choose "reflection"
    8. Default to "reflection" for general emotional processing and exploration

Always prioritize the user's immediate emotional needs. Choose the agent that will provide the most appropriate support right now.

Output strictly as JSON:
{
  "agent": "reflection" | "validator" | "conflict",
  "reasons": "Brief explanation of why this agent was chosen, especially noting any isolation/loneliness/homesickness concerns"
}`;

    const result = await geminiGenerate({
      contents,
      systemPrompt: orchestratorPrompt,
      config: { responseMimeType: 'application/json', responseSchema: SELECTION_SCHEMA }
    });

        let agent = 'reflection'; // Default
        let reasons = 'Defaulted to reflection mode for general support';

        // Auto-mode: Orchestrator decides based on metrics and conversation
        if (mode === 'auto' || !mode) {
          // Priority 1: Safety concerns - always route to validator for immediate support
          if (metrics?.safetyConcern) {
            agent = 'validator';
            reasons = `Safety concern detected (${metrics.safetyConcern}) - providing immediate validation and redirecting to professional support`;
          }
          // Priority 2: Conflict detection
          else if (metrics?.hasConflict) {
            agent = 'conflict';
            reasons = 'Conflict detected - routing to conflict navigation agent';
          }
          // Priority 2: High loneliness/homesickness
          else if ((metrics?.lonelinessLevel >= 7 || metrics?.homesicknessLevel >= 7)) {
            agent = 'validator';
            reasons = 'High isolation detected - providing validation and support';
          }
          // Priority 3: High stress
          else if (metrics?.stressLevel >= 8) {
            agent = 'validator';
            reasons = 'High stress detected - providing immediate emotional support';
          }
          // Priority 4: Negative sentiment + moderate-high stress
          else if (metrics?.sentiment === 'negative' && metrics?.stressLevel >= 6) {
            agent = 'validator';
            reasons = 'Negative sentiment detected - providing validation';
          }
          // Priority 5: Needs support flag
          else if (metrics?.needsSupport) {
            agent = 'validator';
            reasons = 'Additional support needed - providing validation';
          }
          // Otherwise, try to parse AI decision or default to reflection
          else {
            try {
              const parsed = JSON.parse(result.text || '{}');
              const selectedAgent = parsed?.agent?.toLowerCase();
              if (selectedAgent && ['reflection', 'validator', 'conflict'].includes(selectedAgent)) {
                agent = selectedAgent;
                reasons = parsed?.reasons || `Selected ${selectedAgent} based on conversation analysis`;
              }
            } catch (err) {
              console.error('Orchestrator parsing error:', err);
              // Default to reflection if parsing fails
            }
          }
        } else {
          // Legacy mode selection (for backward compatibility, though not used now)
          agent = mode;
          reasons = `Using ${mode} mode`;
        }

    const text = await this._respondWith(agent, contents);

    const frameSet = { 
      frames: { 
        persona: { value: agent, rationale: [reasons] },
        mode: { value: mode },
        metrics: metrics
      } 
    };
    
    return { assistantMessage: text || '', frameSet, agent, reasons };
  }
}

