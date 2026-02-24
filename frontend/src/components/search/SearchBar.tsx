import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../api/client';
import type { Person } from '../../types';
import Avatar from '../ui/Avatar';

interface Props {
  treeId?: string;
  onSelect?: (person: Person) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchBar({ treeId, onSelect }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    searchApi
      .search({ q: debouncedQuery, tree_id: treeId })
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setIsOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, treeId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (person: Person) => {
    setQuery('');
    setIsOpen(false);
    if (onSelect) {
      onSelect(person);
    } else {
      navigate(`/persons/${person.id}`);
    }
  };

  const fullName = (p: Person) =>
    [p.last_name, p.first_name, p.patronymic].filter(Boolean).join(' ');

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          className="input pl-9 w-full"
          placeholder="Поиск по имени..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? (
            <div className="animate-spin h-4 w-4 border-b-2 border-indigo-500 rounded-full" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2a7.5 7.5 0 010 14.65z" />
            </svg>
          )}
        </div>
        {query && (
          <button
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => { setQuery(''); setIsOpen(false); setResults([]); }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((person) => (
            <button
              key={person.id}
              onClick={() => handleSelect(person)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left transition-colors"
            >
              <Avatar url={person.avatar_thumb_url} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{fullName(person)}</p>
                {person.birth_date && (
                  <p className="text-xs text-slate-400">
                    {new Date(person.birth_date).getFullYear()}
                    {person.birth_place && ` · ${person.birth_place}`}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && !loading && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-3 py-4 text-center text-sm text-slate-400">
          Ничего не найдено
        </div>
      )}
    </div>
  );
}
