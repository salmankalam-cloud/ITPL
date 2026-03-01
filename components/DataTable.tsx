import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';

interface DataTableProps {
  csvData: string;
}

const DataTable: React.FC<DataTableProps> = ({ csvData }) => {
  const [copiedColumn, setCopiedColumn] = useState<number | null>(null);
  
  const rows = csvData.trim().split('\n');
  const headers = rows.length > 0 ? rows[0].split(',').map(h => h.replace(/"/g, '')) : [];
  const data = rows.length > 1 ? rows.slice(1).map(row => {
    // Handle potential commas inside quotes
    const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
    const matches = row.match(regex);
    return matches ? matches.map(cell => cell.replace(/"/g, '')) : row.split(',').map(cell => cell.replace(/"/g, ''));
  }) : [];

  const handleCsvDownload = () => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'extracted_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyColumn = (index: number) => {
    const columnData = data.map(row => row[index] || '').join('\n');
    navigator.clipboard.writeText(columnData).then(() => {
      setCopiedColumn(index);
      setTimeout(() => setCopiedColumn(null), 2000);
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      <div className="p-4 flex justify-between items-center border-b border-gray-700 bg-gray-800/50">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Extracted Data</h3>
        <button
          onClick={handleCsvDownload}
          className="flex items-center gap-2 bg-emerald-600 text-white font-medium py-1.5 px-3 rounded-md hover:bg-emerald-500 transition-colors duration-200 text-xs"
        >
          <Download size={14} />
          Download CSV
        </button>
      </div>
      
      <div className="flex-grow overflow-auto">
        <table className="min-w-full text-xs text-left text-gray-300">
          <thead className="text-[10px] text-gray-500 uppercase bg-gray-800/80 sticky top-0 z-10">
            <tr>
              {headers.map((header, index) => (
                <th key={index} scope="col" className="px-4 py-3 font-semibold border-b border-gray-700">
                  <div className="flex flex-col gap-2">
                    <span className="whitespace-nowrap">{header}</span>
                    <button
                      onClick={() => copyColumn(index)}
                      className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded border transition-all ${
                        copiedColumn === index 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {copiedColumn === index ? <Check size={10} /> : <Copy size={10} />}
                      <span className="text-[9px]">{copiedColumn === index ? 'Copied' : 'Copy Col'}</span>
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-800/30 transition-colors">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2.5 font-mono text-gray-400">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;