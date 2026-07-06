import React, { useState, useEffect, useRef } from 'react';
import { Send, CornerDownLeft, MessageSquare, AlertCircle, Phone, Mail, User, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
}

export default function ChatWidget() {
  const [siteId, setSiteId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('👋 Welcome! How can I help you today?');
  const [websiteName, setWebsiteName] = useState('AI Assistant');
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(true);
  const [contactPageUrl, setContactPageUrl] = useState('#');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const renderMessageWithLinks = (content: string) => {
    // Regex matching "Read More: URL" or "More Details: URL"
    const readMoreRegex = /(Read\s+More|More\s+Details|Relevant\s+Page|Contact\s+page\s+for\s+further\s+help\s+at|find\s+more\s+details\s+at):\s*(https?:\/\/[^\s]+)/gi;
    
    const foundLinks: { label: string; url: string }[] = [];
    let cleanText = content;

    const matches = [...content.matchAll(readMoreRegex)];
    if (matches.length > 0) {
      matches.forEach(m => {
        let label = m[1];
        let url = m[2];
        
        // Trim trailing punctuation from URL (like dots or parentheses)
        const trailingMatch = url.match(/([.,!?;:)]+)$/);
        if (trailingMatch) {
          url = url.substring(0, url.length - trailingMatch[0].length);
        }

        // Normalize label
        if (label.toLowerCase().includes('read more')) {
          label = 'Read More';
        } else if (label.toLowerCase().includes('more details')) {
          label = 'More Details';
        } else if (label.toLowerCase().includes('contact')) {
          label = 'Contact Us';
        } else {
          label = 'Explore Topic';
        }

        foundLinks.push({ label, url });
        cleanText = cleanText.replace(m[0], ''); // Remove the block from standard text
      });
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = cleanText.split(urlRegex);

    return (
      <div className="flex flex-col gap-2">
        <div className="whitespace-pre-line break-words text-[14px]">
          {parts.map((part, index) => {
            if (urlRegex.test(part)) {
              let url = part;
              let suffix = '';
              const trailingMatch = url.match(/([.,!?;:)]+)$/);
              if (trailingMatch) {
                url = url.substring(0, url.length - trailingMatch[0].length);
                suffix = trailingMatch[0];
              }

              let label = url;
              if (url === contactPageUrl || url.toLowerCase().includes('contact')) {
                label = 'Contact Us ↗';
              } else {
                try {
                  const parsed = new URL(url);
                  if (parsed.pathname === '/' || parsed.pathname === '') {
                    label = parsed.hostname + ' ↗';
                  } else {
                    label = 'Read More ↗';
                  }
                } catch {
                  label = 'Visit Page ↗';
                }
              }

              return (
                <React.Fragment key={index}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 dark:text-sky-400 dark:hover:text-sky-300 font-semibold underline cursor-pointer break-all"
                  >
                    {label}
                  </a>
                  {suffix}
                </React.Fragment>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </div>

        {foundLinks.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
            {foundLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] shadow-xs active:scale-[0.98]"
              >
                <span>{link.label}</span>
                <span className="text-[10px]">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Parse site ID and load everything sequentially on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const site = params.get('site');
    if (!site) {
      setSiteId(null);
      return;
    }
    setSiteId(site);

    // Initialize or retrieve Session ID
    let sess = sessionStorage.getItem(`ai_chatbot_session_${site}`);
    if (!sess) {
      sess = 'sess-' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem(`ai_chatbot_session_${site}`, sess);
    }
    setSessionId(sess);

    let isCancelled = false;

    const initWidget = async () => {
      try {
        // 1. Fetch website configuration
        const configRes = await fetch(`/api/websites/${site}`);
        if (!configRes.ok) throw new Error('Failed to fetch website config');
        const configData = await configRes.json();

        if (isCancelled) return;
        setWebsiteName(configData.name || 'AI Assistant');
        setWelcomeMessage(configData.welcomeMessage || '👋 Welcome! How can I help you today?');
        setLeadCaptureEnabled(configData.leadCaptureEnabled ?? true);
        setContactPageUrl(configData.contactPageUrl || '#');

        // 2. Fetch session history
        const sessionsRes = await fetch(`/api/websites/${site}/sessions`);
        if (!sessionsRes.ok) throw new Error('Failed to fetch sessions');
        const sessions = await sessionsRes.json();

        if (isCancelled) return;
        const currentSession = sessions.find((s: any) => s.id === sess);
        if (currentSession && currentSession.messages && currentSession.messages.length > 0) {
          // Restore and preserve existing chat history
          setMessages(currentSession.messages);
        } else {
          // If no previous history, always start with the welcome message
          setMessages([
            {
              id: 'initial-welcome',
              role: 'model',
              content: configData.welcomeMessage || '👋 Welcome! How can I help you today?',
              timestamp: new Date().toISOString()
            }
          ]);
        }
      } catch (err) {
        console.error('Error during ChatWidget initialization:', err);
        if (isCancelled) return;
        setMessages([
          {
            id: 'initial-welcome',
            role: 'model',
            content: '👋 Welcome! How can I help you today?',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    };

    initWidget();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Handle auto scrolling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || !siteId || isLoading) return;

    const userMsg = inputValue.trim();
    setInputValue('');

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: userMsg,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: siteId,
          sessionId: sessionId,
          message: userMsg,
          pageVisited: document.referrer || window.location.href,
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      if (data.reply) {
        setMessages(prev => [
          ...prev,
          {
            id: 'mod-' + Date.now(),
            role: 'model',
            content: data.reply,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'model',
          content: `⚠️ Sorry, I had trouble connecting. Please try again. If the issue persists, feel free to visit our contact page: ${contactPageUrl}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!siteId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mb-3" />
        <p className="font-medium text-slate-800">Missing Site Configuration</p>
        <p className="text-sm mt-1">This chatbot widget requires a valid <code>site</code> query parameter to function.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800 selection:bg-slate-900 selection:text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg tracking-wider text-slate-100">
              {websiteName.substring(0, 2).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div>
            <h1 className="font-semibold text-[15px] leading-tight text-white">{websiteName}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> AI Assistant (Online)
            </p>
          </div>
        </div>
      </div>

      {/* MESSAGES VIEWPORT */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 bg-slate-50/50">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            // Hide system/log messages from the actual client chat bubble view
            if (msg.role === 'system') return null;

            const isUser = msg.role === 'user';
            
            // Format timestamp beautifully
            let formattedTime = '';
            try {
              formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch {
              formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-950 to-slate-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 shadow-sm">
                      AI
                    </div>
                  )}
                  
                  <div className="flex flex-col">
                    {/* Role Header and Time */}
                    <div className={`flex items-center gap-1.5 mb-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[11px] font-semibold text-slate-600">
                        {isUser ? 'You' : websiteName}
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">
                        {formattedTime}
                      </span>
                    </div>

                    {/* Chat Bubble */}
                    <div
                      className={`px-4 py-3 text-[14px] leading-relaxed transition-all duration-200 ${
                        isUser
                          ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-xs shadow-md shadow-indigo-100/50 border border-indigo-500/10'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-xs shadow-xs hover:border-slate-300'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-line break-words">
                          {msg.content}
                        </div>
                      ) : (
                        renderMessageWithLinks(msg.content)
                      )}

                      {/* Explicit CTA if fallback is triggered */}
                      {!isUser && msg.content.includes("could not find this information") && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-start">
                          <a
                            href={contactPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] shadow-sm cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" /> Visit Contact Us
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* LOADING INDICATOR */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 items-start max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-950 to-slate-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
                AI
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-600">{websiteName}</span>
                </div>
                <div className="px-4 py-3 bg-white text-slate-800 border border-slate-200/85 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0">
        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <div className="absolute left-3.5 flex items-center pointer-events-none">
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your question..."
            className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white focus:outline-hidden rounded-xl text-sm text-slate-800 placeholder-slate-400 transition-all"
            disabled={isLoading}
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-slate-400">
          Powered by <span className="font-semibold text-slate-500">RAG Engine</span> & Gemini
        </div>
      </div>
    </div>
  );
}
