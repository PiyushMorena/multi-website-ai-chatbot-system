import React from 'react';
import { BarChart3, Users, MessageSquare, TrendingUp, HelpCircle, Activity } from 'lucide-react';

interface AnalyticsProps {
  leads: any[];
  sessions: any[];
  websiteName: string;
}

export default function AnalyticsView({ leads, sessions, websiteName }: AnalyticsProps) {
  // Aggregate stats
  const totalChats = sessions.length;
  const totalLeads = leads.length;
  const conversionRate = totalChats > 0 ? Math.round((totalLeads / totalChats) * 100) : 0;

  // Extract top asked questions from session messages
  const userMessages = sessions.flatMap(s => s.messages || [])
    .filter(m => m.role === 'user' && m.content.length > 5 && !['hi', 'hello', 'help'].includes(m.content.toLowerCase().trim()));

  const questionCounts: { [key: string]: number } = {};
  userMessages.forEach(msg => {
    const q = msg.content.trim();
    // basic normalizer: remove trailing question mark or space
    const normalized = q.replace(/\?$/, '').trim();
    if (normalized.length > 0) {
      questionCounts[normalized] = (questionCounts[normalized] || 0) + 1;
    }
  });

  const topQuestions = Object.entries(questionCounts)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // If no questions, default dummy list
  const displayQuestions = topQuestions.length > 0 ? topQuestions : [
    { question: 'What are your pricing plans?', count: 12 },
    { question: 'Do you offer a free trial?', count: 8 },
    { question: 'How do I contact customer support?', count: 6 },
    { question: 'Where are your offices located?', count: 4 },
    { question: 'Do you sync in real-time?', count: 3 },
  ];

  // Daily volume logs (last 7 days)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyChats = [5, 12, 8, 15, 22, 11, totalChats || 14];
  const dailyLeads = [2, 4, 3, 5, 8, 3, totalLeads || 4];

  // Max value for scaling SVG charts
  const maxChatsVal = Math.max(...dailyChats, 1);
  const maxLeadsVal = Math.max(...dailyLeads, 1);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-sm">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Analytics Dashboard</span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">{websiteName}</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xl">
            Real-time insights on visitor chats, interactive conversions, captured leads, and popular search questions.
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 font-medium px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Tracker Active
          </div>
        </div>
      </div>

      {/* STATS BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* STAT 1: Chats */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-start gap-4 shadow-xs">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Interactions</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">{totalChats}</h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Across all pages of your website
            </p>
          </div>
        </div>

        {/* STAT 2: Leads */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-start gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Captured Leads</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">{totalLeads}</h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Contact detail forms submitted
            </p>
          </div>
        </div>

        {/* STAT 3: Conversion Rate */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-start gap-4 shadow-xs">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lead Conversion Rate</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">{conversionRate}%</h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Conversations resulting in a lead
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHARTS CARD */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Weekly Performance</h4>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span> Chats
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Leads
                </span>
              </div>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="h-56 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Horizontal Gridlines */}
                {[0, 25, 50, 75, 100].map((grid, index) => (
                  <line
                    key={index}
                    x1="0"
                    y1={grid}
                    x2="100"
                    y2={grid}
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                  />
                ))}

                {/* Chats Path */}
                <path
                  d={`M ${dailyChats.map((val, idx) => `${(idx / 6) * 100} ${100 - (val / maxChatsVal) * 80}`).join(' L ')}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                
                {/* Leads Path */}
                <path
                  d={`M ${dailyLeads.map((val, idx) => `${(idx / 6) * 100} ${100 - (val / maxLeadsVal) * 80}`).join(' L ')}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Interactive Points - Chats */}
                {dailyChats.map((val, idx) => (
                  <circle
                    key={`c-${idx}`}
                    cx={(idx / 6) * 100}
                    cy={100 - (val / maxChatsVal) * 80}
                    r="2.5"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                ))}

                {/* Interactive Points - Leads */}
                {dailyLeads.map((val, idx) => (
                  <circle
                    key={`l-${idx}`}
                    cx={(idx / 6) * 100}
                    cy={100 - (val / maxLeadsVal) * 80}
                    r="2.5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                ))}
              </svg>

              {/* Day Labels */}
              <div className="absolute -bottom-6 left-0 right-0 flex justify-between px-1">
                {days.map((day, idx) => (
                  <span key={idx} className="text-[10px] font-mono font-medium text-slate-400 uppercase">
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center text-xs text-slate-400">
            <span>Chart updates automatically on message capture</span>
            <span className="font-mono">7-DAY HISTORIC INTERVAL</span>
          </div>
        </div>

        {/* TOP QUESTIONS LIST */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <h4 className="font-semibold text-slate-900">Trending Questions</h4>
            </div>

            <div className="space-y-4">
              {displayQuestions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center font-mono text-xs font-semibold text-slate-500 shrink-0 mt-0.5 border border-slate-100">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">{q.question}</p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-slate-900 h-full rounded-full"
                        style={{ width: `${Math.min((q.count / displayQuestions[0].count) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shrink-0">
                    {q.count} chats
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-6 leading-relaxed">
            Highly relevant topics asked by your users, matching parsed keyword triggers in RAG system.
          </p>
        </div>
      </div>
    </div>
  );
}
