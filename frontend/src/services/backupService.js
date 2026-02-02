// frontend/src/services/backupService.js
import { api } from '../utils/api';

/**
 * Initiates database backup and downloads ZIP file
 */
export const downloadDatabaseBackup = async () => {
  try {
    console.log('📦 Initiating database backup...');

    // Get current date for filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `kec-foodcourt-backup-${timestamp}.zip`;

    // Make POST request to backup endpoint
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/backup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.message || 'Backup failed');
      } else {
        // HTML error page returned
        if (response.status === 401) {
          throw new Error('Unauthorized. Please login as admin.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        } else if (response.status === 404) {
          throw new Error('Backup endpoint not found. Please check server configuration.');
        } else {
          throw new Error(`Backup failed with status ${response.status}`);
        }
      }
    }

    // Get the blob from response
    const blob = await response.blob();

    // Create a temporary download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('✅ Backup downloaded successfully:', filename);
    return { success: true, filename };

  } catch (error) {
    console.error('❌ Backup download failed:', error);
    throw error;
  }
};

/**
 * Check if backup service is operational
 */
export const checkBackupStatus = async () => {
  try {
    const response = await api.get('/backup/status');
    return response.status === 'ready';
  } catch (error) {
    console.error('❌ Backup status check failed:', error);
    return false;
  }
};
