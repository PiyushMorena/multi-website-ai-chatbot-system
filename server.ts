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
  const website = dbManager.getWebsite(req.params.id);

  if (!website) {
    return res.status(404).json({
      error: 'Website not found'
    });
  }

  res.json(website);
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
    return `I am sorry, but I could not find this information on the websites. Please feel free to reach out to us directly on our contact page for further help at: ${contactUrl}`;
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
  const isGreeting = ['hello', 'hi', 'help', 'hey', 'start', 'get started'].some(g => lowercaseMsg.includes(g));

  // CHECK LEAD CAPTURE FLOW
  if (website.leadCaptureEnabled) {
    // Read custom metadata on session for step
    const sessionMeta: any = session.metadata || {};
    const step = sessionMeta.leadCaptureStep;

    // Trigger Lead Capture Welcome if:
    // - Session is empty
    // - OR User said greeting AND lead capture is not completed
    if (!step && (session.messages.length === 0 || isGreeting)) {
      sessionMeta.leadCaptureStep = 'name';
      session.metadata = sessionMeta;

      const welcomeResponse = `👋 Welcome! I’m your website assistant.
Before we start, please share your details.

What is your name?`;

      session.messages.push({
        id: 'm-usr-' + Date.now(),
        role: 'user',
        content: cleanMessage,
        timestamp: new Date().toISOString()
      });

      session.messages.push({
        id: 'm-sys-' + Date.now(),
        role: 'model',
        content: welcomeResponse,
        timestamp: new Date().toISOString()
      });

      dbManager.createOrUpdateSession(session);
      return res.json({ reply: welcomeResponse, step: 'name' });
    }

    // Capture Name step
    if (step === 'name') {
      sessionMeta.leadName = cleanMessage;
      sessionMeta.leadCaptureStep = 'email';
      session.metadata = sessionMeta;

      const response = `Thanks ${cleanMessage}! What is your email address?`;

      session.messages.push({
        id: 'm-usr-' + Date.now(),
        role: 'user',
        content: cleanMessage,
        timestamp: new Date().toISOString()
      });

      session.messages.push({
        id: 'm-sys-' + Date.now(),
        role: 'model',
        content: response,
        timestamp: new Date().toISOString()
      });

      dbManager.createOrUpdateSession(session);
      return res.json({ reply: response, step: 'email' });
    }

    // Capture Email step
    if (step === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanMessage)) {
        const errorMsg = `That doesn't look like a valid email. Please enter a valid email address (e.g. name@example.com):`;
        return res.json({ reply: errorMsg, step: 'email' });
      }

      sessionMeta.leadEmail = cleanMessage;
      sessionMeta.leadCaptureStep = 'phone';
      session.metadata = sessionMeta;

      const response = `Thanks! What is your phone number?`;

      session.messages.push({
        id: 'm-usr-' + Date.now(),
        role: 'user',
        content: cleanMessage,
        timestamp: new Date().toISOString()
      });

      session.messages.push({
        id: 'm-sys-' + Date.now(),
        role: 'model',
        content: response,
        timestamp: new Date().toISOString()
      });

      dbManager.createOrUpdateSession(session);
      return res.json({ reply: response, step: 'phone' });
    }

    // Capture Phone step
    if (step === 'phone') {
      // Basic phone verification: at least 7 digits
      const digitsOnly = cleanMessage.replace(/\D/g, '');
      if (digitsOnly.length < 7) {
        const errorMsg = `Please enter a valid phone number (e.g., +1 555-0199 or 5550199):`;
        return res.json({ reply: errorMsg, step: 'phone' });
      }

      sessionMeta.leadPhone = cleanMessage;
      sessionMeta.leadCaptureStep = 'completed';
      session.metadata = sessionMeta;

      // Persist Lead in database!
      const newLead = dbManager.addLead({
        websiteId,
        sessionId,
        name: sessionMeta.leadName || 'Anonymous',
        email: sessionMeta.leadEmail || '',
        phone: sessionMeta.leadPhone || '',
        ipAddress: ip
      });

      session.leadId = newLead.id;
      
      const completedResponse = `Thanks ${sessionMeta.leadName} 👍 Now you can ask anything about this website.`;

      session.messages.push({
        id: 'm-usr-' + Date.now(),
        role: 'user',
        content: cleanMessage,
        timestamp: new Date().toISOString()
      });

      // System notification message
      session.messages.push({
        id: 'm-sys-log-' + Date.now(),
        role: 'system',
        content: `Lead captured: ${sessionMeta.leadName} (${sessionMeta.leadEmail}, ${sessionMeta.leadPhone})`,
        timestamp: new Date().toISOString()
      });

      session.messages.push({
        id: 'm-sys-' + Date.now(),
        role: 'model',
        content: completedResponse,
        timestamp: new Date().toISOString()
      });

      dbManager.createOrUpdateSession(session);
      return res.json({ reply: completedResponse, step: 'completed' });
    }
  }

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

    const systemInstruction = `You are an intelligent, friendly, and highly conversational Multi-Website AI Chatbot assistant.
You have access to the knowledge bases and pages of ALL added websites in the user's account:
${allWebsites.map(w => `- "${w.name}" (${w.url})`).join('\n')}

Your job is to understand and answer user questions in a natural, friendly, human-like manner, using ONLY the provided website content.

STRICT RULES:
1. UNDERSTAND USER RELEVANCY: First, determine if the user's question is related to the content of any of these websites. 
   - If the query is relevant and can be answered using the provided content, give a conversational, warm, and highly tailored answer.
   - If the question is NOT related to any of the websites, or cannot be answered from the provided content, politely and warmly inform the user that you could not find this information on the websites. Provide the official Contact Us URL (${contactUrl}) for further assistance.
   - Note: If you cannot find the answer, your response MUST contain the phrase "could not find this information" so the system can display a contact button, but write it in a natural, polite sentence (e.g., "I'm sorry, but I could not find this information on our websites. You can contact support directly at ${contactUrl} for further assistance!").

2. CONCISE & HUMAN-LIKE: Do NOT use rigid, robotic prefixes or headings like "Answer:" or "Relevant Page:". Answer like a real, helpful human support agent. Keep your response short, precise, and friendly (max 2-3 sentences). Do not use long paragraphs or filler text.

3. CONTEXT GROUNDING: Gently ground your response in the context of the website being queried by mentioning its name naturally (e.g., "At ${website.name}, we..." or "Over at ${allWebsites[1]?.name || 'Brew & Co.'}, our...").

4. RELEVANT LINKS: If the answer is found on a specific page, you MUST include a "Read More" or "More Details" link at the end of your response. Format it exactly as "Read More: <URL>" or "More Details: <URL>". Never invent or guess URLs. For example: "More Details: https://example.com/about".

5. ACCURACY: Do NOT use external knowledge. Do NOT guess, hallucinate, or fabricate services, pricing, or details.

Style Rules:
- Natural, warm, conversational English
- Very short, precise, and useful answers matching the user's intent
- No long paragraphs
- No filler text`;

    const chatHistory = session.messages
      .filter(m => m.role !== 'system')
      .slice(-6) // Include up to last 6 messages of context
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

    // Set a race timeout of 2.5s for snappy replies guaranteed under 3 seconds
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve('__TIMEOUT__');
      }, 2500);
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
      } catch (err) {
        console.warn('Primary gemini-3.5-flash failed or hit quota limits. Attempting fallback to gemini-3.1-flash-lite...', err);
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
        } catch (liteErr) {
          console.error('All Gemini model endpoints exhausted (including gemini-3.1-flash-lite):', liteErr);
          return '__ERROR__';
        }
      }
    })();

    const reply = await Promise.race([geminiPromise, timeoutPromise]);

    let finalReply = reply;
    if (reply === '__TIMEOUT__' || reply === '__ERROR__') {
      console.warn('Gemini request unresolved (timed out or failed). Performing offline keyword match fallback.');
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
  } catch (error) {
    console.error('Gemini RAG failed:', error);
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
