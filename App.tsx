import React, { useState, useCallback, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import DataTable from './components/DataTable';
import Spinner from './components/Spinner';
import { 
  performOCR, 
  extractDataFromText, 
  ExtractionMode, 
  fixOCRNumberErrors, 
  fixOCRCharacterErrors 
} from './services/ocrService';
import { fileToBase64 } from './utils/fileUtils';
import HistoryLog from './components/HistoryLog';
import { Settings2, Zap } from 'lucide-react';

export interface HistoryEntry {
  id: string;
  imageUrl: string;
  csvData: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [imageData, setImageData] = useState<{ url: string; file: File } | null>(null);
  const [extractedCsv, setExtractedCsv] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mode, setMode] = useState<ExtractionMode>('reversed');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [fixNumbers, setFixNumbers] = useState(true);
  const [fixChars, setFixChars] = useState(true);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('extractionHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
        if (history.length > 0) {
            localStorage.setItem('extractionHistory', JSON.stringify(history));
        } else {
            localStorage.removeItem('extractionHistory');
        }
    } catch (e) {
        console.error("Failed to save history to localStorage", e);
    }
  }, [history]);

  const handleImageUpload = (file: File) => {
    setImageData({ url: URL.createObjectURL(file), file });
    setExtractedCsv(null);
    setError(null);
  };

  const handleExtractData = useCallback(async () => {
    if (!imageData || !imageData.file || imageData.file.size === 0) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedCsv(null);
    setOcrProgress(0);

    try {
      // Step 1: Perform OCR
      const rawText = await performOCR(imageData.file, (progress) => {
        setOcrProgress(Math.round(progress * 100));
      });

      // Step 2: Apply Enhancements
      let processedText = rawText;
      if (fixNumbers) processedText = fixOCRNumberErrors(processedText);
      if (fixChars) processedText = fixOCRCharacterErrors(processedText);

      // Step 3: Extract Data using the selected mode logic
      const result = extractDataFromText(processedText, mode);
      setExtractedCsv(result);

      const base64Image = await fileToBase64(imageData.file);
      const mimeType = imageData.file.type;
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      const newEntry: HistoryEntry = {
        id: crypto.randomUUID(),
        imageUrl: dataUrl,
        csvData: result,
        timestamp: Date.now(),
      };
      setHistory(prevHistory => [newEntry, ...prevHistory]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to extract data: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [imageData]);

  const handleSelectHistory = (entry: HistoryEntry) => {
    setImageData({ url: entry.imageUrl, file: new File([], "from_history.png", {type: 'image/png'}) });
    setExtractedCsv(entry.csvData);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the entire extraction history? This action cannot be undone.')) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-5xl mx-auto space-y-12">
        <div>
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
              ITPL-WIRING TABLE
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
              Paste your wiring diagram screenshots (Ctrl+V) and extract terminal data using Tesseract OCR.
            </p>
          </header>

          <main className="bg-gray-800/50 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm border border-gray-700">
            <div className="mb-8 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
              <div className="flex items-center gap-2 mb-4 text-indigo-400">
                <Settings2 size={20} />
                <h2 className="font-semibold">Processing Mode</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['standard', 'advanced', 'reversed'] as ExtractionMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      mode === m 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500 italic">
                {mode === 'standard' && 'Standard: Uses dot (.) notation (e.g., "1. P4L-25")'}
                {mode === 'advanced' && 'Advanced: Uses box numbers as source (e.g., "21 IA 4FA-4*")'}
                {mode === 'reversed' && 'Reversed: Device-Terminal on left, Source on right (e.g., "4FU4-1 - 1")'}
              </p>

              <div className="mt-6 pt-6 border-t border-gray-700/50">
                <div className="flex items-center gap-2 mb-4 text-emerald-400">
                  <Zap size={20} />
                  <h2 className="font-semibold">OCR Enhancements</h2>
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={fixNumbers} 
                      onChange={(e) => setFixNumbers(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Fix Number Recognition</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={fixChars} 
                      onChange={(e) => setFixChars(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Fix Character Recognition</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col space-y-6">
                <ImageUploader onImageUpload={handleImageUpload} imageUrl={imageData?.url} />
                
                <button
                  onClick={handleExtractData}
                  disabled={!imageData || !imageData.file || imageData.file.size === 0 || isLoading}
                  className="w-full flex items-center justify-center bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed disabled:text-gray-400 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100"
                >
                  {isLoading ? (
                    <>
                      <Spinner />
                      Extracting Data...
                    </>
                  ) : (
                    'Extract Data to CSV'
                  )}
                </button>
              </div>

              <div className="flex flex-col justify-center items-center bg-gray-900/70 rounded-xl p-4 min-h-[300px] lg:min-h-0">
                {isLoading && (
                   <div className="text-center text-gray-400 w-full px-4">
                      <div className="relative w-full h-2 bg-gray-800 rounded-full mb-4 overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                      <Spinner className="w-12 h-12 mb-4 mx-auto" />
                      <p className="text-lg font-semibold">Tesseract is analyzing your image...</p>
                      <p className="text-sm text-indigo-400 font-mono">{ocrProgress}% Complete</p>
                  </div>
                )}
                {error && (
                  <div className="text-center text-red-400 bg-red-900/30 p-4 rounded-lg">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                  </div>
                )}
                {!isLoading && !error && extractedCsv && (
                  <DataTable csvData={extractedCsv} />
                )}
                {!isLoading && !error && !extractedCsv && (
                  <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">Your extracted data will appear here.</p>
                    <p>Upload an image and click "Extract Data" to begin.</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        {history.length > 0 && (
            <HistoryLog 
              history={history}
              onSelect={handleSelectHistory}
              onClear={handleClearHistory}
            />
        )}
      </div>
    </div>
  );
};

export default App;
