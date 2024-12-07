# First2Apply Reddit Bot (Web Version)

This is a web-based version of the First2Apply Reddit bot that monitors specific subreddits for job-related posts and generates helpful responses using AI.

## Features

- Real-time monitoring of multiple subreddits
- Support for both ChatGPT and Ollama AI models
- Web-based dashboard for configuration and monitoring
- Real-time updates using Socket.IO
- Automatic post fetching every 5 minutes
- Customizable AI responses

## Prerequisites

- Node.js v16 or higher
- Reddit API credentials (client ID, client secret, username, password)
- OpenAI API key (for ChatGPT) or Ollama installation (for local AI)

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Configuration

### Reddit API Setup

1. Go to https://www.reddit.com/prefs/apps
2. Create a new application (script type)
3. Note down the client ID and client secret
4. Add these credentials to your `.env` file

### AI Configuration

#### ChatGPT
1. Get your OpenAI API key
2. Add it to the `.env` file or input it in the web interface

#### Ollama
1. Install Ollama from https://ollama.ai
2. Start the Ollama server
3. The default configuration assumes Ollama is running at `http://localhost:11434`

## Usage

1. The dashboard shows three main sections:
   - Bot Configuration: Set up your AI model and API keys
   - Subreddit Management: Add or remove monitored subreddits
   - Post Monitor: View recent posts and generate AI responses

2. Add subreddits to monitor using the "Add" button
3. Configure your preferred AI model and API key
4. Posts will automatically appear in the dashboard
5. Click "Generate Reply" on any post to create an AI response

## Architecture

- Frontend: HTML/JavaScript with Tailwind CSS
- Backend: Node.js with Express
- Real-time updates: Socket.IO
- AI Integration: OpenAI API (ChatGPT) or Ollama
- Reddit Integration: Reddit API via OAuth

## Contributing

Feel free to submit issues and pull requests.
