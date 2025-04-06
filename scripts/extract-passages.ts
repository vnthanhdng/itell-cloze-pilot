import fs from 'fs';
import path from 'path';

const jsonlPath = path.join(__dirname, '../data/passages.jsonl');
const outputDir = path.join(__dirname, '../public/passages');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read the JSONL file
try {
  const fileContent = fs.readFileSync(jsonlPath, 'utf8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  console.log(`Found ${lines.length} passages in JSONL file`);
  
  // Extract each passage (up to 4 for testing)
  const count = Math.min(lines.length, 4);
  for (let i = 0; i < count; i++) {
    try {
      const passageData = JSON.parse(lines[i]);
      const passageId = i + 1;
      
      // Save the original text
      fs.writeFileSync(
        path.join(outputDir, `passage${passageId}.md`),
        passageData.text,
        'utf8'
      );
      
      console.log(`Created passage${passageId}.md`);
      


      fs.writeFileSync(
        path.join(outputDir, `passage${passageId}_contextuality.md`),
        passageData.contextuality.text,
        'utf8'
      );
      
      fs.writeFileSync(
        path.join(outputDir, `passage${passageId}_contextuality_plus.md`),
        passageData.contextuality_plus.text,
        'utf8'
      );
      
      fs.writeFileSync(
        path.join(outputDir, `passage${passageId}_keyword.md`),
        passageData.keyword.text,
        'utf8'
      );

      
    } catch (error) {
      console.error(`Error processing passage ${i + 1}:`, error);
    }
  }
  
  console.log(`Extracted ${count} passages to public/passages/`);
  
} catch (error) {
  console.error('Error reading JSONL file:', error);
  console.log('Make sure data/passages.jsonl exists and is valid JSONL');
}