import Tesseract from 'tesseract.js';

export type ExtractionMode = 'standard' | 'advanced' | 'reversed';

export interface ExtractedData {
  sourceTerminal: string[];
  destinationDevice: string[];
  destinationTerminal: string[];
}

export const fixOCRNumberErrors = (text: string): string => {
  let fixedText = text;
  // Fix "188" -> "18"
  fixedText = fixedText.replace(/(\s)188(\s|$)/g, '$118$2');
  // Fix "200" -> "20"
  fixedText = fixedText.replace(/(\s)200(\s|$)/g, '$120$2');
  // Fix "244FA" -> "24 4FA"
  fixedText = fixedText.replace(/(\d{2,})([A-Z]{2,})/g, '$1 $2');
  // Fix "P4L4" -> "P4L 4"
  fixedText = fixedText.replace(/([A-Z]\d[A-Z])(\d)/g, '$1 $2');
  return fixedText;
};

export const fixOCRCharacterErrors = (text: string): string => {
  let fixedText = text;
  // Fix diamond symbols and other special characters
  fixedText = fixedText.replace(/[♦●•]/g, ' ');
  
  const charFixes = [
    { wrong: /(\s)O(\s|$)/g, correct: '$10$2' }, // O -> 0
    { wrong: /(\s)l(\s|$)/g, correct: '$11$2' }, // l -> 1
    { wrong: /(\s)\|(\s|$)/g, correct: '$11$2' }, // | -> 1
  ];
  
  charFixes.forEach(fix => {
    fixedText = fixedText.replace(fix.wrong, fix.correct);
  });
  
  return fixedText;
};

const extractReversedFormatData = (lines: string[]): ExtractedData => {
  const data: ExtractedData = { sourceTerminal: [], destinationDevice: [], destinationTerminal: [] };
  
  lines.forEach((line) => {
    const cleanLine = line.trim().replace(/\s+/g, ' ');
    const patterns = [
      /([A-Za-z0-9]{2,})-([A-Za-z0-9*]{1,})\s*-\s*(\d+)/,
      /([A-Za-z0-9]{2,})-([A-Za-z0-9*]{1,})\s+(\d+)/,
      /([A-Za-z0-9]{2,})-([A-Za-z0-9*]{1,}).*?(\d+)$/
    ];
    
    let match = null;
    for (const pattern of patterns) {
      match = cleanLine.match(pattern);
      if (match) break;
    }
    
    if (match) {
      data.destinationDevice.push(match[1].trim());
      data.destinationTerminal.push(match[2].trim().replace(/\*/g, ''));
      data.sourceTerminal.push(match[3].trim());
    } else {
      const deviceTerminalMatch = cleanLine.match(/([A-Za-z0-9]{2,})-([A-Za-z0-9*]{1,})/);
      if (deviceTerminalMatch) {
        const sourceMatch = cleanLine.match(/(\d+)(?!.*\d)/);
        if (sourceMatch) {
          data.destinationDevice.push(deviceTerminalMatch[1].trim());
          data.destinationTerminal.push(deviceTerminalMatch[2].trim().replace(/\*/g, ''));
          data.sourceTerminal.push(sourceMatch[1].trim());
        }
      }
    }
  });
  return data;
};

const extractAdvancedTerminalData = (lines: string[]): ExtractedData => {
  const data: ExtractedData = { sourceTerminal: [], destinationDevice: [], destinationTerminal: [] };
  const sourceTerminals: string[] = [];
  
  lines.forEach((line) => {
    const boxNumberMatch = line.match(/^(\d+)/);
    if (boxNumberMatch) {
      sourceTerminals.push(boxNumberMatch[1].trim());
    }
  });
  
  lines.forEach((line) => {
    const deviceTerminalRegex = /([A-Za-z0-9]{2,})-([A-Za-z0-9*]{1,})/g;
    let match;
    
    while ((match = deviceTerminalRegex.exec(line)) !== null) {
      const device = match[1].trim();
      const terminal = match[2].trim().replace(/\*/g, '');
      
      const boxNumberMatch = line.match(/^(\d+)/);
      if (boxNumberMatch) {
        data.sourceTerminal.push(boxNumberMatch[1].trim());
      } else if (sourceTerminals.length > 0) {
        data.sourceTerminal.push(sourceTerminals[sourceTerminals.length - 1]);
      }
      data.destinationDevice.push(device);
      data.destinationTerminal.push(terminal);
    }
  });
  return data;
};

const extractStandardTerminalData = (lines: string[]): ExtractedData => {
  const data: ExtractedData = { sourceTerminal: [], destinationDevice: [], destinationTerminal: [] };
  
  lines.forEach(line => {
    let sourceTerminal = "0";
    const sourceMatch = line.match(/^([^\.]+)\./);
    if (sourceMatch) {
      sourceTerminal = sourceMatch[1].trim();
    }
    
    const contentToSearch = sourceMatch ? line.substring(line.indexOf('.') + 1) : line;
    const deviceTerminalPairs = contentToSearch.match(/[^\s,]+-[^\s,]+/g);
    
    if (deviceTerminalPairs) {
      deviceTerminalPairs.forEach(pair => {
        const [device, terminal] = pair.split('-');
        if (device && terminal) {
          data.sourceTerminal.push(sourceTerminal);
          data.destinationDevice.push(device.trim());
          data.destinationTerminal.push(terminal.trim().replace(/\*/g, ''));
        }
      });
    }
  });
  return data;
};

export const extractDataFromText = (text: string, mode: ExtractionMode): string => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  let data: ExtractedData;

  if (mode === 'advanced') {
    data = extractAdvancedTerminalData(lines);
  } else if (mode === 'reversed') {
    data = extractReversedFormatData(lines);
  } else {
    data = extractStandardTerminalData(lines);
  }

  // Convert to CSV
  const header = '"Source Terminal","Destination Device","Destination Terminal"';
  const rows = data.sourceTerminal.map((st, i) => 
    `"${st}","${data.destinationDevice[i]}","${data.destinationTerminal[i]}"`
  );
  
  return [header, ...rows].join('\n');
};

export const performOCR = async (
  image: string | File, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  const { data: { text } } = await Tesseract.recognize(
    image,
    'eng',
    {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      }
    }
  );
  return text;
};
