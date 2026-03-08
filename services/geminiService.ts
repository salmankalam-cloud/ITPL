
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const PROMPT = `
Extract all tabular or connection data from the provided image into a raw CSV-formatted string.

**CSV Header:**
The header row MUST be exactly: "Source Terminal","Device Location","Device Tag","Device Terminal","Wire Number","Wire Type".

**Parsing Instructions for Each Row:**
You must parse each line of connection data from the image according to the following strict rules.

- **Identify Shared Information (per line):**
  - **"Source Terminal"**: The text before the very first dash (-). This is shared across all connections on a single line.
  - **"Wire Number"**: The text found inside parentheses \`()\`. If parentheses are present, extract only the text *inside* them. If no parentheses are found, this column may be empty or you should look for an alphanumeric code near the end of the line before the Wire Type. This value is shared across all connections on a single line.
  - **"Wire Type"**: The last symbol or character group on the line. This is shared across all connections on a single line.

- **Handling Multiple Connections (Semicolon Rule):**
  - If a line from the image contains a semicolon (";"), it signifies two or more distinct connections that share the "Source Terminal", "Wire Number", and "Wire Type".
  - The text between the first dash (-) and the shared "Wire Number"/"Wire Type" contains the device connection details. This text block is split by the semicolon.
  - For each segment (the part before the semicolon, and the part after), you must parse the device details as described below.
  - Create a separate CSV row for each connection found.

- **Parsing Device Details (for each segment):**
  - **"Device Location"**: The text after the initial dash (-) AND before a slash (/). If no slash is present, this column should be empty.
  - **"Device Tag"**: 
    - If a slash (/) is present: The text after the slash (/) and before the next dash (-).
    - If no slash (/) is present: The text after the initial dash (-) and before the next dash (-).
  - **"Device Terminal"**: The text after the second dash (-). Note: this is the dash that follows the Device Tag/Location part.

**Example of Semicolon Logic:**
For an input line that looks like: \`S-TERM-1 - LOC1/TAG1-T1 ; LOC2/TAG2-T2 (WN-100) W-TYPE-A\`
1.  **Shared Info:**
    - Source Terminal: \`S-TERM-1\`
    - Wire Number: \`WN-100\` (extracted from parentheses)
    - Wire Type: \`W-TYPE-A\`
2.  **First Connection** (from \`LOC1/TAG1-T1\`):
    - Device Location: \`LOC1\`
    - Device Tag: \`TAG1\`
    - Device Terminal: \`T1\`
3.  **Second Connection** (from \`LOC2/TAG2-T2\`):
    - Device Location: \`LOC2\`
    - Device Tag: \`TAG2\`
    - Device Terminal: \`T2\`
4.  **Resulting CSV Rows:**
    \`"S-TERM-1","LOC1","TAG1","T1","WN-100","W-TYPE-A"\`
    \`"S-TERM-1","LOC2","TAG2","T2","WN-100","W-TYPE-A"\`

**Output Format Rules:**
- Your entire response MUST be only the raw CSV data.
- Do NOT include any introductory text, like "Here is the data...".
- Do NOT include any concluding summaries or explanations.
- Do NOT wrap the CSV data in markdown code blocks (like \`\`\`csv).

Analyze the image carefully and apply these rules to every connection line to generate the CSV rows.
`;

export const extractDataFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: PROMPT,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });
    
    const resultText = response.text;

    if (!resultText) {
        throw new Error("The API returned an empty response.");
    }
    
    // Clean up the response to ensure it's just CSV
    // This removes potential markdown code blocks
    const cleanedText = resultText.replace(/```csv\n?|```/g, "").trim();

    return cleanedText;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while communicating with the Gemini API.");
  }
};
