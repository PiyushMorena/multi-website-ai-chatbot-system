import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import ChatWidget from './components/ChatWidget';

export default function App() {
  const [isWidgetMode, setIsWidgetMode] = useState(false);

  useEffect(() => {
    // Detect if we are in embedded widget mode based on URL path
    const path = window.location.pathname;
    if (path.startsWith('/widget')) {
      setIsWidgetMode(true);
    } else {
      setIsWidgetMode(false);
    }
  }, []);

  if (isWidgetMode) {
    return <ChatWidget />;
  }

  return <AdminDashboard />;
}
