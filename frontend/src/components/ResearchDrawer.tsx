import { useState, useEffect } from 'react';
import { ResearchPopup } from './ResearchPopup';
import { useConfig } from '../config';

interface ResearchDoc {
  id: number;
  title: string;
  source: string;
  tags: string[];
  summary: string;
  content: string;
  pinned: boolean;
  created_at: string;
}

interface ResearchDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ResearchDrawer({ isOpen, onToggle }: ResearchDrawerProps) {
  const { config } = useConfig();
  const apiBase = config.apiBase;
  
  const [docs, setDocs] = useState<ResearchDoc[]>([]);
  const [archivedDocs, setArchivedDocs] = useState<ResearchDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ResearchDoc | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);

  // Load research docs from API
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      
      // Load both active and archived docs
      Promise.all([
        fetch(`${apiBase}/api/research`).then(r => r.json()),
        fetch(`${apiBase}/api/research?archived=true`).then(r => r.json())
      ])
        .then(([activeData, archivedData]) => {
          const mapDocs = (data: any) => (data.value || data || []).map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            source: doc.path || '',
            tags: doc.tags ? doc.tags.split(',').map((t: string) => t.trim()) : [],
            summary: doc.summary || '',
            content: '',
            pinned: doc.pinned === 1 || doc.pinned === true,
            created_at: doc.created_at
          }));
          
          setDocs(mapDocs(activeData));
          setArchivedDocs(mapDocs(archivedData));
        })
        .catch(err => {
          console.error('Failed to fetch research docs:', err);
          setDocs([]);
          setArchivedDocs([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const pinnedDocs = docs.filter(d => d.pinned);

  const handleDocClick = async (doc: ResearchDoc) => {
    // Fetch full doc with content from API
    try {
      const res = await fetch(`${apiBase}/api/research/${doc.id}`);
      const fullDoc = await res.json();
      
      setSelectedDoc({
        ...doc,
        content: fullDoc.content || '',
        summary: fullDoc.summary || ''
      });
      setIsPopupOpen(true);
    } catch (err) {
      console.error('Failed to fetch research doc:', err);
      // Fallback to showing doc without content
      setSelectedDoc(doc);
      setIsPopupOpen(true);
    }
  };

  // Toggle pin status
  const handleTogglePin = async (e: React.MouseEvent, doc: ResearchDoc) => {
    e.stopPropagation(); // Don't trigger doc click

    try {
      const res = await fetch(`${apiBase}/api/research/${doc.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const updated = await res.json();

      // Update local state
      setDocs(prev => prev.map(d =>
        d.id === doc.id
          ? { ...d, pinned: updated.pinned === 1 || updated.pinned === true }
          : d
      ));
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Archive a research doc
  const handleArchive = async (e: React.MouseEvent, doc: ResearchDoc) => {
    e.stopPropagation(); // Don't trigger doc click

    try {
      await fetch(`${apiBase}/api/research/${doc.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      // Move doc from active to archived list
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      setArchivedDocs(prev => [...prev, doc]);
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  // Restore an archived research doc
  const handleRestore = async (e: React.MouseEvent, doc: ResearchDoc) => {
    e.stopPropagation();

    try {
      await fetch(`${apiBase}/api/research/${doc.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      // Move doc from archived to active list
      setArchivedDocs(prev => prev.filter(d => d.id !== doc.id));
      setDocs(prev => [...prev, doc]);
    } catch (err) {
      console.error('Failed to restore:', err);
    }
  };

  // Sort docs: pinned first, then by created_at
  const sortedDocs = [...docs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedDoc(null);
  };

  return (
    <>
      {/* Open drawer */}
      <div 
        className={`fixed right-0 top-0 bottom-0 z-50 w-80 bg-slate-950 border-l border-cyan-900/40 shadow-xl shadow-cyan-900/20 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-cyan-900/40 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">📚</span>
            <span className="text-slate-300 text-sm font-medium">Research</span>
            {pinnedDocs.length > 0 && (
              <span className="text-[10px] text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded">
                {pinnedDocs.length} pinned
              </span>
            )}
          </div>
          <button
            onClick={onToggle}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Close drawer"
          >
            <span className="text-lg">▶</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-slate-500 text-xs text-center py-8">
              <span className="text-green-500">&gt;</span> Loading research...
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-600 text-4xl mb-3">📚</div>
              <div className="text-slate-500 text-xs mb-2">No research documents yet</div>
              <div className="text-slate-600 text-[10px]">
                Pinned docs from agents will appear here
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Pinned section */}
              {pinnedDocs.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                    <span>📌</span> Pinned
                  </div>
                  {sortedDocs.filter(d => d.pinned).map(doc => (
                    <ResearchDocCard
                      key={doc.id}
                      doc={doc}
                      onClick={() => handleDocClick(doc)}
                      onTogglePin={(e) => handleTogglePin(e, doc)}
                      onArchive={(e) => handleArchive(e, doc)}
                    />
                  ))}
                </div>
              )}

              {/* All docs section */}
              <div>
                <div className="text-[10px] text-slate-500 uppercase mb-1.5">
                  All Documents ({docs.length})
                </div>
                {sortedDocs.filter(d => !d.pinned).map(doc => (
                  <ResearchDocCard
                    key={doc.id}
                    doc={doc}
                    onClick={() => handleDocClick(doc)}
                    onTogglePin={(e) => handleTogglePin(e, doc)}
                    onArchive={(e) => handleArchive(e, doc)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Archive Footer */}
        {archivedDocs.length > 0 && (
          <div className="border-t border-slate-800 bg-slate-900/30">
            <button
              onClick={() => setIsArchiveExpanded(!isArchiveExpanded)}
              className="w-full px-3 py-2 flex items-center justify-between text-slate-400 hover:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>📦</span>
                <span className="text-xs">Archived Research</span>
                <span className="text-[10px] text-slate-500">({archivedDocs.length})</span>
              </div>
              <span className={`text-[10px] transition-transform ${isArchiveExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>
            
            {isArchiveExpanded && (
              <div className="px-3 pb-3 max-h-40 overflow-y-auto">
                {archivedDocs.map(doc => (
                  <div
                    key={doc.id}
                    className="p-2 bg-slate-900/30 border border-slate-800/50 rounded mb-1.5 opacity-60 hover:opacity-100 cursor-pointer transition-opacity group flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0" onClick={() => handleDocClick(doc)}>
                      <div className="text-slate-400 text-xs truncate">{doc.title}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{doc.source}</div>
                    </div>
                    {/* Restore button */}
                    <button
                      onClick={(e) => handleRestore(e, doc)}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:text-green-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-colors"
                      title="Restore"
                    >
                      ↩️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


      </div>

      {/* Research Popup */}
      <ResearchPopup
        doc={selectedDoc}
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
      />
    </>
  );
}

// Research doc card component
function ResearchDocCard({
  doc,
  onClick,
  onTogglePin,
  onArchive
}: {
  doc: ResearchDoc;
  onClick: () => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="p-2 bg-slate-900/50 border border-slate-800 rounded hover:border-slate-700 cursor-pointer transition-colors mb-1.5 group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-slate-300 text-xs font-medium truncate">{doc.title}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{doc.source}</div>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-0.5">
          {/* Pin button */}
          <button
            onClick={onTogglePin}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              doc.pinned
                ? 'text-amber-400 bg-amber-900/30 hover:bg-amber-900/50'
                : 'text-slate-600 hover:text-amber-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100'
            }`}
            title={doc.pinned ? 'Unpin' : 'Pin'}
          >
            📌
          </button>
          {/* Archive button */}
          <button
            onClick={onArchive}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-colors"
            title="Archive"
          >
            📦
          </button>
        </div>
      </div>
      {doc.summary && (
        <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{doc.summary}</div>
      )}
      {doc.tags.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {doc.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="text-[8px] px-1 py-0.5 bg-slate-800 text-slate-500 rounded"
            >
              {tag}
            </span>
          ))}
          {doc.tags.length > 3 && (
            <span className="text-[8px] text-slate-600">+{doc.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
