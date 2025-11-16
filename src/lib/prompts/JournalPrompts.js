// Pre-made journal prompts to help users navigate their emotions and write reflectively
// These prompts guide users to explore their feelings in their diary entries

export const journalPrompts = {
  daily: [
    "Right now, I'm feeling...",
    "Today, something that made me smile was...",
    "One thing I'm grateful for today is...",
    "A challenge I'm facing right now is...",
    "Something on my mind that I want to explore is...",
    "How I took care of myself today...",
    "One thing I learned about myself today...",
    "Something I need to let go of from today...",
    "Someone I connected with today made me feel...",
    "I'm looking forward to..."
  ],
  
  reflection: [
    "I've noticed a pattern in my feelings lately...",
    "I feel most like myself when...",
    "The situations that make me feel stressed are...",
    "When I'm feeling down, I usually...",
    "If a friend came to me with what I'm going through, I'd tell them...",
    "Home means to me...",
    "The relationships that matter most to me are...",
    "I feel connected to others when...",
    "I feel disconnected when...",
    "Being away from home has changed me by..."
  ],
  
  emotional: [
    "The emotions I've been avoiding are...",
    "The last time I cried was...",
    "When I'm anxious, what brings me peace is...",
    "I express joy in my daily life by...",
    "Something that makes me feel proud is...",
    "Feelings of loneliness are triggered by...",
    "I know I'm getting overwhelmed when...",
    "When everything feels chaotic, what grounds me is...",
    "The emotions I wish I could express more openly are...",
    "Since starting college, my emotional landscape has changed because..."
  ],
  
  relationships: [
    "The person I miss most right now is...",
    "Something I wish I could tell someone but haven't...",
    "Since being away, my relationships have changed in that...",
    "What I need from the people in my life is...",
    "Someone who makes me feel truly seen is...",
    "A conflict I've been avoiding is...",
    "I maintain connections when I'm far away by...",
    "The support I wish I had right now is...",
    "I show care to others by...",
    "A boundary I need to set is..."
  ],
  
  challenges: [
    "The biggest challenge I'm facing right now is...",
    "Something that feels impossible right now is...",
    "A decision I'm struggling with is...",
    "What would help me feel less overwhelmed is...",
    "Something I need permission to do is...",
    "One small step I could take today is...",
    "Support I need but haven't asked for is...",
    "What would make tomorrow easier is...",
    "Something getting in my way is...",
    "If I weren't afraid, I would..."
  ],
  
  homesickness: [
    "What I miss most about home is...",
    "A routine from home I wish I could keep is...",
    "I create a sense of home where I am by...",
    "A tradition from home that matters to me is...",
    "A food that reminds me of home is...",
    "I stay connected to my family by...",
    "Something that feels different about my current environment is...",
    "Comfort items or routines that help me feel grounded are...",
    "I balance staying connected with building new roots by...",
    "Parts of home I'm grateful to have brought with me are..."
  ]
};

export function getRandomPrompt(category = null) {
  const categories = category ? [category] : Object.keys(journalPrompts);
  const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  const prompts = journalPrompts[selectedCategory];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

export function getPromptsByCategory(category) {
  return journalPrompts[category] || [];
}

