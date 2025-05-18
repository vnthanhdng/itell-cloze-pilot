const fs = require('fs');
var admin = require("firebase-admin");
var serviceAccount = require("../itell-cloze-pilot-firebase-adminsdk-fbsvc-59b4ee98c5.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://itell-cloze-pilot-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

function processTimestamps(data) {
  const processed = {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (value && typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
      processed[key] = value.toDate().toISOString();
    } else {
      processed[key] = value;
    }
  });
  
  return processed;
}

async function exportCollection(collectionName, fromDate, outputFormat = 'json') {
  try {
    console.log(`Exporting ${collectionName} from ${fromDate.toDateString()} onwards...`);
    
    const fromTimestamp = admin.firestore.Timestamp.fromDate(fromDate);
    
    const query = db.collection(collectionName).where('timestamp', '>=', fromTimestamp);
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log(`No documents found in ${collectionName} from ${fromDate.toDateString()} onwards`);
      return;
    }
    
    const data = [];
    
    snapshot.forEach(doc => {
      const processedData = processTimestamps(doc.data());
      
      data.push({
        id: doc.id,
        ...processedData
      });
    });
    
    console.log(`Found ${data.length} documents in ${collectionName} from ${fromDate.toDateString()} onwards`);
    
    const dir = './exports';
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
    
    const dateStr = fromDate.toISOString().split('T')[0]; 
    const fileBase = `${dir}/${collectionName}_from_${dateStr}`;
    
    if (outputFormat === 'json') {
      fs.writeFileSync(`${fileBase}.json`, JSON.stringify(data, null, 2));
      console.log(`Exported ${data.length} documents to ${fileBase}.json`);
    } else if (outputFormat === 'csv') {
      if (data.length === 0) {
        console.log(`No data to export for ${collectionName}`);
        return;
      }
      
      const headers = Object.keys(data[0]).filter(key => key !== 'id');
      const csvRows = [];
      
      csvRows.push(['id', ...headers].join(','));
      
      data.forEach(item => {
        const values = [item.id];
        headers.forEach(header => {
          let value = item[header];
          // Handle different data types
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value).replace(/"/g, '""');
          }
          values.push(`"${value}"`);
        });
        csvRows.push(values.join(','));
      });
      
      fs.writeFileSync(`${fileBase}.csv`, csvRows.join('\n'));
      console.log(`Exported ${data.length} documents to ${fileBase}.csv`);
    }
  } catch (error) {
    console.error(`Error exporting collection ${collectionName}:`, error);
    throw error;
  }
}

async function exportAllCollections() {
  try {
    // Set the date filter to May 7, 2025
    const fromDate = new Date('2025-05-07T00:00:00Z');
    
    await exportCollection('testResults', fromDate, 'csv');
    await exportCollection('testResults', fromDate, 'json');
    
    console.log('Export complete!');
    process.exit(0);
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

exportAllCollections();