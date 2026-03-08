import React, { useState, useCallback, useEffect } from "react";
import ImageUploader from "./components/ImageUploader";
import DataTable from "./components/DataTable";
import Spinner from "./components/Spinner";
import { extractDataFromImage } from "./services/geminiService";
import { fileToBase64 } from "./utils/fileUtils";
import HistoryLog from "./components/HistoryLog";
import Logo from "./assets/logo.jpeg";

export interface HistoryEntry {
  id: string;
  imageUrl: string;
  csvData: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [imageData, setImageData] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const [extractedCsv, setExtractedCsv] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("extractionHistory");
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
        localStorage.setItem("extractionHistory", JSON.stringify(history));
      } else {
        localStorage.removeItem("extractionHistory");
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
      setError("Please upload an image first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedCsv(null);

    try {
      const base64Image = await fileToBase64(imageData.file);
      const mimeType = imageData.file.type;

      const result = await extractDataFromImage(base64Image, mimeType);
      setExtractedCsv(result);

      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      const newEntry: HistoryEntry = {
        id: crypto.randomUUID(),
        imageUrl: dataUrl,
        csvData: result,
        timestamp: Date.now(),
      };
      setHistory((prevHistory) => [newEntry, ...prevHistory]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to extract data: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [imageData]);

  const handleSelectHistory = (entry: HistoryEntry) => {
    setImageData({
      url: entry.imageUrl,
      file: new File([], "from_history.png", { type: "image/png" }),
    });
    setExtractedCsv(entry.csvData);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to clear the entire extraction history? This action cannot be undone."
      )
    ) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-5xl mx-auto space-y-12">
        <div>
          <header className="text-center mb-8 flex flex-col gap-2 items-center">
            <img src={Logo} className="mt-2 mb-2 h-[100px]"/>
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Image to Excel Extractor
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
              Upload an image of a table or connection diagram, and our AI will
              convert it into a structured CSV file ready for Excel.
            </p>
          </header>

          <main className="bg-gray-800/50 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm border border-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col space-y-6">
                <ImageUploader
                  onImageUpload={handleImageUpload}
                  imageUrl={imageData?.url}
                />

                <button
                  onClick={handleExtractData}
                  disabled={
                    !imageData ||
                    !imageData.file ||
                    imageData.file.size === 0 ||
                    isLoading
                  }
                  className="w-full flex items-center justify-center bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed disabled:text-gray-400 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100"
                >
                  {isLoading ? (
                    <>
                      <Spinner />
                      Extracting Data...
                    </>
                  ) : (
                    "Extract Data to CSV"
                  )}
                </button>
              </div>

              <div className="flex flex-col justify-center items-center bg-gray-900/70 rounded-xl p-4 min-h-[300px] lg:min-h-0">
                {isLoading && (
                  <div className="text-center text-gray-400">
                    <Spinner className="w-12 h-12 mb-4" />
                    <p className="text-lg font-semibold">
                      AI is analyzing your image...
                    </p>
                    <p>This may take a few moments.</p>
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
                    <p className="text-lg font-medium">
                      Your extracted data will appear here.
                    </p>
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
