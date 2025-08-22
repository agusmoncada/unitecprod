/** @odoo-module **/

/**
 * Storage utilities for offline functionality
 */
export class StorageUtils {
    constructor(prefix = 'fleet_inspection_') {
        this.prefix = prefix;
        this.isSupported = this.checkSupport();
    }

    /**
     * Check if localStorage is supported
     */
    checkSupport() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get prefixed key
     */
    getKey(key) {
        return `${this.prefix}${key}`;
    }

    /**
     * Store data in localStorage
     */
    set(key, data, expiryHours = 24) {
        if (!this.isSupported) {
            console.warn('localStorage not supported');
            return false;
        }

        try {
            const item = {
                data: data,
                timestamp: Date.now(),
                expiry: Date.now() + (expiryHours * 60 * 60 * 1000)
            };
            
            localStorage.setItem(this.getKey(key), JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Failed to store data:', error);
            this.cleanup(); // Try to free up space
            return false;
        }
    }

    /**
     * Get data from localStorage
     */
    get(key) {
        if (!this.isSupported) {
            return null;
        }

        try {
            const item = localStorage.getItem(this.getKey(key));
            if (!item) {
                return null;
            }

            const parsed = JSON.parse(item);
            
            // Check if expired
            if (Date.now() > parsed.expiry) {
                this.remove(key);
                return null;
            }

            return parsed.data;
        } catch (error) {
            console.error('Failed to retrieve data:', error);
            this.remove(key); // Remove corrupted data
            return null;
        }
    }

    /**
     * Remove data from localStorage
     */
    remove(key) {
        if (!this.isSupported) {
            return false;
        }

        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (error) {
            console.error('Failed to remove data:', error);
            return false;
        }
    }

    /**
     * Check if key exists and is not expired
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Clear all data with current prefix
     */
    clear() {
        if (!this.isSupported) {
            return false;
        }

        try {
            const keys = Object.keys(localStorage);
            const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));
            
            prefixedKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    getStorageInfo() {
        if (!this.isSupported) {
            return { supported: false };
        }

        try {
            let totalSize = 0;
            let count = 0;
            
            for (let key in localStorage) {
                if (key.startsWith(this.prefix)) {
                    totalSize += localStorage[key].length;
                    count++;
                }
            }

            // Estimate available space (most browsers have ~5MB limit)
            const estimatedLimit = 5 * 1024 * 1024; // 5MB in characters
            const usedPercentage = (totalSize / estimatedLimit) * 100;

            return {
                supported: true,
                totalSize,
                count,
                usedPercentage: Math.min(usedPercentage, 100),
                availableSpace: Math.max(estimatedLimit - totalSize, 0)
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return { supported: true, error: error.message };
        }
    }

    /**
     * Clean up expired data
     */
    cleanup() {
        if (!this.isSupported) {
            return 0;
        }

        let cleaned = 0;
        const now = Date.now();

        try {
            const keys = Object.keys(localStorage);
            const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));

            prefixedKeys.forEach(key => {
                try {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const parsed = JSON.parse(item);
                        if (now > parsed.expiry) {
                            localStorage.removeItem(key);
                            cleaned++;
                        }
                    }
                } catch (error) {
                    // Remove corrupted data
                    localStorage.removeItem(key);
                    cleaned++;
                }
            });

            return cleaned;
        } catch (error) {
            console.error('Failed to cleanup storage:', error);
            return 0;
        }
    }

    /**
     * Store inspection data for offline access
     */
    storeInspection(inspection) {
        return this.set(`inspection_${inspection.id}`, inspection, 48); // 48 hours expiry
    }

    /**
     * Get stored inspection
     */
    getInspection(inspectionId) {
        return this.get(`inspection_${inspectionId}`);
    }

    /**
     * Store pending changes for sync
     */
    addPendingChange(change) {
        const pendingChanges = this.get('pending_changes') || [];
        pendingChanges.push({
            ...change,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
        });
        
        return this.set('pending_changes', pendingChanges, 168); // 1 week expiry
    }

    /**
     * Get all pending changes
     */
    getPendingChanges() {
        return this.get('pending_changes') || [];
    }

    /**
     * Remove pending change after sync
     */
    removePendingChange(changeId) {
        const pendingChanges = this.get('pending_changes') || [];
        const filtered = pendingChanges.filter(change => change.id !== changeId);
        
        if (filtered.length === 0) {
            this.remove('pending_changes');
        } else {
            this.set('pending_changes', filtered, 168);
        }
    }

    /**
     * Clear all pending changes
     */
    clearPendingChanges() {
        return this.remove('pending_changes');
    }

    /**
     * Store photo data for offline upload
     */
    storePhoto(photoId, photoData) {
        return this.set(`photo_${photoId}`, photoData, 72); // 3 days expiry
    }

    /**
     * Get stored photo data
     */
    getPhoto(photoId) {
        return this.get(`photo_${photoId}`);
    }

    /**
     * Store vehicle data for offline access
     */
    storeVehicles(vehicles) {
        return this.set('vehicles', vehicles, 12); // 12 hours expiry
    }

    /**
     * Get stored vehicles
     */
    getVehicles() {
        return this.get('vehicles');
    }

    /**
     * Store inspection template
     */
    storeTemplate(template) {
        return this.set(`template_${template.id}`, template, 168); // 1 week expiry
    }

    /**
     * Get stored template
     */
    getTemplate(templateId) {
        return this.get(`template_${templateId}`);
    }

    /**
     * Store app settings
     */
    storeSettings(settings) {
        return this.set('app_settings', settings, 8760); // 1 year expiry
    }

    /**
     * Get app settings
     */
    getSettings() {
        return this.get('app_settings') || {};
    }

    /**
     * Update specific setting
     */
    updateSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        return this.storeSettings(settings);
    }

    /**
     * Compress data before storage (for large objects)
     */
    compress(data) {
        try {
            return JSON.stringify(data);
        } catch (error) {
            console.error('Failed to compress data:', error);
            return null;
        }
    }

    /**
     * Decompress data after retrieval
     */
    decompress(compressedData) {
        try {
            return JSON.parse(compressedData);
        } catch (error) {
            console.error('Failed to decompress data:', error);
            return null;
        }
    }

    /**
     * Monitor storage quota and warn when approaching limit
     */
    checkStorageQuota() {
        const info = this.getStorageInfo();
        
        if (!info.supported) {
            return { status: 'unsupported' };
        }

        if (info.error) {
            return { status: 'error', message: info.error };
        }

        if (info.usedPercentage > 90) {
            return { 
                status: 'critical', 
                message: 'Storage almost full. Consider clearing old data.',
                percentage: info.usedPercentage 
            };
        } else if (info.usedPercentage > 75) {
            return { 
                status: 'warning', 
                message: 'Storage getting full.',
                percentage: info.usedPercentage 
            };
        }

        return { 
            status: 'ok', 
            percentage: info.usedPercentage 
        };
    }

    /**
     * Export all data for backup
     */
    exportData() {
        if (!this.isSupported) {
            return null;
        }

        try {
            const data = {};
            const keys = Object.keys(localStorage);
            const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));

            prefixedKeys.forEach(key => {
                const shortKey = key.substring(this.prefix.length);
                data[shortKey] = localStorage.getItem(key);
            });

            return {
                data,
                timestamp: Date.now(),
                version: '1.0'
            };
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }

    /**
     * Import data from backup
     */
    importData(exportedData) {
        if (!this.isSupported || !exportedData?.data) {
            return false;
        }

        try {
            for (const [key, value] of Object.entries(exportedData.data)) {
                localStorage.setItem(this.getKey(key), value);
            }
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}