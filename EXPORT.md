### Prerequisites
- Make sure you have access to the project repository
- Ensure you have Node.js installed (download from [nodejs.org](https://nodejs.org) if needed)

### Setup

1. **Clone or download the project** if you don't have it already:
   ```
   git clone https://github.com/vnthanhdng/itell-cloze-pilot.git
   cd itell-cloze-pilot
   ```

2. **Install project dependencies**:
   ```
   npm install
   ```

3. **Get the Firebase credentials file**:
   - Download the `itell-cloze-pilot-firebase-adminsdk-fbsvc-59b4ee98c5.json` file
   - Place it in the project root directory (same level as package.json)

### Running Reports

1. **Open a terminal/command prompt** and navigate to the project folder:
   ```
   cd path/to/itell-cloze-pilot
   ```

2. **Generate reports using the npm scripts**:

   For all reports in one command:
   ```
   npm run generate-report
   ```

   For only test results:
   ```
   npm run export-firestore
   ```

   For only user progress data:
   ```
   npm run progress-report
   ```

3. **Check the exports folder** for your files:
   - CSV files 
   - JSON files 

### Available Reports

1. **Test Results** (`export-firestore.js`):
   - Exports all test results from May 7th, 2025 onwards
   - Creates both CSV and JSON files
   - Filename: `exports/testResults_from_2025-05-07.csv/json`

2. **User Progress Report** (`user-progress-report.js`):
   - Shows users and their test completion counts
   - Provides user information (name, email) with test counts
   - Filenames: 
     - `exports/user_test_count_from_2025-05-07.csv/json`
     - `exports/test_summary_from_2025-05-07.json`

### Troubleshooting

- If you see an error about missing Firebase credentials, verify the JSON file is in the correct location
- If no data appears, ensure the date filter is appropriate for your data
- For "module not found" errors, run `npm install` again to ensure all dependencies are installed

### Changing the Date Filter

To change the date range for the exports:

1. Open the script file in the `scripts` folder:
   - `scripts/export-firestore.js` for test results
   - `scripts/user-progress-report.js` for user progress

2. Find and modify the date line (around line 184-190):
   ```javascript
   const fromDate = new Date('2025-05-07T00:00:00Z');
   ```

3. Change to your desired date in the format 'YYYY-MM-DDT00:00:00Z'

4. Save the file and run the report again