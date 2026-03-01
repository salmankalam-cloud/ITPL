import React from 'react';
import { HistoryEntry } from '../App';
import { ClockIcon } from './icons/ClockIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HistoryLogProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}

const HistoryLog: React.FC<HistoryLogProps> = ({ history, onSelect, onClear }) => {
  return (
    <section className="bg-gray-800/50 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-200">Extraction History</h2>
        <button
          onClick={onClear}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-md px-3 py-2 transition-colors"
          aria-label="Clear all history"
        >
          <TrashIcon className="w-4 h-4" />
          Clear All
        </button>
      </div>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className="w-full flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 text-left"
          >
            <img 
              src={entry.imageUrl} 
              alt="Extraction thumbnail" 
              className="w-24 h-16 object-cover rounded-md flex-shrink-0 bg-gray-700"
            />
            <div className="flex-grow overflow-hidden">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ClockIcon className="w-3 h-3" />
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-gray-300 mt-1 text-sm truncate">
                Extracted {entry.csvData.trim().split('\n').length - 1} data rows.
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default HistoryLog;
