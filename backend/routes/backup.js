// routes/backup.js - Database backup endpoint
const express = require('express');
const { protect, admin } = require('../middlewares/auth');
const { createDatabaseBackup } = require('../utils/backup');

const router = express.Router();

/**
 * POST /api/backup
 * Creates a backup of all MongoDB collections and returns a ZIP file
 * Admin only endpoint
 */
router.post('/', protect, admin, async (req, res) => {
  try {
    console.log('🔐 Admin backup request from user:', req.user._id);
    
    // Set response headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="kec-foodcourt-backup-${timestamp}.zip"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Create backup and pipe to response
    const backupStream = await createDatabaseBackup();
    backupStream.pipe(res);

    // Handle errors
    backupStream.on('error', (err) => {
      console.error('❌ Backup stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Backup failed', message: err.message });
      }
    });

    res.on('finish', () => {
      console.log('✅ Backup file sent successfully');
    });

  } catch (error) {
    console.error('❌ Backup endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Database backup failed', 
        message: error.message 
      });
    }
  }
});

/**
 * GET /api/backup/status
 * Check if backup is available
 */
router.get('/status', protect, admin, (req, res) => {
  res.json({ 
    status: 'ready',
    message: 'Backup service is operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
