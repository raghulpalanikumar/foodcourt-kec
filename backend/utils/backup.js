// Backend Backup Utility - Exports all MongoDB collections to ZIP file
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PassThrough } = require('stream');

/**
 * Creates a backup of all MongoDB collections
 * Returns a readable stream of the ZIP file
 */
async function createDatabaseBackup() {
  try {
    console.log('🔄 Starting database backup...');

    // Get all collections from the database
    const db = mongoose.connection;
    const collections = await db.db.listCollections().toArray();
    
    if (collections.length === 0) {
      throw new Error('No collections found in database');
    }

    console.log(`📦 Found ${collections.length} collections`);

    // Create a map to store collection data
    const backupData = {};

    // Export each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`📄 Exporting collection: ${collectionName}`);
      
      const col = db.collection(collectionName);
      const documents = await col.find({}).toArray();
      backupData[collectionName] = documents;
      
      console.log(`✅ Exported ${documents.length} documents from ${collectionName}`);
    }

    // Create ZIP archive
    const outputStream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    // Pipe archive to output stream
    archive.pipe(outputStream);

    // Add metadata file
    const metadata = {
      backupDate: new Date().toISOString(),
      databaseName: db.db.databaseName,
      mongooseVersion: mongoose.version,
      collectionsCount: collections.length,
      totalDocuments: Object.values(backupData).reduce((sum, docs) => sum + docs.length, 0)
    };
    
    archive.append(JSON.stringify(metadata, null, 2), { name: 'BACKUP_METADATA.json' });
    console.log('📋 Added backup metadata');

    // Add each collection as a JSON file
    for (const [collectionName, documents] of Object.entries(backupData)) {
      const fileName = `${collectionName}.json`;
      archive.append(JSON.stringify(documents, null, 2), { name: fileName });
      console.log(`📁 Added ${fileName} to archive`);
    }

    // Add a README file
    const readmeContent = `
# KEC FoodCourt Database Backup

**Backup Date:** ${metadata.backupDate}
**Database:** ${metadata.databaseName}
**Collections:** ${metadata.collectionsCount}
**Total Documents:** ${metadata.totalDocuments}

## Contents
This backup contains the following collections:
${Object.keys(backupData).map((name, i) => `${i + 1}. ${name}.json (${backupData[name].length} documents)`).join('\n')}

## How to Restore
1. Extract this ZIP file
2. Import each JSON file back to MongoDB using:
   \`\`\`
   mongoimport --db kec_foodcourt --collection <collection_name> --file <collection_name>.json --jsonArray
   \`\`\`

## Files
- BACKUP_METADATA.json - Backup information
- <collection_name>.json - Collection data files
- README.txt - This file
    `;
    
    archive.append(readmeContent, { name: 'README.txt' });
    console.log('📖 Added README');

    // Finalize archive
    await archive.finalize();
    
    console.log('✅ Backup archive created successfully');
    return outputStream;

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

module.exports = {
  createDatabaseBackup
};
