# Diary Chatbot

An AI-powered diary/journal application built with SvelteKit that helps users process emotions, navigate conflicts, and strengthen real-world relationships. The chatbot features three specialized agents that work together through an orchestrator to provide personalized support.

## Features

- **Date-based Diary Entries**: Write and store journal entries by date
- **Three Specialized Agents**:
  - **Reflection Agent**: Gentle, thought-provoking guidance for self-reflection
  - **Validator Agent**: Validating and supportive responses to acknowledge feelings
  - **Conflict Agent**: Helps navigate conflicts and bridge relationships
- **Mode Switching**: Toggle between Reflection and Validator modes
- **Smart Orchestration**: Automatically routes to the appropriate agent based on context
- **Metrics Tracking**: Monitors sentiment, stress levels, and conflict mentions
- **Beautiful UI**: Thoughtfully designed interface with mode-specific styling

## Architecture

```
Input → Metrics → Orchestrator → Agent 1/Agent 2/Agent 3 → Output
```

## Setup and Installation

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Google Gemini API key

### Installation Steps

1. Clone the repository:
```bash
git clone <your-repo-url>
cd 6s061project
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `example-env.env` to `.env`:
   ```bash
   cp example-env.env .env
   ```
   - Edit `.env` and replace `your_api_key_here` with your actual Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
   
   **Important**: Never commit your `.env` file! It's already in `.gitignore` to protect your API key.

4. Get a Gemini API key:
- Go to [Google AI Studio](https://aistudio.google.com/)
- Click "Get API Key"
- Click "Create API Key"
- Copy your key and add it to `.env`

5. Run the development server:
```bash
npm run dev
```

6. Open your browser to `http://localhost:5173`

## Usage

1. **Write Diary Entries**: 
   - Select a date using the date picker
   - Write your thoughts in the text area
   - Entries are automatically saved to localStorage

2. **Start Interactive Mode**:
   - Click "Start Interactive Mode" button after writing an entry
   - Or switch to the "Interactive Mode" tab

3. **Choose a Mode**:
   - **Reflection Mode**: For gentle, thought-provoking reflection
   - **Validator Mode**: For validation and acknowledgment

4. **Chat with the AI**:
   - The orchestrator automatically routes to the appropriate agent
   - Conflict-related topics automatically trigger the Conflict Agent
   - Your diary entries provide context to the AI

## Project Structure

```
src/
├── lib/
│   ├── agents/
│   │   ├── ReflectionAgent.js
│   │   ├── ValidatorAgent.js
│   │   └── ConflictAgent.js
│   ├── components/
│   │   ├── DiaryPage.svelte
│   │   ├── ChatInterface.svelte
│   │   └── MessageBubble.svelte
│   ├── diary/
│   │   └── DiaryStore.js
│   ├── metrics/
│   │   └── MetricsCollector.js
│   ├── orchestrators/
│   │   └── DiaryOrchestrator.js
│   └── gemini.js
├── routes/
│   ├── api/
│   │   └── chat/
│   │       └── +server.js
│   └── +page.svelte
└── app.html
```

## Deployment

### Vercel Deployment

1. Create a Vercel account and import your GitHub repo
2. In Vercel Project Settings → Environment Variables, add:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional, defaults to gemini-2.5-flash)
3. Deploy - Vercel will automatically build and host your app

**Important**: Never commit your `.env` file or API keys to Git. Use Vercel Environment Variables for production.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Notes

- Diary entries are stored in browser localStorage (client-side only)
- For production, consider implementing backend storage
- The application uses Google Gemini API for AI responses
- All agents follow SPEAKING frame methodology for consistent persona design

## License

[Your License Here]

