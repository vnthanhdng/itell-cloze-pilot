import fs from 'fs';
import path from 'path';

// Required directories
const directories = [
  'data',
  'public/passages',
  'tmp'
];

// Create directories if needed
directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Check for JSONL file
const jsonlPath = path.join(__dirname, '../data/passages.jsonl');
if (!fs.existsSync(jsonlPath)) {
  console.log('\x1b[33m%s\x1b[0m', 'WARNING: JSONL file not found at data/passages.jsonl');
  console.log('Please add your passage data file to continue.');
} else {
  console.log('\x1b[32m%s\x1b[0m', 'JSONL data file found!');
  
  try {
    // Count and validate entries
    const content = fs.readFileSync(jsonlPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    console.log(`Found ${lines.length} passages in the JSONL file.`);
    
    // Validate the first entry
    const firstPassage = JSON.parse(lines[0]);
    if (firstPassage.contextuality && firstPassage.contextuality_plus && firstPassage.keyword) {
      console.log('\x1b[32m%s\x1b[0m', 'JSONL format looks valid!');
    } else {
      console.log('\x1b[33m%s\x1b[0m', 'WARNING: JSONL format may not be correct.');
      console.log('Each entry should have contextuality, contextuality_plus, and keyword fields.');
    }
  } catch (error) {
    console.error('Error validating JSONL file:', error);
  }
}

// Check for extracted passages
const passageDir = path.join(__dirname, '../public/passages');
if (fs.existsSync(passageDir)) {
  const passages = fs.readdirSync(passageDir).filter(f => f.match(/^passage\d+\.md$/));
  console.log(`Found ${passages.length} extracted passage files.`);
  
  if (passages.length === 0) {
    console.log('\x1b[33m%s\x1b[0m', 'No passage files found. Run "npm run extract-passages" to create them.');
  }
} else {
  console.log('\x1b[33m%s\x1b[0m', 'Passages directory does not exist yet.');
}

console.log('\x1b[32m%s\x1b[0m', 'Setup complete!');