import React, { useState } from 'react';
import { Code, BookOpen, Copy, Check, Terminal, ExternalLink, Sparkles, Monitor, Smartphone, Palette } from 'lucide-react';

interface WidgetEmbedProps {
  siteId: string;
  websiteUrl: string;
  websiteName: string;
}

export default function WidgetEmbed({ siteId, websiteUrl, websiteName }: WidgetEmbedProps) {
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mockTheme, setMockTheme] = useState<'clean' | 'warm' | 'dark'>('clean');

  const appUrl = window.location.origin;
  const scriptTag = `<script src="${appUrl}/widget.js" data-site="${siteId}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* EMBED CODE & INSTRUCTIONS */}
      <div className="lg:col-span-5 space-y-6">
        {/* SCRIPT BLOCK */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Code className="w-4.5 h-4.5 text-slate-600" />
            <h4 className="font-bold text-slate-900 tracking-tight">HTML Integration Script</h4>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Copy and paste this script tag into the <code>&lt;head&gt;</code> or bottom of the <code>&lt;body&gt;</code> tag of your website.
          </p>

          <div className="relative bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-900 font-mono text-[11px] leading-relaxed group">
            <div className="overflow-x-auto whitespace-pre pr-12 scrollbar-thin">
              {scriptTag}
            </div>
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 p-1.5 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copy embed script"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-slate-400" /> Works on Shopify, WordPress, Webflow, custom HTML and more.
          </div>
        </div>

        {/* GUIDES CARD */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <BookOpen className="w-4.5 h-4.5 text-slate-600" />
            <h4 className="font-bold text-slate-900 tracking-tight">Platform Instructions</h4>
          </div>

          <div className="space-y-3.5 text-xs text-slate-600">
            <div>
              <h5 className="font-bold text-slate-800">WordPress Setup</h5>
              <p className="mt-0.5 leading-relaxed text-slate-500">
                Install any header-footer injector plugin (e.g. &quot;Insert Headers and Footers&quot;), paste the script into the Header block, and click save.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-slate-800">Shopify Setup</h5>
              <p className="mt-0.5 leading-relaxed text-slate-500">
                Go to Online Store &gt; Themes &gt; Edit Code. Open <code>theme.liquid</code>, scroll down to the bottom, and paste the code right above the closing <code>&lt;/body&gt;</code> tag.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-slate-800">Webflow Setup</h5>
              <p className="mt-0.5 leading-relaxed text-slate-500">
                Go to Project Settings &gt; Custom Code. Paste the script tag into the Footer Code section and publish your site.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* WEB PLAYGROUND SANDBOX */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-500" /> Website Simulator Sandbox
          </h4>

          {/* Device Toggles */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/60">
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1 rounded-md transition-all cursor-pointer ${previewDevice === 'desktop' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1 rounded-md transition-all cursor-pointer ${previewDevice === 'mobile' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* THE INTEGRATION STAGE */}
        <div className="flex justify-center">
          <div
            className={`w-full transition-all duration-300 border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col relative rounded-2xl ${
              previewDevice === 'mobile' ? 'max-w-[340px] h-[550px]' : 'max-w-full h-[520px]'
            }`}
          >
            {/* Mock browser chrome */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2 select-none">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
              </div>
              <div className="w-full bg-white rounded-md border border-slate-200/80 py-0.5 px-3 text-[10px] text-slate-400 font-mono truncate flex items-center justify-between">
                <span>{websiteUrl}</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-300" />
              </div>
            </div>

            {/* Simulated Live Web Content */}
            <div className={`flex-1 overflow-y-auto p-6 flex flex-col justify-between ${
              mockTheme === 'dark' ? 'bg-slate-950 text-slate-100' : mockTheme === 'warm' ? 'bg-amber-50/20 text-slate-800' : 'bg-slate-50/40 text-slate-800'
            }`}>
              <div className="space-y-6">
                <header className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="font-bold text-sm tracking-tight">{websiteName}</span>
                  <nav className="flex gap-4 text-[10px] font-semibold text-slate-400">
                    <span>Products</span>
                    <span>Pricing</span>
                    <span>Contact</span>
                  </nav>
                </header>

                <div className="space-y-4 py-6">
                  <h3 className="text-xl font-bold leading-tight tracking-tight">
                    Ethically Crafted. Built for Seamless Experiences.
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                    We create enterprise digital layouts that scale with your ambitions. Discover pristine assets, responsive widgets, and custom modular solutions designed for your needs.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-sm">
                      Get Started Free
                    </button>
                    <button className="px-3.5 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-lg bg-white">
                      Learn More
                    </button>
                  </div>
                </div>
              </div>

              {/* FOOTER & THEME TOGGLES */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between shrink-0">
                <span className="text-[9px] text-slate-400 font-medium">© 2026 {websiteName}. All rights reserved.</span>
                <div className="flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[9px] text-slate-400 font-medium pr-1">Theme:</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => setMockTheme('clean')} className={`w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300 ${mockTheme === 'clean' ? 'ring-2 ring-slate-400' : ''}`} title="Light theme"></button>
                    <button onClick={() => setMockTheme('warm')} className={`w-3.5 h-3.5 rounded-full bg-amber-50 border border-amber-300 ${mockTheme === 'warm' ? 'ring-2 ring-amber-400' : ''}`} title="Warm theme"></button>
                    <button onClick={() => setMockTheme('dark')} className={`w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-800 ${mockTheme === 'dark' ? 'ring-2 ring-slate-300' : ''}`} title="Dark theme"></button>
                  </div>
                </div>
              </div>
            </div>

            {/* REAL INTERACTIVE FLOATING WIDGET ELEMENT IN PREVIEW */}
            <div className="absolute bottom-4 right-4 z-40">
              <div className="group relative">
                <a
                  href={`/widget?site=${siteId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-slate-900 border border-slate-850 shadow-lg flex items-center justify-center text-white hover:scale-105 hover:bg-slate-850 transition-all cursor-pointer"
                  title="Test chatbot widget"
                >
                  <svg className="w-5 h-5 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </a>
                <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-slate-950 text-white text-[10px] font-medium px-2.5 py-1 rounded-md shadow-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity font-sans">
                  Open AI Chatbot
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
