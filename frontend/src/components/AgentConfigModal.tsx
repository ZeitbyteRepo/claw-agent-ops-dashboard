import { useState, useEffect, useCallback } from 'react';
import { fetchAgentConfig, saveAgentConfig } from '../api';
import { AgentConfig, AgentConfigFile, CONFIG_TABS, ConfigTabId } from '../types';

interface AgentConfigModalProps {
  agentId: string;
  agentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentConfigModal({ agentId, agentName, isOpen, onClose }: AgentConfigModalProps) {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [activeTab, setActiveTab] = useState<ConfigTabId>('SOUL.md');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ saved: string[]; errors: string[] } | null>(null);

  // Load config when modal opens
  useEffect(() => {
    if (isOpen && agentId) {
      setLoading(true);
      setError(null);
      setSaveResult(null);
      
      fetchAgentConfig(agentId)
        .then(cfg => {
          setConfig(cfg);
          // Set first tab as active
          if (cfg.files.length > 0) {
            setActiveTab(cfg.files[0].filename as ConfigTabId);
          }
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Failed to load config');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, agentId]);

  // Get current file content
  const getCurrentFile = useCallback((): AgentConfigFile | undefined => {
    return config?.files.find(f => f.filename === activeTab);
  }, [config, activeTab]);

  // Update current file content
  const updateCurrentFile = useCallback((content: string) => {
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map(f =>
          f.filename === activeTab
            ? { ...f, content, modified: true }
            : f
        ),
      };
    });
  }, [activeTab]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = config?.files.some(f => f.modified) ?? false;

  // Save all modified files
  const handleSave = async () => {
    if (!config || saving) return;
    
    setSaving(true);
    setError(null);
    setSaveResult(null);
    
    try {
      const result = await saveAgentConfig(agentId, config.files);
      
      if (result.success) {
        setSaveResult({ saved: result.saved, errors: result.errors });
        // Clear modified flags
        setConfig(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            files: prev.files.map(f => ({ ...f, modified: false })),
          };
        });
        
        // Auto-close save result after 3 seconds
        setTimeout(() => setSaveResult(null), 3000);
      } else {
        setError('Failed to save changes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    onClose();
  };

  // Get tab info
  const getTabInfo = (tabId: string) => {
    return CONFIG_TABS.find(t => t.id === tabId);
  };

  if (!isOpen) return null;

  const currentFile = getCurrentFile();
  const tabInfo = getTabInfo(activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-950 border border-cyan-900/50 rounded-lg shadow-2xl w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-cyan-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-semibold text-sm">AGENT CONFIG</span>
            <span className="text-slate-500">|</span>
            <span className="text-green-400 text-sm">{agentName}</span>
            <span className="text-slate-600 text-xs">({agentId.slice(0, 8)})</span>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-amber-400 text-xs flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                UNSAVED
              </span>
            )}
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="Close (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-2 py-1 bg-slate-900/50 border-b border-cyan-900/20 flex items-center gap-1 overflow-x-auto">
          {CONFIG_TABS.map(tab => {
            const file = config?.files.find(f => f.filename === tab.id);
            const isActive = activeTab === tab.id;
            const isModified = file?.modified ?? false;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-sm transition-all flex items-center gap-1.5 whitespace-nowrap
                  ${isActive
                    ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }
                `}
                title={tab.description}
              >
                <span>{tab.label}</span>
                {isModified && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-400' : 'bg-amber-500/70'}`}></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab description */}
        {tabInfo && (
          <div className="px-4 py-1 bg-slate-900/30 border-b border-cyan-900/10">
            <span className="text-slate-500 text-xs">{tabInfo.description}</span>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex-col min-h-0 flex">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-green-400 text-sm">
                <span className="text-green-500">&gt;</span> loading config...
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-red-400 text-sm">
                <span className="text-red-500">[ERROR]</span> {error}
              </div>
            </div>
          ) : currentFile ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Editor */}
              <div className="flex-1 p-2 min-h-0">
                <textarea
                  value={currentFile.content}
                  onChange={(e) => updateCurrentFile(e.target.value)}
                  className="w-full h-full bg-slate-950 text-green-300 font-mono text-xs p-3 border border-cyan-900/30 rounded-sm resize-none focus:outline-none focus:border-cyan-600/50 focus:ring-1 focus:ring-cyan-600/30"
                  placeholder={`# ${activeTab}\n\nStart editing...`}
                  spellCheck={false}
                />
              </div>
              
              {/* Status bar */}
              <div className="px-4 py-1.5 bg-slate-900/50 border-t border-cyan-900/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-500">
                  <span>{currentFile.content.split('\n').length} lines</span>
                  <span>{currentFile.content.length} chars</span>
                  <span>{activeTab}</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentFile.modified && (
                    <span className="text-amber-400">Modified</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-slate-500 text-sm">No file selected</div>
            </div>
          )}
        </div>

        {/* Save result notification */}
        {saveResult && (
          <div className="px-4 py-2 bg-green-900/30 border-t border-green-700/30 text-xs">
            {saveResult.saved.length > 0 && (
              <span className="text-green-400">
                ✓ Saved: {saveResult.saved.join(', ')}
              </span>
            )}
            {saveResult.errors.length > 0 && (
              <span className="text-red-400 ml-2">
                ✗ Errors: {saveResult.errors.join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-t from-slate-900 to-slate-950 border-t border-cyan-900/30 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span className="text-cyan-400">TIP:</span> Changes are stored in agent workspace files
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white border border-slate-700 rounded-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className={`
                px-4 py-1.5 text-xs font-medium rounded-sm transition-all flex items-center gap-2
                ${hasUnsavedChanges && !saving
                  ? 'bg-cyan-700 hover:bg-cyan-600 text-white border border-cyan-500'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }
              `}
            >
              {saving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
