import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function GET(
  request: NextRequest,
  { params }: { params: { methodId: string } }
) {
  try {
    const methodId = params.methodId;
    const searchParams = new URL(request.url).searchParams;
    const passageId = searchParams.get('passageId');
    const numGaps = searchParams.get('numGaps') || '10';
    
    // Validate inputs
    if (!methodId || !passageId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Read the passage file
    const passagePath = path.join(process.cwd(), 'public', 'passages', `passage${passageId}.md`);
    let passageText;
    
    try {
      passageText = await fs.readFile(passagePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading passage file: ${passagePath}`, error);
      return NextResponse.json(
        { error: 'Passage not found' },
        { status: 404 }
      );
    }
    
    // Create a temporary JSON file with the parameters
    const tmpDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    
    const tmpInputPath = path.join(tmpDir, `input_${Date.now()}.json`);
    const tmpOutputPath = path.join(tmpDir, `output_${Date.now()}.json`);
    
    const inputData = {
      passage_text: passageText,
      num_gaps: parseInt(numGaps),
      // Additional parameters could be added here
    };
    
    await fs.writeFile(tmpInputPath, JSON.stringify(inputData));
    
    // Call the Python script
    const scriptPath = path.join(process.cwd(), 'python', 'gap_methods', 'method_runner.py');
    
    try {
      const { stdout, stderr } = await execAsync(
        `python ${scriptPath} ${methodId.toLowerCase()} ${tmpInputPath} ${tmpOutputPath}`
      );
      
      if (stderr) {
        console.warn('Python stderr:', stderr);
      }
      
      // Read the result
      const resultJson = await fs.readFile(tmpOutputPath, 'utf-8');
      const result = JSON.parse(resultJson);
      
      // Clean up temporary files
      await Promise.all([
        fs.unlink(tmpInputPath),
        fs.unlink(tmpOutputPath)
      ]).catch(e => console.error('Error cleaning up temp files:', e));
      
      // Check if there was an error
      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      
      // Return the gaps
      return NextResponse.json({ gaps: result });
      
    } catch (error) {
      console.error('Error executing Python script:', error);
      
      // Fallback to a simple gap generation method if Python fails
      const words = passageText.split(/\s+/);
      const simpleGaps = words
        .map((word, index) => {
          const wordStart = passageText.indexOf(word);
          return { 
            word, 
            wordIndex: index,
            startIndex: wordStart,
            endIndex: wordStart + word.length,
            context: `...${word}...`
          };
        })
        .filter((_, index) => index % 7 === 3) // Every 7th word starting from the 4th
        .map(gap => ({
          ...gap,
          word: gap.word.replace(/[.,;:!?]$/, '') // Remove punctuation
        }))
        .slice(0, parseInt(numGaps));
      
      return NextResponse.json({ 
        gaps: simpleGaps,
        fallback: true
      });
    }
  } catch (error) {
    console.error('Error in gap method API:', error);
    return NextResponse.json(
      { error: 'Failed to generate gaps' },
      { status: 500 }
    );
  }
}