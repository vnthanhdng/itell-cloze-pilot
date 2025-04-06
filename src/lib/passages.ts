import fs from 'fs';
import path from 'path';


export interface GapData {
  word: string;
  start_idx: number;
  length: number;
}

export interface PassageData {
  volume: string;
  page: string;
  summary: string;
  text: string;
  contextuality: {
    text: string;
    gaps: [string, number, number][];
  };
  contextuality_plus: {
    text: string;
    gaps: [string, number, number][];
  };
  keyword: {
    text: string;
    gaps: [string, number, number][];
  };
}

export function loadPassage(passageId: string): PassageData | null {
  try {
    const jsonlPath = path.join(process.cwd(), 'data', 'passages.jsonl');
    const fileContent = fs.readFileSync(jsonlPath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // For simplicity, we're using the array index as the passage ID
    const index = parseInt(passageId) - 1;
    if (index < 0 || index >= lines.length) {
      return null;
    }
    
    return JSON.parse(lines[index]);
  } catch (error) {
    console.error('Error loading passage:', error);
    return null;
  }
}

