const fs = require('fs');
var admin = require("firebase-admin");
var serviceAccount = require("../itell-cloze-pilot-firebase-adminsdk-fbsvc-59b4ee98c5.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://itell-cloze-pilot-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

/**
 * Generates a user test count report from a specific date
 */
async function generateUserTestCountReport(fromDate) {
  try {
    console.log(`Generating user test count report from ${fromDate.toDateString()}...`);
    
    // Create a Firestore timestamp from the JavaScript Date
    const fromTimestamp = admin.firestore.Timestamp.fromDate(fromDate);
    
    // Query test results with date filter
    const query = db.collection('testResults').where('timestamp', '>=', fromTimestamp);
    const testSnapshot = await query.get();
    
    if (testSnapshot.empty) {
      console.log(`No test results found from ${fromDate.toDateString()} onwards`);
      return;
    }
    
    // Get all users to include their information in the report
    const usersSnapshot = await db.collection('users').get();
    const users = {};
    
    // Map user IDs to user data
    usersSnapshot.forEach(doc => {
      users[doc.id] = {
        id: doc.id,
        ...doc.data(),
        testCount: 0  // Initialize test count for each user
      };
    });
    
    // Count test results per user
    const userTestCounts = {};
    const tests = [];
    
    testSnapshot.forEach(doc => {
      const testData = doc.data();
      const userId = testData.userId;
      
      // Store basic test data
      tests.push({
        testId: doc.id,
        userId: userId,
        method: testData.method,
        passageId: testData.passageId,
        score: testData.score,
        timestamp: testData.timestamp ? testData.timestamp.toDate().toISOString() : null
      });
      
      // Initialize or increment user's test count
      if (!userTestCounts[userId]) {
        userTestCounts[userId] = 1;
      } else {
        userTestCounts[userId]++;
      }
      
      // Also update the count in the users object if the user exists
      if (users[userId]) {
        users[userId].testCount++;
      }
    });
    
    console.log(`Found ${tests.length} test results from ${Object.keys(userTestCounts).length} users`);
    
    // Create report data
    const reportData = [];
    
    // Add users with test counts
    Object.keys(userTestCounts).forEach(userId => {
      const user = users[userId] || { id: userId, name: 'Unknown User', email: 'Unknown' };
      
      reportData.push({
        userId: userId,
        name: user.name || 'Unknown',
        email: user.email || 'Unknown',
        testCount: userTestCounts[userId],
        startTime: user.startTime ? (user.startTime.toDate ? user.startTime.toDate().toISOString() : user.startTime) : null,
        endTime: user.endTime ? (user.endTime.toDate ? user.endTime.toDate().toISOString() : user.endTime) : null
      });
    });
    
    // Sort report by test count (highest first)
    reportData.sort((a, b) => b.testCount - a.testCount);
    
    // Create an exports directory if it doesn't exist
    const dir = './exports';
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    
    // Create filenames with date filter information
    const dateStr = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileBase = `${dir}/user_test_count_from_${dateStr}`;
    
    // Export as JSON
    fs.writeFileSync(`${fileBase}.json`, JSON.stringify(reportData, null, 2));
    console.log(`Exported user test count report to ${fileBase}.json`);
    
    // Export as CSV
    if (reportData.length > 0) {
      const headers = ['userId', 'name', 'email', 'testCount', 'startTime', 'endTime'];
      const csvRows = [];
      
      // Add headers
      csvRows.push(headers.join(','));
      
      // Add data rows
      reportData.forEach(item => {
        const values = headers.map(header => {
          let value = item[header];
          // Handle different data types
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value).replace(/"/g, '""');
          }
          
          if (value === null || value === undefined) {
            return '""';
          }
          
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          }
          
          return value;
        });
        
        csvRows.push(values.join(','));
      });
      
      fs.writeFileSync(`${fileBase}.csv`, csvRows.join('\n'));
      console.log(`Exported user test count report to ${fileBase}.csv`);
    }
    
    // Also generate a summary report with aggregate statistics
    const summary = {
      fromDate: fromDate.toISOString(),
      totalTests: tests.length,
      totalUsers: Object.keys(userTestCounts).length,
      averageTestsPerUser: tests.length / Object.keys(userTestCounts).length,
      usersWithOneOrMoreTests: Object.values(userTestCounts).filter(count => count >= 1).length,
      usersWithThreeOrMoreTests: Object.values(userTestCounts).filter(count => count >= 3).length,
      usersWithSixOrMoreTests: Object.values(userTestCounts).filter(count => count >= 6).length,
      topFiveUsers: reportData.slice(0, 5).map(user => ({
        userId: user.userId,
        name: user.name,
        testCount: user.testCount
      }))
    };
    
    fs.writeFileSync(`${dir}/test_summary_from_${dateStr}.json`, JSON.stringify(summary, null, 2));
    console.log(`Exported test summary to ${dir}/test_summary_from_${dateStr}.json`);
    
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

async function generateReports() {
  try {
    // Set the date filter to May 7, 2025
    const fromDate = new Date('2025-05-07T00:00:00Z');
    
    // Generate user test count report
    await generateUserTestCountReport(fromDate);
    
    console.log('Report generation complete!');
    process.exit(0);
  } catch (error) {
    console.error('Report generation failed:', error);
    process.exit(1);
  }
}

generateReports();