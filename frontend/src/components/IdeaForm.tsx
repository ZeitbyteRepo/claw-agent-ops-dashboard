import { useState, useEffect } from 'react';
import { createTask, fetchTasks } from '../api';

interface IdeaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onIdeaCreated?: (idea: any) => void;
}

export function IdeaForm({ isOpen, onClose, onIdeaCreated }: IdeaFormProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());
  const [codeWarning, setCodeWarning] = useState<string | null>(null);

  // Fetch existing idea codes on mount
  useEffect(() => {
    if (isOpen) {
      fetchTasks('ideas').then(response => {
        const tasks = response.value || response; // Handle both {value: [...]} and [...] formats
        const codes = new Set<string>(tasks.map((t: any) => t.code?.toUpperCase()).filter(Boolean));
        setExistingCodes(codes);
      });
    }
  }, [isOpen]);

  // Check for duplicate code as user types
  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setCode(upperValue);
    if (upperValue && existingCodes.has(upperValue)) {
      setCodeWarning(`Code "${upperValue}" already exists`);
    } else {
      setCodeWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!code.trim()) {
      setError('Code is required (must be unique)');
      return;
    }

    if (existingCodes.has(code.trim().toUpperCase())) {
      setError(`Code "${code}" already exists`);
      return;
    }

    if (!notes.trim()) {
      setError('Notes are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const idea = await createTask({
        title: title.trim(),
        status: 'ideas',
        notes: notes.trim(),
        code: code.trim().toUpperCase(),
      });
      
      onIdeaCreated?.(idea);
      setTitle('');
      setNotes('');
      setCode('');
      setCodeWarning(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create idea');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-slate-950 border border-cyan-900/50 rounded-lg shadow-xl shadow-cyan-900/20 w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 bg-gradient-to-b from-cyan-900/30 to-slate-950 border-b border-cyan-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-sm">💡</span>
            <span className="text-slate-200 text-sm font-medium">New Idea</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          {/* Title */}
          <div>
            <label className="block text-slate-400 text-xs mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What's the idea?"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Code (required, must be unique) */}
          <div>
            <label className="block text-slate-400 text-xs mb-1">Code * (must be unique)</label>
            <input
              type="text"
              value={code}
              onChange={e => handleCodeChange(e.target.value)}
              placeholder="e.g., TODO, BUG, FEAT"
              className={`w-full bg-slate-900 border rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none font-mono ${
                codeWarning ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-cyan-500'
              }`}
            />
            {codeWarning ? (
              <p className="text-red-400 text-[10px] mt-1">⚠️ {codeWarning}</p>
            ) : (
              <p className="text-slate-600 text-[10px] mt-1">A unique tag to identify this idea</p>
            )}
          </div>

          {/* Notes (required) */}
          <div>
            <label className="block text-slate-400 text-xs mb-1">Notes *</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe the idea in detail..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-xs bg-red-900/20 border border-red-800/50 rounded px-2 py-1">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !code.trim() || !notes.trim() || !!codeWarning}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                saving || !title.trim() || !code.trim() || !notes.trim() || !!codeWarning
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-600 text-white hover:bg-cyan-500'
              }`}
            >
              {saving ? 'Creating...' : 'Create Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
