/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount, useRef } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class PhotoCaptureComponent extends Component {
    static template = "fleet_inspection_mobile.PhotoCaptureComponent";
    
    setup() {
        this.notification = useService("notification");
        
        this.state = useState({
            isActive: false,
            isPhotoTaken: false,
            stream: null,
            capturedImageData: null,
            error: null,
            isFlashOn: false,
            facingMode: 'environment', // 'user' for front camera, 'environment' for back camera
        });

        this.videoRef = useRef("videoElement");
        this.canvasRef = useRef("canvasElement");
        this.previewRef = useRef("previewElement");
        
        onMounted(this.onMounted);
        onWillUnmount(this.onWillUnmount);
    }

    async onMounted() {
        // Check if we're in mobile environment
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Check camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.state.error = "Camera not supported on this device";
            return;
        }

        // Setup modal event listeners
        this.setupModalEvents();
    }

    onWillUnmount() {
        this.stopCamera();
    }

    setupModalEvents() {
        const modal = document.querySelector('.photo-capture-modal');
        if (modal) {
            modal.addEventListener('shown.bs.modal', () => this.startCamera());
            modal.addEventListener('hidden.bs.modal', () => this.stopCamera());
        }
    }

    async startCamera() {
        try {
            this.state.error = null;
            
            const constraints = {
                video: {
                    facingMode: this.state.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    aspectRatio: { ideal: 16/9 }
                },
                audio: false
            };

            // For mobile devices, add additional constraints
            if (this.isMobile) {
                constraints.video = {
                    ...constraints.video,
                    focusMode: { ideal: "continuous" },
                    exposureMode: { ideal: "continuous" },
                    whiteBalanceMode: { ideal: "continuous" }
                };
            }

            this.state.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const video = this.videoRef.el;
            if (video) {
                video.srcObject = this.state.stream;
                video.play();
                this.state.isActive = true;
            }
            
        } catch (error) {
            console.error("Failed to start camera:", error);
            this.handleCameraError(error);
        }
    }

    stopCamera() {
        if (this.state.stream) {
            this.state.stream.getTracks().forEach(track => track.stop());
            this.state.stream = null;
        }
        this.state.isActive = false;
        this.state.isPhotoTaken = false;
        this.state.capturedImageData = null;
    }

    handleCameraError(error) {
        let errorMessage = "Failed to access camera";
        
        switch (error.name) {
            case 'NotAllowedError':
                errorMessage = "Camera permission denied. Please allow camera access and try again.";
                break;
            case 'NotFoundError':
                errorMessage = "No camera found on this device.";
                break;
            case 'NotSupportedError':
                errorMessage = "Camera not supported on this device.";
                break;
            case 'NotReadableError':
                errorMessage = "Camera is being used by another application.";
                break;
            default:
                errorMessage = `Camera error: ${error.message}`;
        }
        
        this.state.error = errorMessage;
        this.notification.add(errorMessage, { type: "danger" });
    }

    capturePhoto() {
        try {
            const video = this.videoRef.el;
            const canvas = this.canvasRef.el;
            const preview = this.previewRef.el;
            
            if (!video || !canvas || !preview) {
                throw new Error("Camera elements not found");
            }

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw video frame to canvas
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            this.state.capturedImageData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Show preview
            preview.src = this.state.capturedImageData;
            this.state.isPhotoTaken = true;
            
            // Add capture sound effect (if sound is enabled)
            this.playCaptureSound();
            
        } catch (error) {
            console.error("Failed to capture photo:", error);
            this.notification.add("Failed to capture photo", { type: "danger" });
        }
    }

    retakePhoto() {
        this.state.isPhotoTaken = false;
        this.state.capturedImageData = null;
        
        // Resume camera if needed
        if (!this.state.isActive && this.state.stream) {
            const video = this.videoRef.el;
            if (video) {
                video.play();
                this.state.isActive = true;
            }
        }
    }

    async savePhoto() {
        if (!this.state.capturedImageData) {
            this.notification.add("No photo to save", { type: "warning" });
            return;
        }

        try {
            // Extract base64 data (remove data:image/jpeg;base64, prefix)
            const base64Data = this.state.capturedImageData.split(',')[1];
            
            // Get metadata
            const metadata = await this.getPhotoMetadata();
            
            // Call parent's save method
            await this.props.onPhotoSaved(base64Data, metadata);
            
            // Close modal
            const modal = document.querySelector('.photo-capture-modal');
            if (modal) {
                $(modal).modal('hide');
            }
            
            this.notification.add("Photo saved successfully", { type: "success" });
            
        } catch (error) {
            console.error("Failed to save photo:", error);
            this.notification.add("Failed to save photo", { type: "danger" });
        }
    }

    async getPhotoMetadata() {
        const metadata = {
            timestamp: new Date().toISOString(),
            device_info: navigator.userAgent,
            image_size: this.state.capturedImageData.length
        };

        // Add GPS location if available and enabled
        if (navigator.geolocation && this.props.enableGPS) {
            try {
                const position = await this.getCurrentPosition();
                metadata.latitude = position.coords.latitude;
                metadata.longitude = position.coords.longitude;
                metadata.accuracy = position.coords.accuracy;
            } catch (error) {
                console.warn("Failed to get GPS location:", error);
            }
        }

        return metadata;
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });
    }

    switchCamera() {
        this.state.facingMode = this.state.facingMode === 'environment' ? 'user' : 'environment';
        this.stopCamera();
        setTimeout(() => this.startCamera(), 100);
    }

    toggleFlash() {
        // Flash toggle for devices that support it
        if (this.state.stream) {
            const track = this.state.stream.getVideoTracks()[0];
            if (track && track.getCapabilities && track.applyConstraints) {
                const capabilities = track.getCapabilities();
                if (capabilities.torch) {
                    this.state.isFlashOn = !this.state.isFlashOn;
                    track.applyConstraints({
                        advanced: [{ torch: this.state.isFlashOn }]
                    }).catch(error => {
                        console.warn("Flash control not supported:", error);
                    });
                }
            }
        }
    }

    playCaptureSound() {
        // Play capture sound if enabled in company settings
        if (this.props.soundEnabled) {
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmA==');
                audio.play().catch(() => {}); // Ignore errors
            } catch (error) {
                // Ignore audio errors
            }
        }
    }

    // Event handlers
    onCaptureClick() {
        this.capturePhoto();
    }

    onRetakeClick() {
        this.retakePhoto();
    }

    onSaveClick() {
        this.savePhoto();
    }

    onSwitchCameraClick() {
        this.switchCamera();
    }

    onFlashToggleClick() {
        this.toggleFlash();
    }
}