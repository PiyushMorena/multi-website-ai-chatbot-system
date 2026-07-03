import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Globe, Database, Mail, MessageSquare, Code, RefreshCw, LogOut, CheckCircle2, ChevronRight, UserCheck, ShieldCheck, Download, Calendar, ArrowUpRight } from 'lucide-react';
import { Website, WebPage, Lead, ChatSession } from '../types';
import AnalyticsView from './AnalyticsView';
import WebsiteManager from './WebsiteManager';
import PageManager from './PageManager';
import WidgetEmbed from './WidgetEmbed';

export default function AdminDashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [activeWebsiteId, setActiveWebsiteId] = useState<string | null>(null);
  const [pages, setPages] = useState<WebPage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'analytics' | 'websites' | 'knowledge' | 'leads' | 'conversations' | 'embed'>('analytics');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial data loading
  useEffect(() => {
    fetchWebsites();
  }, []);

  // Fetch websites
  const fetchWebsites = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/websites');
      const data = await res.json();
      setWebsites(data);
      if (data.length > 0 && !activeWebsiteId) {
        setActiveWebsiteId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch website specific assets
  useEffect(() => {
    if (!activeWebsiteId) return;

    const loadData = async () => {
      try {
        const [pagesRes, leadsRes, sessionsRes, websitesRes] = await Promise.all([
          fetch(`/api/websites/${activeWebsiteId}/pages`),
          fetch(`/api/websites/${activeWebsiteId}/leads`),
          fetch(`/api/websites/${activeWebsiteId}/sessions`),
          fetch('/api/websites')
        ]);

        const [pagesData, leadsData, sessionsData, websitesData] = await Promise.all([
          pagesRes.json(),
          leadsRes.json(),
          sessionsRes.json(),
          websitesRes.json()
        ]);

        setPages(pagesData);
        setLeads(leadsData);
        setSessions(sessionsData);
        setWebsites(websitesData);
        
        // If there is an expanded session, sync its content
        if (selectedSession) {
          const synced = sessionsData.find((s: ChatSession) => s.id === selectedSession.id);
          if (synced) setSelectedSession(synced);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadData();
    // Set up auto polling every 10 seconds to sync chats in real-time
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [activeWebsiteId, selectedSession?.id]);

  // Actions
  const handleAddWebsite = async (newSite: Omit<Website, 'id' | 'createdAt' | 'status'>) => {
    try {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite)
      });
      const data = await res.json();
      setWebsites(prev => [...prev, data]);
      setActiveWebsiteId(data.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateWebsite = async (id: string, updates: Partial<Website>) => {
    try {
      const res = await fetch(`/api/websites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      setWebsites(prev => prev.map(w => w.id === id ? data : w));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWebsite = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this website and purge its crawled pages, captured leads, and chat sessions? This is irreversible.')) return;
    try {
      await fetch(`/api/websites/${id}`, { method: 'DELETE' });
      const nextSites = websites.filter(w => w.id !== id);
      setWebsites(nextSites);
      if (activeWebsiteId === id) {
        setActiveWebsiteId(nextSites.length > 0 ? nextSites[0].id : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleScrape = async () => {
    if (!activeWebsiteId) return;
    // Set state optimistically to scraping
    setWebsites(prev => prev.map(w => w.id === activeWebsiteId ? { ...w, status: 'scraping' } : w));
    try {
      await fetch(`/api/websites/${activeWebsiteId}/scrape`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPage = async (page: Omit<WebPage, 'id' | 'lastScraped'>) => {
    try {
      const res = await fetch(`/api/websites/${activeWebsiteId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(page)
      });
      const data = await res.json();
      setPages(prev => [...prev, data]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePage = async (id: string, updates: Partial<WebPage>) => {
    try {
      const res = await fetch(`/api/websites/${activeWebsiteId}/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      setPages(prev => prev.map(p => p.id === id ? data : p));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Delete this page from search RAG index?')) return;
    try {
      await fetch(`/api/websites/${activeWebsiteId}/pages/${id}`, { method: 'DELETE' });
      setPages(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: Lead['status']) => {
    try {
      const res = await fetch(`/api/websites/${activeWebsiteId}/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      setLeads(prev => prev.map(l => l.id === leadId ? data : l));
    } catch (e) {
      console.error(e);
    }
  };

  // CSV Export for Leads
  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['ID', 'Name', 'Email', 'Phone', 'IP Address', 'Date Captured', 'Status'];
    const rows = leads.map(l => [
      l.id,
      l.name,
      l.email,
      l.phone,
      l.ipAddress,
      new Date(l.createdAt).toLocaleDateString(),
      l.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeWebsite?.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeWebsite = websites.find(w => w.id === activeWebsiteId);

  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased text-slate-800">
      {/* 1. SIDE NAVIGATION RAIL */}
      <aside className="w-64 bg-slate-950 text-slate-400 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand */}
          <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-900">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-slate-950 text-base tracking-widest shadow-sm">
              R
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">Ragflow AI</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Widget Control</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" /> Analytics Summary
            </button>

            <button
              onClick={() => setActiveTab('websites')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'websites'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" /> Website Managers
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'knowledge'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" /> Knowledge RAG Core
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'leads'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" /> Capture Leads
            </button>

            <button
              onClick={() => setActiveTab('conversations')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'conversations'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" /> Conversations Log
            </button>

            <button
              onClick={() => setActiveTab('embed')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'embed'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <Code className="w-4 h-4 shrink-0" /> Embed Setup
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-900 text-[10px] text-slate-500 font-mono tracking-tight leading-relaxed">
          <span>PORT: 3000 (Proxy Active)</span><br />
          <span>SERVER STACK: Node/Vite</span>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Workspace Top Toolbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Selected Website:</span>
            {websites.length > 0 ? (
              <select
                value={activeWebsiteId || ''}
                onChange={(e) => setActiveWebsiteId(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                {websites.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-medium text-slate-400 italic">No websites configured</span>
            )}
            <button
              onClick={fetchWebsites}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure Cloud Admin
            </div>
          </div>
        </header>

        {/* Workspace Scroll Viewport */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-500 mb-2" />
              <p className="text-xs font-medium">Synchronizing control board...</p>
            </div>
          ) : (
            <>
              {/* ANALYTICS TAB */}
              {activeTab === 'analytics' && activeWebsite && (
                <AnalyticsView leads={leads} sessions={sessions} websiteName={activeWebsite.name} />
              )}

              {/* WEBSITES CRUD TAB */}
              {activeTab === 'websites' && (
                <WebsiteManager
                  websites={websites}
                  activeWebsiteId={activeWebsiteId}
                  onSelectWebsite={(id) => setActiveWebsiteId(id)}
                  onAddWebsite={handleAddWebsite}
                  onUpdateWebsite={handleUpdateWebsite}
                  onDeleteWebsite={handleDeleteWebsite}
                />
              )}

              {/* KNOWLEDGE RAG TAB */}
              {activeTab === 'knowledge' && activeWebsite && (
                <PageManager
                  websiteId={activeWebsite.id}
                  websiteUrl={activeWebsite.url}
                  websiteName={activeWebsite.name}
                  status={activeWebsite.status}
                  onScrape={handleScrape}
                  pages={pages}
                  onAddPage={handleAddPage}
                  onUpdatePage={handleUpdatePage}
                  onDeletePage={handleDeletePage}
                />
              )}

              {/* LEADS TAB */}
              {activeTab === 'leads' && activeWebsite && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 tracking-tight">Captured Leads Inbox</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Contact detail forms submitted by chatbot interactions.</p>
                    </div>
                    {leads.length > 0 && (
                      <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                      </button>
                    )}
                  </div>

                  {leads.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">Contact Name</th>
                            <th className="py-3 px-4">Email Address</th>
                            <th className="py-3 px-4">Phone Number</th>
                            <th className="py-3 px-4">Visitor IP</th>
                            <th className="py-3 px-4">Date Captured</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
                          {leads.map(lead => (
                            <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center gap-2">
                                <div className="w-6.5 h-6.5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                                  {lead.name.substring(0, 1).toUpperCase()}
                                </div>
                                {lead.name}
                              </td>
                              <td className="py-3.5 px-4 font-mono">{lead.email}</td>
                              <td className="py-3.5 px-4 font-mono">{lead.phone}</td>
                              <td className="py-3.5 px-4 font-mono text-slate-400">{lead.ipAddress}</td>
                              <td className="py-3.5 px-4 text-slate-400">
                                {new Date(lead.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 px-4">
                                <select
                                  value={lead.status}
                                  onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as Lead['status'])}
                                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                                    lead.status === 'new'
                                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                                      : lead.status === 'contacted'
                                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                                      : 'bg-slate-50 text-slate-500 border-slate-100'
                                  } focus:outline-hidden`}
                                >
                                  <option value="new">New Lead</option>
                                  <option value="contacted">Contacted</option>
                                  <option value="closed">Closed / Won</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-400">
                      <Mail className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs">No leads captured yet for this site.</p>
                      <p className="text-[11px] mt-1">Enable &quot;Lead Capture Form&quot; in settings to gather user contacts.</p>
                    </div>
                  )}
                </div>
              )}

              {/* CONVERSATIONS LOG TAB */}
              {activeTab === 'conversations' && activeWebsite && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* SESSIONS DIRECTORY */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-slate-900 tracking-tight">Active Transcripts</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Explore real-time user-chatbot logs.</p>
                    </div>

                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {sessions.length > 0 ? (
                        sessions.map(sess => {
                          const isActive = selectedSession?.id === sess.id;
                          const userMsgsCount = sess.messages.filter(m => m.role === 'user').length;
                          return (
                            <div
                              key={sess.id}
                              onClick={() => setSelectedSession(sess)}
                              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                                isActive
                                  ? 'bg-slate-950 border-slate-900 text-white shadow-xs'
                                  : 'bg-slate-50/40 border-slate-100 hover:border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>
                                <h5 className="font-semibold text-xs leading-none">
                                  Session {sess.id.substring(5, 11).toUpperCase()}
                                </h5>
                                <p className={`text-[10px] font-mono mt-1.5 truncate max-w-[140px] ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                                  IP: {sess.visitorIp}
                                </p>
                                <div className="flex items-center gap-1.5 mt-2 text-[9px] font-medium uppercase tracking-wider">
                                  <span className={`px-1.5 py-0.5 rounded-sm ${isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                                    {userMsgsCount} messages
                                  </span>
                                  {sess.leadId && (
                                    <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-sm font-semibold border border-emerald-500/10">
                                      Lead captured
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-10">No chat logs recorded yet.</p>
                      )}
                    </div>
                  </div>

                  {/* TRANSCRIPT VIEWPORT */}
                  <div className="lg:col-span-2">
                    {selectedSession ? (
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col h-[550px] justify-between">
                        {/* Session Metadata Header */}
                        <div className="border-b border-slate-100 pb-4 mb-4 flex items-start justify-between">
                          <div>
                            <h5 className="font-bold text-slate-900 tracking-tight text-sm">
                              Session {selectedSession.id.substring(5, 11).toUpperCase()} Transcript
                            </h5>
                            <p className="text-[10px] font-mono text-slate-400 mt-1">
                              Visitor IP: {selectedSession.visitorIp} • Visited URL: {selectedSession.pageVisited}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md shrink-0">
                            <Calendar className="w-3.5 h-3.5" /> {new Date(selectedSession.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Interactive Bubbles */}
                        <div className="flex-1 overflow-y-auto px-1 space-y-4 mb-4">
                          {selectedSession.messages.map((m, idx) => {
                            if (m.role === 'system') {
                              return (
                                <div key={idx} className="flex justify-center">
                                  <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                                    <UserCheck className="w-3.5 h-3.5" /> {m.content}
                                  </span>
                                </div>
                              );
                            }
                            const isUser = m.role === 'user';
                            return (
                              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-2.5 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0 ${isUser ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                    {isUser ? 'U' : 'AI'}
                                  </div>
                                  <div className="flex flex-col">
                                    <div className={`px-3 py-2 text-xs leading-relaxed rounded-xl ${isUser ? 'bg-slate-950 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                                      {m.content}
                                    </div>
                                    <span className="text-[9px] text-slate-300 mt-1 font-mono self-end">
                                      {new Date(m.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Prompt Sandbox Indicator */}
                        <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 leading-normal">
                          * Admins can inspect active chat transcripts dynamically in real-time. Chat updates and lead captures synchronize instantly to help you verify RAG results.
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50/50 border border-slate-200/60 border-dashed rounded-2xl h-[550px] flex flex-col items-center justify-center text-slate-400">
                        <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
                        <p className="text-xs font-semibold">No Transcript Selected</p>
                        <p className="text-[11px] mt-1">Select an active session from the left menu to audit the chat dialog.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EMBED CODE TAB */}
              {activeTab === 'embed' && activeWebsite && (
                <WidgetEmbed
                  siteId={activeWebsite.id}
                  websiteUrl={activeWebsite.url}
                  websiteName={activeWebsite.name}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
