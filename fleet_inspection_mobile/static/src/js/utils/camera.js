/** @odoo-module **/

/**
 * Camera utilities for mobile inspection interface
 */
export class CameraUtils {
    constructor() {
        this.stream = null;
        this.supportedConstraints = this.getSupportedConstraints();
    }

    /**
     * Check if camera is supported
     */
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Get supported camera constraints
     */
    getSupportedConstraints() {
        if (!navigator.mediaDevices?.getSupportedConstraints) {
            return {};
        }
        return navigator.mediaDevices.getSupportedConstraints();
    }

    /**
     * Request camera permissions
     */
    async requestPermissions() {
        if (!CameraUtils.isSupported()) {
            throw new Error('Camera not supported');
        }

        try {
            // Request minimal permissions first to check access
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            throw this.parsePermissionError(error);
        }
    }

    /**
     * Get available camera devices
     */
    async getCameras() {
        if (!navigator.mediaDevices?.enumerateDevices) {
            return [];
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Failed to enumerate camera devices:', error);
            return [];
        }
    }

    /**
     * Start camera with optimal settings for mobile
     */
    async startCamera(options = {}) {
        const {
            facingMode = 'environment', // 'user' for front, 'environment' for back
            width = { ideal: 1920, max: 1920 },
            height = { ideal: 1080, max: 1080 },
            deviceId = null
        } = options;

        const constraints = {
            video: {
                facingMode: deviceId ? undefined : facingMode,
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width,
                height,
                aspectRatio: { ideal: 16/9 }
            },
            audio: false
        };

        // Add mobile-specific constraints
        if (this.isMobileDevice()) {
            constraints.video = {
                ...constraints.video,
                focusMode: { ideal: "continuous" },
                exposureMode: { ideal: "continuous" },
                whiteBalanceMode: { ideal: "continuous" }
            };
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            return this.stream;
        } catch (error) {
            throw this.parseStreamError(error);
        }
    }

    /**
     * Stop camera stream
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    /**
     * Capture photo from video stream
     */
    capturePhoto(videoElement, options = {}) {
        const {
            quality = 0.8,
            format = 'image/jpeg',
            maxWidth = 1920,
            maxHeight = 1080
        } = options;

        if (!videoElement || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
            throw new Error('Video not ready for capture');
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Calculate dimensions maintaining aspect ratio
        const { width, height } = this.calculateDimensions(
            videoElement.videoWidth,
            videoElement.videoHeight,
            maxWidth,
            maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // Draw video frame to canvas
        context.drawImage(videoElement, 0, 0, width, height);

        // Get image data
        const imageData = canvas.toDataURL(format, quality);
        
        return {
            dataUrl: imageData,
            blob: this.dataUrlToBlob(imageData),
            width,
            height,
            size: Math.round(imageData.length * 0.75) // Approximate size
        };
    }

    /**
     * Convert data URL to blob
     */
    dataUrlToBlob(dataUrl) {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        
        return new Blob([u8arr], { type: mime });
    }

    /**
     * Calculate optimal dimensions maintaining aspect ratio
     */
    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        const aspectRatio = originalWidth / originalHeight;

        let width = originalWidth;
        let height = originalHeight;

        // Scale down if too large
        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }

        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }

