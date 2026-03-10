import { useState, useEffect } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { AgentPanel } from './components/AgentPanel';
import { ResearchDrawer } from './components/ResearchDrawer';
import { ConfigProvider, useConfig } from './config';
import { ApiClientProvider } from './apiClient';

function AppContent() {
  const [chicagoTime, setChicagoTime] = useState<string>('');
  const [isResearchDrawerOpen, setIsResearchDrawerOpen] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const { config, loading } = useConfig();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      setChicagoTime(formatter.format(now));
    };

    updateTime(); // Initial call
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Show loading state while config loads
  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xs">
          <span className="text-green-500">$</span> loading...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-green-400 flex flex-col overflow-hidden">
      <header className="border-b border-cyan-900/30 bg-gradient-to-b from-slate-900/50 to-black">
        <div className="px-2 py-1 flex items-center gap-2">
          {/* Logo */}
          <img 
            src="/logo.png" 
            alt="Claw Logo" 
            className="h-6 w-auto cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => setShowLogoModal(true)}
          />
          
          <span className="text-cyan-400 text-xs font-bold">{config.project.name}</span>
          <span className="text-slate-600">|</span>
          <span className="text-green-400 text-xs">{config.project.version}</span>
          <span className="text-slate-500 text-xs ml-auto">[{config.project.statusText}]</span>
          
          {/* Research Drawer Button */}
          <button
            onClick={() => setIsResearchDrawerOpen(!isResearchDrawerOpen)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/50 hover:bg-slate-800/50 border border-cyan-900/40 rounded transition-colors"
            title="Toggle Research Drawer"
          >
            <span className="text-cyan-400">📚</span>
            <span className="text-slate-300 text-xs font-medium">Research</span>
            {isResearchDrawerOpen && (
              <span className="text-cyan-400 text-[10px]">▶</span>
            )}
            {!isResearchDrawerOpen && (
              <span className="text-slate-500 text-[10px]">◀</span>
            )}
          </button>
          
          {chicagoTime && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 text-xs font-mono">{chicagoTime}</span>
            </>
          )}
        </div>
      </header>
      <main className="flex flex-1 min-h-0 overflow-hidden">
        <div className="border-r border-cyan-900/20 bg-black overflow-auto flex-1">
          <KanbanBoard />
        </div>
        <div className="bg-black overflow-auto w-auto flex-shrink-0">
          <AgentPanel />
        </div>
      </main>
      <ResearchDrawer 
        isOpen={isResearchDrawerOpen} 
        onToggle={() => setIsResearchDrawerOpen(!isResearchDrawerOpen)} 
      />
      
      {/* Logo Modal */}
      {showLogoModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowLogoModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <img 
              src="/logo.png" 
              alt="Claw Agent Ops Dashboard Logo" 
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setShowLogoModal(false)}
              className="absolute top-2 right-2 bg-slate-900/80 text-cyan-400 px-2 py-1 rounded text-xs hover:bg-slate-800"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ConfigProvider>
      <ApiClientProvider>
        <AppContent />
      </ApiClientProvider>
    </ConfigProvider>
  );
}

export default App;