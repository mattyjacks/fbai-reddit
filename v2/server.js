import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import fetch from 'node-fetch';
import { schedule } from 'node-cron';
import { AzureOpenAI } from 'openai';
import { Ollama } from 'ollama';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Store active subreddits and configurations
let activeSubreddits = new Set([
    "layoffs",
    "jobsearchhacks",
    "csMajors",
    "jobhunting",
    "remotework",
    "recruitinghell"
]);

let config = {
    aiModel: 'gpt',
    apiKey: '',
    redditAuth: null,
    lastRefresh: 0
};

// Reddit API functions
async function getRedditAuth() {
    if (config.redditAuth && Date.now() - config.lastRefresh < 3600000) {
        return config.redditAuth;
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;

    try {
        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=password&username=${username}&password=${password}`
        });

        const data = await response.json();
        config.redditAuth = data.access_token;
        config.lastRefresh = Date.now();
        return data.access_token;
    } catch (error) {
        console.error('Error getting Reddit auth:', error);
        throw error;
    }
}

async function getSubredditPosts(subreddit) {
    const auth = await getRedditAuth();
    try {
        const response = await fetch(`https://oauth.reddit.com/r/${subreddit}/new.json?limit=10`, {
            headers: {
                'Authorization': `Bearer ${auth}`,
                'User-Agent': 'First2Apply/1.0.0'
            }
        });

        const data = await response.json();
        return data.data.children.map(child => ({
            id: child.data.id,
            title: child.data.title,
            content: child.data.selftext,
            url: `https://reddit.com${child.data.permalink}`,
            created: child.data.created_utc
        }));
    } catch (error) {
        console.error(`Error fetching posts from r/${subreddit}:`, error);
        return [];
    }
}

// AI Response Generation
async function generateAIResponse(post) {
    if (config.aiModel === 'gpt' && config.apiKey) {
        const openai = new AzureOpenAI({
            apiKey: config.apiKey,
            endpoint: "https://first2apply.openai.azure.com/",
            apiVersion: "2024-02-15-preview",
        });

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a marketing assistant at First2Apply, a job search automation tool that provides real-time job alerts from over 10 popular job boards. Keep responses helpful but concise.`
                    },
                    {
                        role: "user",
                        content: `Reply to the following post. Don't be too promotional, but mention First2Apply if relevant:\nTitle: ${post.title}\nContent: ${post.content}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error generating GPT response:', error);
            return 'Error generating AI response';
        }
    } else if (config.aiModel === 'ollama' && process.env.OLLAMA_HOST) {
        const ollama = new Ollama({
            host: process.env.OLLAMA_HOST
        });

        try {
            const response = await ollama.chat({
                model: 'llama2',
                messages: [{
                    role: 'system',
                    content: 'You are a helpful assistant for First2Apply, a job search automation tool. Keep responses concise and relevant.'
                }, {
                    role: 'user',
                    content: `Reply to this post naturally:\nTitle: ${post.title}\nContent: ${post.content}`
                }]
            });

            return response.message.content;
        } catch (error) {
            console.error('Error generating Ollama response:', error);
            return 'Error generating AI response';
        }
    }

    return 'Please configure AI model and API key';
}

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.emit('subreddits', Array.from(activeSubreddits));

    socket.on('addSubreddit', (subreddit) => {
        activeSubreddits.add(subreddit);
        io.emit('subreddits', Array.from(activeSubreddits));
    });

    socket.on('removeSubreddit', (subreddit) => {
        activeSubreddits.delete(subreddit);
        io.emit('subreddits', Array.from(activeSubreddits));
    });

    socket.on('updateConfig', (newConfig) => {
        config = { ...config, ...newConfig };
        socket.emit('configUpdated', config);
    });

    socket.on('generateReply', async (post) => {
        const reply = await generateAIResponse(post);
        socket.emit('replyGenerated', { postId: post.id, reply });
    });
});

// Scheduled task to fetch new posts
async function fetchNewPosts() {
    console.log('Fetching new posts...');
    const allPosts = [];
    
    for (const subreddit of activeSubreddits) {
        const posts = await getSubredditPosts(subreddit);
        allPosts.push(...posts);
    }

    if (allPosts.length > 0) {
        io.emit('newPosts', allPosts);
    }
}

// Schedule post fetching every 5 minutes
schedule('*/5 * * * *', fetchNewPosts);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    fetchNewPosts(); // Initial fetch
});
