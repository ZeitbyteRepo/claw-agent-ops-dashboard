import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

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

interface ResearchPopupProps {
  doc: ResearchDoc | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ResearchPopup({ doc, isOpen, onClose }: ResearchPopupProps) {
  const [showRaw, setShowRaw] = useState(false);

  if (!isOpen || !doc) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-slate-950 border border-purple-900/50 rounded-lg shadow-xl shadow-purple-900/20 w-full max-w-[900px] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-800 flex items-start justify-between bg-gradient-to-b from-purple-900/20 to-slate-950 rounded-t-lg">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-purple-400">📄</span>
              <span className="text-slate-200 font-medium text-sm truncate">{doc.title}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
              <span className="text-purple-400">{doc.source}</span>
              {doc.pinned && (
                <>
                  <span>•</span>
                  <span className="text-amber-400">📌 Pinned</span>
                </>
              )}
              <span>•</span>
              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
            {doc.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {doc.tags.map((tag, i) => (
                  <span 
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 bg-purple-900/30 text-purple-300 border border-purple-800/50 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Raw/Rendered Toggle */}
            <button
              onClick={() => setShowRaw(!showRaw)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                showRaw 
                  ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
              title={showRaw ? 'Show rendered markdown' : 'Show raw markdown'}
            >
              {showRaw ? '📝 Raw' : '📄 Rendered'}
            </button>
            <button 
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {doc.summary && (
            <div className="mb-4 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded">
              <div className="text-[10px] text-slate-500 uppercase mb-1">Summary</div>
              <div className="text-slate-300 text-xs leading-relaxed">{doc.summary}</div>
            </div>
          )}

          {doc.content ? (
            showRaw ? (
              /* Raw markdown view */
              <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-slate-900/50 p-4 rounded border border-slate-800 overflow-x-auto">
                {doc.content}
              </pre>
            ) : (
              /* Rendered markdown view - standard prose styling */
              <article className="prose prose-invert prose-slate max-w-none
                prose-headings:font-bold
                prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-4
                prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
                prose-p:my-3
                prose-li:my-1
                prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-slate-900 prose-pre:rounded-lg prose-pre:p-4
                prose-strong:font-bold
                prose-a:text-blue-400 hover:prose-a:underline
                prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic
                prose-hr:my-6
                prose-table:w-full prose-table:border-collapse
                prose-th:bg-slate-800 prose-th:p-2 prose-th:border prose-th:border-slate-700
                prose-td:p-2 prose-td:border prose-td:border-slate-700
              ">
                <ReactMarkdown>{doc.content}</ReactMarkdown>
              </article>
            )
          ) : (
            <div className="text-slate-500 italic text-center py-8">No content available</div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-2 border-t border-slate-800 flex items-center justify-between bg-slate-900/30 rounded-b-lg">
          <div className="text-[10px] text-slate-500">
            Research Document #{doc.id} • {doc.content ? `${doc.content.length} chars` : 'No content'}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
