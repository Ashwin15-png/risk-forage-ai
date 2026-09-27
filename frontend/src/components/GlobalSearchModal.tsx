import React, { useState, useEffect } from 'react';
import { Search, X, Server, Shield, AlertTriangle, Layers, TrendingDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../services/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.search(query.trim());
        setResults(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (link: string) => {
    navigate(link);
    onClose();
  };

  const hasResults = results && (
    results.assets?.length > 0 ||
    results.services?.length > 0 ||
    results.vulnerabilities?.length > 0 ||
    results.controls?.length > 0 ||
    results.investments?.length > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0D1B12] border border-[rgba(74,222,128,0.3)] rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[rgba(74,222,128,0.15)] bg-[#102417]">
          <Search className="w-5 h-5 text-[#4ADE80] mr-3 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none font-mono"
            placeholder="Search assets, services, CVEs, security controls, or investments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-white mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#06110B] border border-[rgba(74,222,128,0.2)] rounded">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 font-sans">
          {loading && (
            <div className="py-8 text-center text-slate-400 text-xs font-mono">
              <div className="inline-block w-5 h-5 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin mr-2 align-middle" />
              Searching cybersecurity telemetry records...
            </div>
          )}

          {!loading && !query && (
            <div className="py-8 text-center text-slate-500 text-xs font-mono">
              Type at least 2 characters to search across all 43 assets, 12 services, and controls.
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <div className="py-8 text-center text-slate-400 text-xs font-mono">
              No matching cybersecurity records found for "{query}".
            </div>
          )}

          {!loading && results && (
            <>
              {/* Assets */}
              {results.assets?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5 font-mono">
                    <Server className="w-3.5 h-3.5 text-[#4ADE80]" />
                    Monitored Assets ({results.assets.length})
                  </div>
                  <div className="space-y-1">
                    {results.assets.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.link)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#102417] border border-transparent hover:border-[rgba(74,222,128,0.2)] transition-all text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-200 group-hover:text-[#4ADE80]">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{item.subtitle}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#06110B] text-slate-300 border border-[rgba(74,222,128,0.15)]">
                            Risk {item.risk}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#4ADE80] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {results.services?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5 font-mono">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Business Services ({results.services.length})
                  </div>
                  <div className="space-y-1">
                    {results.services.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.link)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#102417] border border-transparent hover:border-[rgba(74,222,128,0.2)] transition-all text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-200 group-hover:text-cyan-300">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{item.subtitle}</div>
                        </div>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#06110B] text-slate-300 border border-[rgba(74,222,128,0.15)]">
                          Risk {item.risk}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vulnerabilities */}
              {results.vulnerabilities?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5 font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Vulnerabilities ({results.vulnerabilities.length})
                  </div>
                  <div className="space-y-1">
                    {results.vulnerabilities.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.link)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#102417] border border-transparent hover:border-[rgba(74,222,128,0.2)] transition-all text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-rose-300">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-400">{item.subtitle}</div>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          item.severity === 'Critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {item.severity}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls */}
              {results.controls?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5 font-mono">
                    <Shield className="w-3.5 h-3.5 text-[#4ADE80]" />
                    Security Controls ({results.controls.length})
                  </div>
                  <div className="space-y-1">
                    {results.controls.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.link)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#102417] border border-transparent hover:border-[rgba(74,222,128,0.2)] transition-all text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-[#4ADE80]">{item.title}</div>
                          <div className="text-xs text-slate-400 font-mono">{item.subtitle}</div>
                        </div>
                        <span className="text-xs font-mono text-[#4ADE80]">
                          {item.effectiveness}% Eff.
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Investments */}
              {results.investments?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5 font-mono">
                    <TrendingDown className="w-3.5 h-3.5 text-[#4ADE80]" />
                    Investment Initiatives ({results.investments.length})
                  </div>
                  <div className="space-y-1">
                    {results.investments.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.link)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#102417] border border-transparent hover:border-[rgba(74,222,128,0.2)] transition-all text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-[#4ADE80]">{item.title}</div>
                          <div className="text-xs text-slate-400 font-mono">{item.subtitle}</div>
                        </div>
                        <span className="text-xs font-mono text-[#4ADE80]">
                          -{item.reduction} pts
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
