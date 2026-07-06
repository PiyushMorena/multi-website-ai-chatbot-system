export interface Website {
  id: string;
  name: string;
  url: string;
  welcomeMessage: string;
  contactPageUrl: string;
  leadCaptureEnabled: boolean;
  createdAt: string;
  status: 'idle' | 'scraping' | 'scraped' | 'failed';
}

export interface WebPage {
  id: string;
  websiteId: string;
  url: string;
  title: string;
  content: string;
  charCount: number;
  lastScraped: string;
}

export interface Lead {
  id: string;
  websiteId: string;
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  ipAddress: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'closed';
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  websiteId: string;
  leadId?: string;
  visitorIp: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  pageVisited: string;
  metadata?: {
    browser?: string;
    country?: string;
    leadCaptureStep?: 'name' | 'email' | 'phone' | 'completed';
    leadName?: string;
    leadEmail?: string;
    leadPhone?: string;
  };
}

export interface ChatAnalytics {
  totalChats: number;
  totalLeads: number;
  conversionRate: number; // percentage of chats that became leads
  topQuestions: { question: string; count: number }[];
  chatsByDay: { date: string; count: number }[];
  leadsByDay: { date: string; count: number }[];
}
