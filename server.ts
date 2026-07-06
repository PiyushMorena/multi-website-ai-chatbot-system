import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { dbManager } from './src/server/db';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { WebPage } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to get Gemini API key
const getGeminiKey = () => process.env.GEMINI_API_KEY || '';

// Initialize Gemini client if API key is present
const initGemini = () => {
  const key = getGeminiKey();
  if (!key) {
    console.warn('Warning: GEMINI_API_KEY is not defined in environment variables.');
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. WEBSITES
app.get('/api/websites', (req, res) => {
  res.json(dbManager.getWebsites());
});

app.get('/api/websites/:id', (req, res) => {
  const site = dbManager.getWebsite(req.params.id);
  if (!site) {
    return res.status(404).json({ error: 'Website not found' });
  }
  res.json(site);
});

app.post('/api/websites', (req, res) => {
  const { name, url, welcomeMessage, contactPageUrl, leadCaptureEnabled } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }
  const site = dbManager.addWebsite({
    name,
    url,
    welcomeMessage: welcomeMessage || '👋 Welcome! How can I help you today?',
    contactPageUrl: contactPageUrl || `${url}/contact`,
    leadCaptureEnabled: leadCaptureEnabled !== false
  });

  // Automatically trigger a background crawl immediately upon site registration
  const key = getGeminiKey();
  dbManager.scrapeWebsite(site.id, key)
    .then(success => {
      console.log(`Automatic background crawl completed for ${site.name}: ${success ? 'SUCCESS' : 'FAILED'}`);
    })
    .catch(err => {
      console.error(`Automatic background crawl failed for ${site.name}:`, err);
    });

  res.status(201).json(site);
});

app.put('/api/websites/:id', (req, res) => {
  const { name, url, welcomeMessage, contactPageUrl, leadCaptureEnabled } = req.body;
  const updated = dbManager.updateWebsite(req.params.id, {
    name,
    url,
    welcomeMessage,
    contactPageUrl,
    leadCaptureEnabled
  });
  if (!updated) {
    return res.status(404).json({ error: 'Website not found' });
  }
  res.json(updated);
});

app.delete('/api/websites/:id', (req, res) => {
  const deleted = dbManager.deleteWebsite(req.params.id);
  res.json({ success: deleted });
});

// 2. SCRAPING
app.post('/api/websites/:id/scrape', async (req, res) => {
  const site = dbManager.getWebsite(req.params.id);
  if (!site) {
    return res.status(404).json({ error: 'Website not found' });
  }
  
  // Trigger background scrape
  const key = getGeminiKey();
  // We don't block, we run in background, but return instant success
  dbManager.scrapeWebsite(site.id, key)
    .then(success => {
      console.log(`Scraping finished for ${site.name}: ${success ? 'SUCCESS' : 'FAILED'}`);
    })
    .catch(err => {
      console.error(`Scraping failed for ${site.name}:`, err);
    });

  res.json({ message: 'Scraping started in background', status: 'scraping' });
});

// 3. PAGES / KNOWLEDGE BASE
app.get('/api/websites/:id/pages', (req, res) => {
  res.json(dbManager.getPages(req.params.id));
});

app.post('/api/websites/:id/pages', (req, res) => {
  const { url, title, content } = req.body;
  if (!url || !title || !content) {
    return res.status(400).json({ error: 'URL, Title, and Content are required' });
  }
  const page = dbManager.addPage({
    websiteId: req.params.id,
    url,
    title,
    content,
    charCount: content.length
  });
  res.status(201).json(page);
});

app.put('/api/websites/:siteId/pages/:pageId', (req, res) => {
  const { url, title, content } = req.body;
  const updated = dbManager.updatePage(req.params.pageId, {
    url,
    title,
    content,
    charCount: content ? content.length : undefined
  });
  if (!updated) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.json(updated);
});

app.delete('/api/websites/:siteId/pages/:pageId', (req, res) => {
  const deleted = dbManager.deletePage(req.params.pageId);
  res.json({ success: deleted });
});

// 4. LEADS
app.get('/api/websites/:id/leads', (req, res) => {
  res.json(dbManager.getLeads(req.params.id));
});

app.put('/api/websites/:siteId/leads/:leadId', (req, res) => {
  const { status } = req.body;
  const updated = dbManager.updateLeadStatus(req.params.leadId, status);
  if (!updated) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  res.json(updated);
});

// 5. CHAT HISTORY / SESSIONS
app.get('/api/websites/:id/sessions', (req, res) => {
  res.json(dbManager.getSessions(req.params.id));
});

// Helper to return high-fidelity natural responses to exact social greetings and conversational endings
function getGreetingOrSocialResponse(msg: string): string | null {
  const norm = msg.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
  
  // Exact greetings from user requirements
  if (norm === 'hi' || norm === 'hello' || norm === 'hey') {
    return `Hello! 👋 Welcome to our website. How can I help you today?`;
  }
  if (norm === 'good morning') {
    return `Good Morning! ☀️ Welcome to our website. How may I assist you today?`;
  }
  if (norm === 'good afternoon') {
    return `Good Afternoon! 😊 Welcome! How can I help you today?`;
  }
  if (norm === 'good evening') {
    return `Good Evening! 😊 Welcome! How can I help you today?`;
  }
  if (norm === 'good night') {
    return `Good Night! 🌙 Have a wonderful night. Feel free to ask if you need anything before you go.`;
  }
  if (norm === 'how are you' || norm === 'how r u' || norm === 'how are you doing') {
    return `I'm doing great, thank you for asking! 😊 How can I help you today?`;
  }
  if (norm === 'thanks' || norm === 'thank you' || norm === 'thank u' || norm === 'thx' || norm === 'ty') {
    return `You're welcome! 😊 Happy to help.`;
  }
  if (norm === 'bye' || norm === 'goodbye' || norm === 'bye bye' || norm === 'byebye') {
    return `Thank you for visiting! Have a great day. If you need any further assistance, feel free to come back anytime.`;
  }
  
  // Conversational endings / closure
  const endings = [
    'that is all', "that's all", 'no more questions', 'no thank you', 'no thanks', 
    'nothing else', 'i am done', 'all good', 'fully answered', 'no questions left'
  ];
  if (endings.includes(norm)) {
    const closings = [
      `Thank you for visiting! 😊 If you have any more questions, I'm always happy to help.`,
      `Thanks for contacting us. Have a great day!`,
      `It was a pleasure assisting you. Feel free to reach out if you need anything else.`
    ];
    // Consistently return one or rotate based on timestamp to give a dynamic feel
    return closings[Math.floor(Date.now() / 1000) % closings.length];
  }
  
  return null;
}

// Helper for high-fidelity offline/fallback keyword-based RAG matching when Gemini is offline or slow
function performOfflineRAGSearch(pages: WebPage[], websiteUrl: string, contactUrl: string, lowercaseMsg: string): string {
  // Tokenize query into lowercase keywords, filtering out common stop words
  const stopWords = new Set(['what', 'is', 'your', 'do', 'you', 'have', 'any', 'for', 'to', 'on', 'of', 'in', 'and', 'the', 'a', 'an', 'are', 'we', 'how', 'can', 'i', 'get', 'with', 'about', 'please', 'tell', 'me']);
  const queryWords = lowercaseMsg
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  let bestPage: WebPage | null = null;
  let highestScore = 0;
  let matchedKeywords: string[] = [];

  for (const p of pages) {
    let score = 0;
    const pageTitleLower = p.title.toLowerCase();
    const pageContentLower = p.content.toLowerCase();
    const pageUrlLower = p.url.toLowerCase();
    const currentMatched: string[] = [];

    for (const word of queryWords) {
      let wordMatched = false;
      if (pageTitleLower.includes(word)) {
        score += 15; // Higher weight for title matches
        wordMatched = true;
      }
      if (pageUrlLower.includes(word)) {
        score += 10; // High weight for URL segment matches
        wordMatched = true;
      }
      if (pageContentLower.includes(word)) {
        const occurrences = (pageContentLower.match(new RegExp(word, 'g')) || []).length;
        score += Math.min(occurrences * 2, 10); // Up to 10 points for frequency
        wordMatched = true;
      }
      if (wordMatched) {
        currentMatched.push(word);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestPage = p;
      matchedKeywords = currentMatched;
    }
  }

  // Fallback to homepage if nothing matches well but pages exist
  if (!bestPage && pages.length > 0) {
    bestPage = pages.find(p => p.url === websiteUrl) || pages[0];
  }

  if (bestPage) {
    // Find the best snippet inside the selected page that has the highest density of matched keywords
    const sentences = bestPage.content.split(/[.!?\n]+/);
    let bestSentenceIdx = 0;
    let maxWordMatches = -1;

    for (let i = 0; i < sentences.length; i++) {
      const sentenceLower = sentences[i].toLowerCase();
      let matches = 0;
      for (const word of (matchedKeywords.length > 0 ? matchedKeywords : queryWords)) {
        if (sentenceLower.includes(word)) {
          matches++;
        }
      }
      if (matches > maxWordMatches) {
        maxWordMatches = matches;
        bestSentenceIdx = i;
      }
    }

    // Reconstruct a paragraph context around the best matching sentence
    const startSentence = Math.max(0, bestSentenceIdx - 1);
    const endSentence = Math.min(sentences.length, bestSentenceIdx + 3);
    const excerpt = sentences.slice(startSentence, endSentence)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .join('. ')
      .trim();

    const finalAnswer = excerpt || bestPage.content.substring(0, 300);

    return `${finalAnswer}\n\nMore Details: ${bestPage.url}`;
  } else {
    return `I'm here to assist with questions related to this website. Please ask me anything about our services, products, or information available here. (I could not find this information in our scraped content.)`;
  }
}

// 6. CHATBOT CORE API (Lead Capture + RAG + Gemini)
app.post('/api/chat', async (req, res) => {
  const { websiteId, sessionId, message, pageVisited, visitorIp } = req.body;
  
  if (!websiteId || !sessionId || !message) {
    return res.status(400).json({ error: 'websiteId, sessionId, and message are required' });
  }

  const website = dbManager.getWebsite(websiteId);
  if (!website) {
    return res.status(404).json({ error: 'Website not found' });
  }

  const cleanMessage = message.trim();
  const ip = visitorIp || req.ip || '127.0.0.1';
  
  // Retrieve or create session
  let session = dbManager.getSession(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      websiteId,
      visitorIp: ip,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      pageVisited: pageVisited || website.url
    };
  } else {
    session.pageVisited = pageVisited || session.pageVisited;
  }



  const lowercaseMsg = cleanMessage.toLowerCase();
  
  // High-fidelity programmatic intercept for greetings and social endings to ensure exact matches
  const socialReply = getGreetingOrSocialResponse(cleanMessage);
  if (socialReply) {
    session.messages.push({
      id: 'm-usr-' + Date.now(),
      role: 'user',
      content: cleanMessage,
      timestamp: new Date().toISOString()
    });
    session.messages.push({
      id: 'm-sys-' + Date.now(),
      role: 'model',
      content: socialReply,
      timestamp: new Date().toISOString()
    });
    dbManager.createOrUpdateSession(session);
    return res.json({ reply: socialReply });
  }

  const isGreeting = ['hello', 'hi', 'help', 'hey', 'start', 'get started'].some(g => lowercaseMsg.includes(g));

  // NORMAL CHAT MODE (RAG + AI)
  // Retrieve pages across ALL websites to allow multi-website answers
  const allWebsites = dbManager.getWebsites();
  const allPages = dbManager.getPages(); // returns all pages in database
  const contactUrl = website.contactPageUrl || `${website.url}/contact`;

  // Rank pages based on keyword match to allow multi-website answers
  const queryWords = lowercaseMsg.split(/\s+/).filter(w => w.length > 2);
  const scoredPages = allPages.map(p => {
    let score = 0;
    const titleLower = p.title.toLowerCase();
    const contentLower = p.content.toLowerCase();
    const urlLower = p.url.toLowerCase();
    
    // Check if user specifically mentions the website's name
    const parentSite = allWebsites.find(w => w.id === p.websiteId);
    const siteNameLower = parentSite ? parentSite.name.toLowerCase() : '';
    
    if (siteNameLower && lowercaseMsg.includes(siteNameLower)) {
      score += 60; // Huge prioritization boost if the query explicitly mentions the site's name
    }

    for (const word of queryWords) {
      if (titleLower.includes(word)) score += 15;
      if (urlLower.includes(word)) score += 10;
      if (contentLower.includes(word)) {
        const occurrences = (contentLower.match(new RegExp(word, 'g')) || []).length;
        score += Math.min(occurrences * 2, 12);
      }
    }
    return { page: p, score };
  });

  // Sort by score descending and keep only those with positive matches
  const rankedPages = scoredPages
    .filter(sp => sp.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(sp => sp.page);

  // Fallback: If no pages matched, load default pages from active website and other websites' homepages
  let pagesForPrompt = rankedPages.slice(0, 15);
  if (pagesForPrompt.length === 0) {
    const activeSitePages = dbManager.getPages(websiteId);
    pagesForPrompt.push(...activeSitePages.slice(0, 4));
    
    for (const w of allWebsites) {
      if (w.id !== websiteId) {
        const otherPages = dbManager.getPages(w.id);
        if (otherPages.length > 0) {
          pagesForPrompt.push(otherPages[0]); // Include homepage of other websites
        }
      }
    }
  }

  if (pagesForPrompt.length === 0) {
    const fallbackReply = `I could not find this information on the websites. Please contact support at ${contactUrl}.`;
    
    session.messages.push({
      id: 'm-usr-' + Date.now(),
      role: 'user',
      content: cleanMessage,
      timestamp: new Date().toISOString()
    });
    session.messages.push({
      id: 'm-sys-' + Date.now(),
      role: 'model',
      content: fallbackReply,
      timestamp: new Date().toISOString()
    });
    dbManager.createOrUpdateSession(session);
    return res.json({ reply: fallbackReply });
  }

  // Pass custom prompt to Gemini
  const gemini = initGemini();
  if (!gemini) {
    console.warn('Gemini client not initialized. Performing offline keyword match fallback.');
    const localReply = performOfflineRAGSearch(pagesForPrompt, website.url, contactUrl, lowercaseMsg);

    session.messages.push({
      id: 'm-usr-' + Date.now(),
      role: 'user',
      content: cleanMessage,
      timestamp: new Date().toISOString()
    });
    session.messages.push({
      id: 'm-sys-' + Date.now(),
      role: 'model',
      content: localReply,
      timestamp: new Date().toISOString()
    });
    dbManager.createOrUpdateSession(session);
    return res.json({ reply: localReply });
  }

  try {
    // Format full crawled knowledge
    const knowledgeText = pagesForPrompt.map(p => `
Website: ${allWebsites.find(w => w.id === p.websiteId)?.name || 'Unknown'}
URL: ${p.url}
Title: ${p.title}
Content: ${p.content}
`).join('\n===\n');

    const systemInstruction = `You are an intelligent, friendly, and highly conversational AI Chatbot assistant representing the website "${website.name}" (${website.url}), as well as other added websites in the account.
You have access to the knowledge bases, pages, and overall scraped contents of ALL the following websites:
${allWebsites.map(w => `- "${w.name}" (${w.url})`).join('\n')}

Your goal is to converse naturally, beautifully, and dynamically—just like ChatGPT—while remaining strictly limited to the knowledge base of these scraped websites.

CONVERSATION & GREETING BEHAVIOR (Like ChatGPT):
1. GREETINGS & SOCIAL FLOW: Always greet users normally and warmly. Use natural, human-like answers.
2. CHATGPT TONE: Avoid sounding robotic, rigid, or template-based. Handle casual conversation, greetings, and expressions of gratitude (e.g., "thanks", "thank you", "perfect") in a friendly, conversational manner.
3. CONTEXTUAL CONTINUITY: Understand follow-up questions naturally using the previous Chat History. Answer within the continuous conversational context.
4. CONCISENESS (CRITICAL): Keep your answers extremely short, direct, and to the point. Give the shortest complete answer possible.

STRICT KNOWLEDGE LIMITATION & RAG RETRIEVAL ACROSS WEBSITES:
1. ALL PAGES SEARCH: Search the scraped content and overall pages across ALL added websites to find the most related information to the user's query.
2. WEBSITE ONLY: Your answers to factual or information-seeking questions must be strictly based on the provided website knowledge base content. Do not invent details, pricing, features, or contact info that does not exist in the provided pages.
3. OUT-OF-SCOPE QUESTIONS: If a user asks questions that are NOT related to any of the websites (e.g., "What is quantum physics?", "Write a Python script", "how's the weather", or other general knowledge topics unrelated to the scraped content), you MUST NOT use external GPT knowledge to answer. Instead, respond with EXACTLY:
   "I'm here to assist with questions related to this website. Please ask me anything about our services, products, or information available here. (I could not find this information in our scraped content.)"
4. INTEGRATING MULTIPLE PAGES: If multiple pages or websites contain relevant information to answer a user's question, merge them seamlessly and elegantly into a single natural response.
5. MORE DETAILS LINKS: Whenever you answer a question using info from a specific page or website, include a clickable "Read More" or "More Details" link at the end of your response, formatted exactly as:
   "Read More: <URL>" or "More Details: <URL>" (using the actual URL from the metadata). This creates a clickable button option in the chat widget. Never guess or hallucinate URLs.

Style Rules:
- Conversational, warm, engaging, and polished
- No robotic prefixes or structural headers like "Based on my knowledge base:" or "Answer:"
- Maximum of 1-2 very short sentences for all replies. Keep it exceptionally brief and direct.`;

    const chatHistory = session.messages
      .filter(m => m.role !== 'system')
      .slice(-10) // Include up to last 10 messages of context for strong conversational continuity
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `Here is the full scraped content of the website knowledge base:
===================================
${knowledgeText}
===================================

Chat History (Context):
${chatHistory}

New User Question: ${cleanMessage}

Formulate your helpful, factual RAG response:`;

    // Set a race timeout of 8.0s for snappy yet highly reliable replies
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve('__TIMEOUT__');
      }, 8000);
    });

    const geminiPromise = (async () => {
      try {
        const result = await gemini.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.1,
            maxOutputTokens: 350
          }
        });
        return result.text || 'I could not find this information on the website.';
      } catch (err: any) {
        console.log(`[RAG] Primary gemini-3.5-flash not available: ${err?.message || err}`);
        try {
          const resultLite = await gemini.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.1,
              maxOutputTokens: 350
            }
          });
          return resultLite.text || 'I could not find this information on the website.';
        } catch (liteErr: any) {
          console.log(`[RAG] Fallback gemini-3.1-flash-lite also not available: ${liteErr?.message || liteErr}`);
          return '__ERROR__';
        }
      }
    })();

    const reply = await Promise.race([geminiPromise, timeoutPromise]);

    let finalReply = reply;
    if (reply === '__TIMEOUT__' || reply === '__ERROR__') {
      console.log(`[RAG] Gemini request ${reply === '__TIMEOUT__' ? 'timed out' : 'failed'}. Performing offline keyword match fallback.`);
      finalReply = performOfflineRAGSearch(pagesForPrompt, website.url, contactUrl, lowercaseMsg);
    }

    session.messages.push({
      id: 'm-usr-' + Date.now(),
      role: 'user',
      content: cleanMessage,
      timestamp: new Date().toISOString()
    });

    session.messages.push({
      id: 'm-sys-' + Date.now(),
      role: 'model',
      content: finalReply,
      timestamp: new Date().toISOString()
    });

    dbManager.createOrUpdateSession(session);
    return res.json({ reply: finalReply });
  } catch (error: any) {
    console.log(`[RAG] Gemini RAG exception handled: ${error?.message || error}`);
    const errorReply = `I apologize, but I encountered an error processing your query. Please contact support at ${contactUrl}.`;
    return res.json({ reply: errorReply });
  }
});

