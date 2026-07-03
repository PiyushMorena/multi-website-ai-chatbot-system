import React, { useState, useEffect } from 'react';
import { Database, Search, Plus, Trash2, Edit2, Play, AlertTriangle, FileText, CheckCircle, HelpCircle, Eye, Sparkles } from 'lucide-react';
import { WebPage } from '../types';

interface PageManagerProps {
  websiteId: string;
  websiteUrl: string;
  websiteName: string;
  status: 'idle' | 'scraping' | 'scraped' | 'failed';
  onScrape: () => void;
  pages: WebPage[];
  onAddPage: (page: Omit<WebPage, 'id' | 'lastScraped'>) => void;
  onUpdatePage: (id: string, updates: Partial<WebPage>) => void;
  onDeletePage: (id: string) => void;
}

export default function PageManager({
  websiteId,
  websiteUrl,
  websiteName,
  status,
  onScrape,
  pages,
  onAddPage,
  onUpdatePage,
  onDeletePage
}: PageManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [viewingPage, setViewingPage] = useState<WebPage | null>(null);

  // Scraper Log Animation Simulator
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Form states
  const [pageUrl, setPageUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');

  // Handle local simulation logs when scraping begins
  useEffect(() => {
    if (status === 'scraping') {
      setShowLogs(true);
      setCrawlLogs([`[INFO] Booting crawling cluster...`]);
      
      const logs = [
        `[INFO] Fetching landing URL: ${websiteUrl}`,
        `[INFO] Parsing sitemap.xml and analyzing page structure...`,
        `[SCRAPE] Succeeded to load home page: ${websiteUrl}`,
        `[SCRAPE] Extracted 1,240 chars from Home page`,
        `[INFO] Discovering internal same-origin link queue...`,
        `[SCRAPE] Fetching subpage: ${websiteUrl}/pricing`,
        `[SCRAPE] Succeeded to parse pricing contents (1,850 chars)`,
        `[SCRAPE] Fetching subpage: ${websiteUrl}/faq`,
        `[SCRAPE] Succeeded to parse support resources (2,100 chars)`,
        `[SCRAPE] Fetching contact target: ${websiteUrl}/contact`,
        `[RAG] Generating semantic vectors and matching metadata...`,
        `[SUCCESS] Scraped ${websiteName} A-Z fully! Synchronizing 4 knowledge files.`
      ];

      logs.forEach((log, index) => {
        setTimeout(() => {
          setCrawlLogs(prev => [...prev, log]);
        }, (index + 1) * 600);
      });
    } else if (status === 'scraped') {
      // Keep logs visible briefly then let user inspect pages
    } else {
      setShowLogs(false);
      setCrawlLogs([]);
    }
  }, [status, websiteUrl, websiteName]);

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageUrl.trim() || !pageTitle.trim() || !pageContent.trim()) return;

    onAddPage({
      websiteId,
      url: pageUrl,
      title: pageTitle,
      content: pageContent,
      charCount: pageContent.length
    });

    setPageUrl('');
    setPageTitle('');
    setPageContent('');
    setIsAddingPage(false);
  };

  const filteredPages = pages.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* KNOWLEDGE BASE OVERVIEW HEADER */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-xl shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 tracking-tight text-lg">Knowledge Base & RAG Index</h4>
            <p className="text-xs text-slate-400 mt-1">
              Add manually or automatically crawl the target domain to build the semantic search indices.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                status === 'scraped'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : status === 'scraping'
                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                  : 'bg-slate-50 text-slate-500 border-slate-100'
              }`}>
                {status === 'scraped' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" /> Fully Scraped ({pages.length} Pages)
                  </>
                ) : status === 'scraping' ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span> Scraper Running...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> Scrape Required
                  </>
                )}
              </span>
              <span className="text-xs text-slate-400">
                Last updated: {pages.length > 0 ? new Date(pages[0].lastScraped).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAddingPage(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Manual Page
          </button>
          <button
            onClick={onScrape}
            disabled={status === 'scraping'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto-Crawl Site
          </button>
        </div>
      </div>

      {/* CRAWL PROGRESS LOG MONITOR */}
      {showLogs && (
        <div className="bg-slate-950 text-slate-200 border border-slate-900 rounded-2xl p-5 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3">
            <span className="text-[10px] font-bold font-mono uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Scraper Console Output
            </span>
            <button
              onClick={() => setShowLogs(false)}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline font-mono cursor-pointer"
            >
              Minimize
            </button>
          </div>
          <div className="font-mono text-[11px] leading-relaxed space-y-1 h-36 overflow-y-auto">
            {crawlLogs.map((log, idx) => {
              const isErr = log.includes('[ERROR]');
              const isSucc = log.includes('[SUCCESS]');
              const isScrape = log.includes('[SCRAPE]');
              let color = 'text-slate-300';
              if (isErr) color = 'text-red-400';
              if (isSucc) color = 'text-emerald-400 font-semibold';
              if (isScrape) color = 'text-blue-400';
              return (
                <div key={idx} className={color}>
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KNOWLEDGE INDEX LIST */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h5 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" /> Crawled Pages ({filteredPages.length})
          </h5>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter scraped pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 pl-9 pr-4 py-1.5 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white focus:outline-hidden rounded-lg text-xs placeholder-slate-400 transition-all"
            />
          </div>
        </div>

        {/* PAGES GRID */}
        {filteredPages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPages.map(page => (
              <div
                key={page.id}
                className="group border border-slate-100 hover:border-slate-200 bg-slate-50/20 hover:bg-white p-4 rounded-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h6 className="font-semibold text-xs text-slate-800 leading-snug line-clamp-1">
                      {page.title}
                    </h6>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setViewingPage(page)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="View scraped text"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeletePage(page.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete chunk"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 truncate mt-1">
                    {page.url}
                  </p>
                  <p className="text-xs text-slate-500 leading-normal line-clamp-3 mt-3">
                    {page.content}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100/60 pt-3 mt-4 text-[10px] text-slate-400 font-mono">
                  <span>{page.charCount} chars</span>
                  <span>Scraped {new Date(page.lastScraped).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <HelpCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs">No pages crawled or registered yet for this site.</p>
            <p className="text-[11px] mt-1">Click &quot;Auto-Crawl Site&quot; or manually add knowledge to train the chatbot.</p>
          </div>
        )}
      </div>

      {/* DIALOG 1: ADD MANUAL PAGE */}
      {isAddingPage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h5 className="font-bold text-slate-900 tracking-tight pb-3 border-b border-slate-100">
              Add Manual Page Content
            </h5>
            <form onSubmit={handleCreatePage} className="space-y-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Page Relative URL</label>
                <input
                  type="text"
                  required
                  placeholder="/custom-faq"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-hidden rounded-lg text-xs placeholder-slate-400 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Page Title</label>
                <input
                  type="text"
                  required
                  placeholder="Custom Frequently Asked Questions"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-hidden rounded-lg text-xs placeholder-slate-400 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Extracted Full Text Content</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Provide detailed, factual, and informative text content that the chatbot will retrieve to answer user questions..."
                  value={pageContent}
                  onChange={(e) => setPageContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 focus:outline-hidden rounded-lg text-xs placeholder-slate-400 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingPage(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm cursor-pointer"
                >
                  Save to RAG Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2: VIEW PAGE TEXT */}
      {viewingPage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h5 className="font-bold text-slate-900 tracking-tight text-sm">
                  {viewingPage.title}
                </h5>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{viewingPage.url}</p>
              </div>
              <button
                onClick={() => setViewingPage(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl max-h-96 overflow-y-auto">
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {viewingPage.content}
              </p>
            </div>
            <div className="flex items-center justify-between mt-4 text-[10px] text-slate-400 font-mono">
              <span>Characters count: {viewingPage.charCount}</span>
              <span>Semantic indexing: ENABLED (Cosine distance)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
