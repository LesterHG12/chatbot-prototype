// Chat storage using localStorage for client-side persistence
// Manages multiple chat sessions and their messages

export class ChatStore {
  constructor() {
    this.storageKey = 'chat_sessions';
    this.currentSessionKey = 'current_chat_session_id';
  }

  // Get all chat sessions
  getAllSessions() {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      const sessions = stored ? JSON.parse(stored) : [];
      // Sort by lastUpdated, most recent first
      return sessions.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    } catch (err) {
      console.error('Error reading chat sessions:', err);
      return [];
    }
  }

  // Get a specific chat session by ID
  getSession(sessionId) {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessions = this.getAllSessions();
      return sessions.find(s => s.id === sessionId) || null;
    } catch (err) {
      console.error('Error reading chat session:', err);
      return null;
    }
  }

  // Get the current active session ID
  getCurrentSessionId() {
    if (typeof window === 'undefined') return null;
    
    try {
      return localStorage.getItem(this.currentSessionKey);
    } catch (err) {
      console.error('Error reading current session ID:', err);
      return null;
    }
  }

  // Set the current active session ID
  setCurrentSessionId(sessionId) {
    if (typeof window === 'undefined') return;
    
    try {
      if (sessionId) {
        localStorage.setItem(this.currentSessionKey, sessionId);
      } else {
        localStorage.removeItem(this.currentSessionKey);
      }
    } catch (err) {
      console.error('Error saving current session ID:', err);
    }
  }

  // Create a new chat session
  createSession(title = null) {
    if (typeof window === 'undefined') return null;
    
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const session = {
      id: sessionId,
      title: title || this.generateDefaultTitle(),
      messages: [],
      createdAt: now,
      lastUpdated: now,
      diaryContext: '',
      includeTodayEntry: false
    };
    
    try {
      const sessions = this.getAllSessions();
      sessions.push(session);
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
      this.setCurrentSessionId(sessionId);
      return session;
    } catch (err) {
      console.error('Error creating chat session:', err);
      return null;
    }
  }

  // Generate a default title based on the first user message
  generateDefaultTitle() {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    return `${timeGreeting} Chat - ${new Date().toLocaleDateString()}`;
  }

  // Update a chat session
  updateSession(sessionId, updates) {
    if (typeof window === 'undefined') return false;
    
    try {
      const sessions = this.getAllSessions();
      const index = sessions.findIndex(s => s.id === sessionId);
      
      if (index === -1) return false;
      
      sessions[index] = {
        ...sessions[index],
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
      return true;
    } catch (err) {
      console.error('Error updating chat session:', err);
      return false;
    }
  }

  // Add a message to a session
  addMessage(sessionId, message) {
    if (typeof window === 'undefined') return false;
    
    try {
      const sessions = this.getAllSessions();
      const index = sessions.findIndex(s => s.id === sessionId);
      
      if (index === -1) return false;
      
      sessions[index].messages.push(message);
      sessions[index].lastUpdated = new Date().toISOString();
      
      // Auto-generate title from first user message if still default
      if (sessions[index].messages.length === 2 && // greeting + first user message
          message.role === 'user' &&
          (sessions[index].title.startsWith('Morning') || 
           sessions[index].title.startsWith('Afternoon') || 
           sessions[index].title.startsWith('Evening'))) {
        const preview = message.content.substring(0, 50);
        sessions[index].title = preview.length < message.content.length 
          ? `${preview}...` 
          : preview;
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
      return true;
    } catch (err) {
      console.error('Error adding message:', err);
      return false;
    }
  }

  // Set messages for a session (replace all)
  setMessages(sessionId, messages) {
    if (typeof window === 'undefined') return false;
    
    try {
      const sessions = this.getAllSessions();
      const index = sessions.findIndex(s => s.id === sessionId);
      
      if (index === -1) return false;
      
      sessions[index].messages = messages;
      sessions[index].lastUpdated = new Date().toISOString();
      
      // Auto-generate title from first user message if still default
      if (messages.length === 2 && // greeting + first user message
          messages[1]?.role === 'user' &&
          (sessions[index].title.startsWith('Morning') || 
           sessions[index].title.startsWith('Afternoon') || 
           sessions[index].title.startsWith('Evening'))) {
        const preview = messages[1].content.substring(0, 50);
        sessions[index].title = preview.length < messages[1].content.length 
          ? `${preview}...` 
          : preview;
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
      return true;
    } catch (err) {
      console.error('Error setting messages:', err);
      return false;
    }
  }

  // Delete a chat session
  deleteSession(sessionId) {
    if (typeof window === 'undefined') return false;
    
    try {
      const sessions = this.getAllSessions();
      const filtered = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      
      // If deleting current session, clear it
      if (this.getCurrentSessionId() === sessionId) {
        this.setCurrentSessionId(null);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting chat session:', err);
      return false;
    }
  }

  // Get or create current session
  getOrCreateCurrentSession() {
    let sessionId = this.getCurrentSessionId();
    let session = sessionId ? this.getSession(sessionId) : null;
    
    if (!session) {
      session = this.createSession();
    }
    
    return session;
  }

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  }
}

