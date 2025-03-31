import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { methodId, passageId, numGaps = 10, params = {} } = await request.json();
    
    // Validate inputs
    if (!methodId || !passageId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Read the passage file
    const passagePath = path.join(process.cwd(), 'public', 'passages', `passage_${passageId}.md`);
    const passageText = await fs.readFile(passagePath, 'utf-8');
    
    // Create a temporary JSON file with the parameters
    const tmpInputPath = path.join(process.cwd(), 'tmp', `input_${Date.now()}.json`);
    const tmpOutputPath = path.join(process.cwd(), 'tmp', `output_${Date.now()}.json`);
    
    await fs.mkdir(path.join(process.cwd(), 'tmp'), { recursive: true });
    
    const inputData = {
      passage_text: passageText,
      num_gaps: numGaps,
      ...params
    };
    
    await fs.writeFile(tmpInputPath, JSON.stringify(inputData));
    
    // Call the Python script
    const scriptPath = path.join(process.cwd(), 'python', 'gap_methods', 'method_runner.py');
    const { stdout, stderr } = await execAsync(
      `python ${scriptPath} ${methodId.toLowerCase()} ${tmpInputPath} ${tmpOutputPath}`
    );
    
    if (stderr) {
      console.error('Python error:', stderr);
    }
    
    // Read the result
    const resultJson = await fs.readFile(tmpOutputPath, 'utf-8');
    const result = JSON.parse(resultJson);
    
    // Clean up temporary files
    await Promise.all([
      fs.unlink(tmpInputPath),
      fs.unlink(tmpOutputPath)
    ]).catch(e => console.error('Error cleaning up temp files:', e));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in gap generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate gaps' },
      { status: 500 }
    );
  }
}