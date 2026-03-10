import { useState } from 'react';

interface TableBlockProps {
  headers: string[];
  rows: string[][];
  maxWidth?: number;
}

export function TableBlock({ headers, rows, maxWidth = 400 }: TableBlockProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollLeft = target.scrollLeft;
    const maxScroll = target.scrollWidth - target.clientWidth;
    const percent = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
    
    setIsScrolled(scrollLeft > 10);
    setScrollPercent(percent);
  };

  const hasOverflow = headers.length > 3 || rows.some(row => row.length > 3);

  return (
    <div className="table-block-wrapper my-1.5">
      {/* Scroll indicator for overflow */}
      {hasOverflow && (
        <div className="table-scroll-indicator flex items-center justify-between mb-1 text-[9px] text-slate-500">
          <span className={isScrolled ? 'opacity-100' : 'opacity-0'}>← scroll</span>
          <div className="flex-1 mx-2 h-0.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan-500/50 transition-all duration-150"
              style={{ width: `${scrollPercent}%`, marginLeft: isScrolled ? '0' : 'auto' }}
            />
          </div>
          <span className={scrollPercent < 90 ? 'opacity-100' : 'opacity-0'}>scroll →</span>
        </div>
      )}
      
      {/* Table container with horizontal scroll */}
      <div 
        className={`table-block-container overflow-x-auto rounded border border-slate-800/50 ${hasOverflow ? 'cursor-grab' : ''}`}
        style={{ maxWidth: `${maxWidth}px` }}
        onScroll={handleScroll}
      >
        <table className="table-block w-full text-xs">
          {/* Header row */}
          <thead className="table-head bg-slate-900/80">
            <tr className="border-b border-cyan-500/30">
              {headers.map((header, idx) => (
                <th 
                  key={idx} 
                  className="table-header-cell px-2 py-1 text-left text-cyan-400 font-semibold whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Data rows */}
          <tbody className="table-body">
            {rows.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                className={`table-row border-b border-slate-800/30 last:border-b-0 hover:bg-slate-800/20 transition-colors`}
              >
                {row.map((cell, cellIdx) => (
                  <td 
                    key={cellIdx} 
                    className={`table-cell px-2 py-1 whitespace-nowrap ${
                      cellIdx === 0 ? 'text-slate-300 font-medium' : 'text-slate-400'
                    }`}
                  >
                    {/* First cell gets special treatment */}
                    {cellIdx === 0 && cell.match(/^#\d+$/) ? (
                      <span className="text-cyan-400">{cell}</span>
                    ) : cellIdx === 0 && cell.match(/^\d+$/) ? (
                      <span className="text-amber-400 tabular-nums">{cell}</span>
                    ) : cell.match(/^https?:\/\//) ? (
                      <a 
                        href={cell} 
                        className="text-cyan-400 hover:text-cyan-300 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {new URL(cell).hostname}
                      </a>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Row count footer */}
      {rows.length > 5 && (
        <div className="table-footer mt-1 text-[9px] text-slate-500 text-right">
          {rows.length} rows
        </div>
      )}
    </div>
  );
}

// Compact variant for inline tables
export function TableBlockCompact({ headers, rows }: TableBlockProps) {
  return (
    <div className="table-block-compact overflow-x-auto my-1">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-slate-700">
            {headers.map((h, i) => (
              <th key={i} className="px-1.5 py-0.5 text-cyan-400/80 font-medium text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 5).map((row, i) => (
            <tr key={i} className="border-b border-slate-800/30">
              {row.map((cell, j) => (
                <td key={j} className="px-1.5 py-0.5 text-slate-400">{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length > 5 && (
            <tr>
              <td colSpan={headers.length} className="px-1.5 py-0.5 text-slate-500 italic">
                +{rows.length - 5} more rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
