import React from 'react';

interface DataTableProps {
  csvData: string;
}

const DataTable: React.FC<DataTableProps> = ({ csvData }) => {
  const rows = csvData.trim().split('\n');
  const headers = rows.length > 0 ? rows[0].split(',').map(h => h.replace(/"/g, '')) : [];
  const data = rows.length > 1 ? rows.slice(1).map(row => row.split(',').map(cell => cell.replace(/"/g, ''))) : [];

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

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <div className="p-4 flex justify-between items-center border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Extracted Data</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCsvDownload}
            className="bg-green-600 text-white font-medium py-2 px-4 rounded-md hover:bg-green-500 transition-colors duration-200 text-sm"
          >
            Download CSV
          </button>
        </div>
      </div>
      <div className="flex-grow overflow-auto">
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0">
            <tr>
              {headers.map((header, index) => (
                <th key={index} scope="col" className="px-4 py-3 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-800 hover:bg-gray-700/50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2 whitespace-nowrap">
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