// 7. EMBEDDABLE WIDGET SCRIPT (widget.js)
app.get('/widget.js', (req, res) => {
  const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  // Find script element and extract website ID
  const scriptTag = document.currentScript || document.querySelector('script[data-site]');
  if (!scriptTag) {
    console.error('AI Chatbot Widget: Script tag with "data-site" attribute not found.');
    return;
  }
  const siteId = scriptTag.getAttribute('data-site');
  if (!siteId) {
    console.error('AI Chatbot Widget: "data-site" attribute is missing.');
    return;
  }

  // Inject widget CSS styles
  const style = document.createElement('style');
  style.innerHTML = \`
    .ai-chatbot-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .ai-chatbot-button {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background: #0f172a;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease-in-out;
      border: none;
    }
    .ai-chatbot-button:hover {
      transform: scale(1.05);
      background: #1e293b;
    }
    .ai-chatbot-button svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .ai-chatbot-popup {
      position: absolute;
      bottom: 75px;
      right: 0;
      width: 380px;
      height: 580px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      border: 1px solid rgba(226, 232, 240, 0.8);
      background: #ffffff;
      overflow: hidden;
      display: none;
      flex-direction: column;
      transform: translateY(15px);
      opacity: 0;
      transition: transform 0.25s cubic-bezier(0, 0.55, 0.45, 1), opacity 0.2s ease-out;
    }
    .ai-chatbot-popup.open {
      display: flex;
      transform: translateY(0);
      opacity: 1;
    }
    .ai-chatbot-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    @media (max-width: 480px) {
      .ai-chatbot-widget-container {
        bottom: 15px;
        right: 15px;
      }
      .ai-chatbot-popup {
        width: calc(100vw - 30px);
        height: calc(100vh - 100px);
        bottom: 70px;
      }
    }
  \`;
  document.head.appendChild(style);

  // Create widget DOM
  const container = document.createElement('div');
  container.className = 'ai-chatbot-widget-container';

  const button = document.createElement('button');
  button.className = 'ai-chatbot-button';
  button.innerHTML = \`<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>\`;

  const popup = document.createElement('div');
  popup.className = 'ai-chatbot-popup';

  const iframe = document.createElement('iframe');
  iframe.className = 'ai-chatbot-iframe';
  iframe.src = '${hostUrl}/widget?site=' + siteId;
  iframe.title = 'AI Assistant';

  popup.appendChild(iframe);
  container.appendChild(popup);
  container.appendChild(button);
  document.body.appendChild(container);

  // Handle click toggling
  let isOpen = false;
  button.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      popup.style.display = 'flex';
      // Trigger animations
      setTimeout(() => popup.classList.add('open'), 10);
      button.innerHTML = \`<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>\`;
    } else {
      popup.classList.remove('open');
      button.innerHTML = \`<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>\`;
      setTimeout(() => {
        if (!isOpen) popup.style.display = 'none';
      }, 250);
    }
  });
})();
  `);
});

// ==========================================
// VITE DEV SERVER & STATIC CLIENT HOOK
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
