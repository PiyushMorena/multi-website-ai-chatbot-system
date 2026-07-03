import React, { useState } from 'react';
import { Settings, Globe, MessageSquare, ShieldAlert, Plus, Edit2, Trash2, ArrowRight } from 'lucide-react';
import { Website } from '../types';

interface WebsiteManagerProps {
  websites: Website[];
  activeWebsiteId: string | null;
  onSelectWebsite: (id: string) => void;
  onAddWebsite: (website: Omit<Website, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateWebsite: (id: string, updates: Partial<Website>) => void;
  onDeleteWebsite: (id: string) => void;
}

export default function WebsiteManager({
  websites,
  activeWebsiteId,
  onSelectWebsite,
  onAddWebsite,
  onUpdateWebsite,
  onDeleteWebsite
}: WebsiteManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('👋 Welcome! I’m your website assistant.\nBefore we start, please share your details.');
  const [contactPageUrl, setContactPageUrl] = useState('');
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(true);

  const activeWebsite = websites.find(w => w.id === activeWebsiteId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    onAddWebsite({
      name,
      url,
      welcomeMessage,
      contactPageUrl: contactPageUrl || `${url}/contact`,
      leadCaptureEnabled
    });

    // Reset Form
    setName('');
    setUrl('');
    setWelcomeMessage('👋 Welcome! I’m your website assistant.\nBefore we start, please share your details.');
    setContactPageUrl('');
    setLeadCaptureEnabled(true);
    setIsAdding(false);
  };

  const handleStartEdit = (site: Website) => {
    setIsEditing(site.id);
    setName(site.name);
    setUrl(site.url);
    setWelcomeMessage(site.welcomeMessage);
    setContactPageUrl(site.contactPageUrl);
    setLeadCaptureEnabled(site.leadCaptureEnabled);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;

    onUpdateWebsite(isEditing, {
      name,
      url,
      welcomeMessage,
      contactPageUrl: contactPageUrl || `${url}/contact`,
      leadCaptureEnabled
    });

    setIsEditing(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT COLUMN: WEBSITES LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" /> My Websites
          </h4>
          <button
            onClick={() => {
              setIsAdding(true);
              setIsEditing(null);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Site
          </button>
        </div>

        <div className="space-y-2.5">
          {websites.map(site => {
            const isActive = site.id === activeWebsiteId;
            return (
              <div
                key={site.id}
                onClick={() => onSelectWebsite(site.id)}
                className={`group p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-slate-950 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div>
                  <h5 className="font-semibold text-sm leading-tight">{site.name}</h5>
                  <p className={`text-xs mt-1 font-mono truncate max-w-[180px] ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                    {site.url}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-sm font-medium ${
                      site.status === 'scraped'
                        ? 'bg-emerald-100 text-emerald-800'
                        : site.status === 'scraping'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {site.status === 'scraped' ? 'Active' : site.status === 'scraping' ? 'Crawling...' : 'No Knowledge'}
                    </span>
                    {site.leadCaptureEnabled && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-sm font-medium ${isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        Lead Flow
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(site);
                    }}
                    className={`p-1.5 rounded-md transition-colors ${isActive ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWebsite(site.id);
                    }}
                    className={`p-1.5 rounded-md transition-colors ${isActive ? 'hover:bg-red-950 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAIL FORM / CREATOR */}
      <div className="lg:col-span-2">
        {isAdding || isEditing ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <h4 className="font-bold text-slate-900 tracking-tight flex items-center gap-2 pb-4 border-b border-slate-100">
              <Settings className="w-4.5 h-4.5 text-slate-500" />
              {isAdding ? 'Register Website Configuration' : 'Edit Chatbot Settings'}
            </h4>

            <form onSubmit={isAdding ? handleCreate : handleUpdate} className="space-y-5 mt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Website Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Online Store"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-slate-400 focus:outline-hidden rounded-lg text-sm placeholder-slate-400 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Target Website URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://myshopify.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-slate-400 focus:outline-hidden rounded-lg text-sm placeholder-slate-400 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Welcoming Intro Message</label>
                <textarea
                  rows={3}
                  required
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 focus:border-slate-400 focus:outline-hidden rounded-lg text-sm placeholder-slate-400 bg-slate-50/50 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Contact Us URL (Fallback)</label>
                  <input
                    type="url"
                    placeholder="https://myshopify.com/contact"
                    value={contactPageUrl}
                    onChange={(e) => setContactPageUrl(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-slate-400 focus:outline-hidden rounded-lg text-sm placeholder-slate-400 bg-slate-50/50"
                  />
                  <p className="text-[10px] text-slate-400">Triggered automatically if answer is not in the crawled database.</p>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/60 rounded-xl mt-1.5">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-semibold text-slate-700 block">Lead Capture Form Flow</span>
                    <span className="text-[10px] text-slate-400 leading-tight block">Sequentially ask name, email, & phone before starting.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={leadCaptureEnabled}
                    onChange={(e) => setLeadCaptureEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 accent-slate-900 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {isAdding ? 'Register & Setup' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        ) : activeWebsite ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Globe className="w-4.5 h-4.5 text-slate-600" />
                <h4 className="font-bold text-slate-900 tracking-tight">Active Configuration Details</h4>
              </div>
              <button
                onClick={() => handleStartEdit(activeWebsite)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 className="w-3 h-3" /> Edit Settings
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Site Name</span>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeWebsite.name}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Host URL</span>
                  <p className="text-sm text-slate-700 font-mono mt-0.5 truncate">{activeWebsite.url}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fallback Contact Link</span>
                  <p className="text-sm text-slate-700 font-mono mt-0.5 truncate">{activeWebsite.contactPageUrl}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lead Collection Policy</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${activeWebsite.leadCaptureEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    <p className="text-xs font-medium text-slate-700">
                      {activeWebsite.leadCaptureEnabled ? 'Mandatory Lead Capture Active' : 'Direct Conversation (Guest Mode)'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Welcome Message Speech</span>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {activeWebsite.welcomeMessage}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/50 border border-slate-200/60 border-dashed rounded-2xl p-12 text-center text-slate-400">
            <Globe className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">No Website Selected</p>
            <p className="text-xs mt-1">Select a site from the left-side directory or create a new site configuration to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