        return {
            width: Math.round(width),
            height: Math.round(height)
        };
    }

    /**
     * Check if device is mobile
     */
    isMobileDevice() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Get camera capabilities
     */
    async getCameraCapabilities() {
        if (!this.stream) {
            throw new Error('No active camera stream');
        }

        const track = this.stream.getVideoTracks()[0];
        if (!track?.getCapabilities) {
            return {};
        }

        return track.getCapabilities();
    }

    /**
     * Apply camera settings
     */
    async applyCameraSettings(settings) {
        if (!this.stream) {
            throw new Error('No active camera stream');
        }

        const track = this.stream.getVideoTracks()[0];
        if (!track?.applyConstraints) {
            throw new Error('Camera settings not supported');
        }

        try {
            await track.applyConstraints({ advanced: [settings] });
        } catch (error) {
            console.warn('Failed to apply camera settings:', error);
            throw new Error('Failed to apply camera settings');
        }
    }

    /**
     * Toggle flashlight (if supported)
     */
    async toggleFlash(enable) {
        try {
            await this.applyCameraSettings({ torch: enable });
            return true;
        } catch (error) {
            console.warn('Flash not supported or failed:', error);
            return false;
        }
    }

    /**
     * Switch camera (front/back)
     */
    async switchCamera(currentFacingMode = 'environment') {
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        // Stop current stream
        this.stopCamera();

        // Start with new facing mode
        try {
            await this.startCamera({ facingMode: newFacingMode });
            return newFacingMode;
        } catch (error) {
            // Fallback to original facing mode
            try {
                await this.startCamera({ facingMode: currentFacingMode });
                throw new Error('Camera switch failed, reverted to original');
            } catch (fallbackError) {
                throw new Error('Camera switch failed and could not revert');
            }
        }
    }

    /**
     * Parse permission errors
     */
    parsePermissionError(error) {
        const errorMap = {
            'NotAllowedError': 'Camera permission denied. Please allow camera access and try again.',
            'NotFoundError': 'No camera found on this device.',
            'NotSupportedError': 'Camera not supported on this device.',
            'NotReadableError': 'Camera is being used by another application.',
            'OverconstrainedError': 'Camera constraints not supported.',
            'SecurityError': 'Camera access blocked due to security policy.',
            'AbortError': 'Camera access was aborted.',
            'TypeError': 'Invalid camera configuration.'
        };

        const message = errorMap[error.name] || `Camera error: ${error.message}`;
        return new Error(message);
    }

    /**
     * Parse stream errors
     */
    parseStreamError(error) {
        return this.parsePermissionError(error);
    }

    /**
     * Compress image data
     */
    compressImage(dataUrl, maxSizeKB = 2048) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate compression ratio
                const currentSize = Math.round(dataUrl.length * 0.75 / 1024); // KB
                
                if (currentSize <= maxSizeKB) {
                    resolve(dataUrl);
                    return;
                }

                const ratio = Math.sqrt(maxSizeKB / currentSize);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Try different quality levels
                let quality = 0.8;
                let compressedData;

                do {
                    compressedData = canvas.toDataURL('image/jpeg', quality);
                    const size = Math.round(compressedData.length * 0.75 / 1024);
                    
                    if (size <= maxSizeKB) {
                        resolve(compressedData);
                        return;
                    }
                    
                    quality -= 0.1;
                } while (quality > 0.1);

                resolve(compressedData);
            };

            img.src = dataUrl;
        });
    }

    /**
     * Add photo annotation overlay
     */
    addAnnotationOverlay(canvas) {
        const ctx = canvas.getContext('2d');
        const overlay = document.createElement('canvas');
        const overlayCtx = overlay.getContext('2d');
        
        overlay.width = canvas.width;
        overlay.height = canvas.height;
        
        // Copy original image
        overlayCtx.drawImage(canvas, 0, 0);
        
        return {
            canvas: overlay,
            context: overlayCtx,
            addCircle: (x, y, radius, color = 'red') => {
                overlayCtx.beginPath();
                overlayCtx.arc(x, y, radius, 0, 2 * Math.PI);
                overlayCtx.strokeStyle = color;
                overlayCtx.lineWidth = 3;
                overlayCtx.stroke();
            },
            addArrow: (fromX, fromY, toX, toY, color = 'red') => {
                const headlen = 10;
                const dx = toX - fromX;
                const dy = toY - fromY;
                const angle = Math.atan2(dy, dx);
                
                overlayCtx.beginPath();
                overlayCtx.moveTo(fromX, fromY);
                overlayCtx.lineTo(toX, toY);
                overlayCtx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
                overlayCtx.moveTo(toX, toY);
                overlayCtx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
                overlayCtx.strokeStyle = color;
                overlayCtx.lineWidth = 3;
                overlayCtx.stroke();
            },
            addText: (text, x, y, color = 'red') => {
                overlayCtx.font = '16px Arial';
                overlayCtx.fillStyle = color;
                overlayCtx.fillText(text, x, y);
            },
            getDataUrl: () => overlay.toDataURL('image/jpeg', 0.8)
        };
    }
}