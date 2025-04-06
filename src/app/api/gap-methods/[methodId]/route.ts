import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { MethodId } from '../../../../utils/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ methodId: string }> }
) {
  try {
    const methodId = (await params).methodId;
    const searchParams = new URL(request.url).searchParams;
    const passageId = searchParams.get('passageId');
    
    if (!methodId || !passageId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Read the JSONL file
    const jsonlPath = path.join(process.cwd(), 'data', 'passages.jsonl');
    let jsonlData;
    
    try {
      jsonlData = await fs.readFile(jsonlPath, 'utf-8');
    } catch (error) {
      console.error('Error reading JSONL file:', error);
      return NextResponse.json(
        { error: 'Failed to load passages data' },
        { status: 500 }
      );
    }
    
    // Parse the JSONL file and find the requested passage
    const lines = jsonlData.split('\n').filter(line => line.trim());
    const passageIndex = parseInt(passageId) - 1;
    
    if (passageIndex < 0 || passageIndex >= lines.length) {
      return NextResponse.json(
        { error: 'Passage not found' },
        { status: 404 }
      );
    }
    
    const passage = JSON.parse(lines[passageIndex]);
    
    // Determine which test type to use based on methodId
    let testType;
    switch (methodId.toUpperCase()) {
      case MethodId.A:
        testType = 'contextuality';
        break;
      case MethodId.B:
        testType = 'contextuality_plus';
        break;
      case MethodId.C:
      case MethodId.D:
        testType = 'keyword';
        break;
      default:
        testType = 'contextuality';
    }
    
    // Get the cloze test data
    if (!passage[testType]) {
      return NextResponse.json(
        { error: `Test type ${testType} not available for this passage` },
        { status: 404 }
      );
    }
    
    const testData = passage[testType];
    
    // Format the gaps for the frontend
    const gaps = testData.gaps.map(([word, startIdx, length]) => ({
      word,
      start_idx: startIdx,
      end_idx: startIdx + length,
      context: extractContext(testData.text, startIdx, startIdx + length)
    }));
    
    return NextResponse.json({
      gaps,
      clozeText: testData.text
    });
    
  } catch (error) {
    console.error('Error in gap method API:', error);
    return NextResponse.json(
      { error: 'Failed to generate gaps' },
      { status: 500 }
    );
  }
}

// Helper function to extract context around the gap
function extractContext(text: string, startIdx: number, endIdx: number): string {
  const contextSize = 30;
  const start = Math.max(0, startIdx - contextSize);
  const end = Math.min(text.length, endIdx + contextSize);
  
  return text.substring(start, startIdx) + '_'.repeat(endIdx - startIdx) + text.substring(endIdx, end);
}