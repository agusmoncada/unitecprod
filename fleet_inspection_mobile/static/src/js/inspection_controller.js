/** @odoo-module **/

import { Controller } from "@web/views/controller";
import { useService } from "@web/core/utils/hooks";
import { Component, useState, onWillStart, onMounted, onWillUnmount } from "@odoo/owl";

export class InspectionMobileController extends Controller {
    setup() {
        super.setup();
        
        this.notification = useService("notification");
        this.dialog = useService("dialog");
        
        this.state = useState({
            currentScreen: 'vehicle-selection', // vehicle-selection, inspection, summary
            currentItemIndex: 0,
            totalItems: 0,
            isLoading: false,
            isPhotoMode: false,
            selectedVehicle: null,
            currentItem: null,
            showObservations: false,
            currentStatus: null,
            observations: '',
            photos: [],
            progress: { completed: 0, total: 0, percentage: 0 }
        });

        // Device detection
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.isTouch = 'ontouchstart' in window;

        onWillStart(this.onWillStart);
        onMounted(this.onMounted);
        onWillUnmount(this.onWillUnmount);
    }

    async onWillStart() {
        // Try to restore previous session
        if (this.model.loadFromStorage()) {
            this.state.currentScreen = 'inspection';
            await this.updateItemState();
        } else {
            await this.loadRecentVehicles();
        }
    }

    onMounted() {
        // Setup event listeners
        this.setupEventListeners();
        this.setupGestureHandlers();
        
        // Check if we need to request camera permissions
        if (this.isMobile) {
            this.checkCameraPermissions();
        }

        // Setup auto-save
        this.autoSaveInterval = setInterval(() => {
            if (this.state.currentScreen === 'inspection') {
                this.model.saveToStorage();
            }
        }, 5000);

        // Setup online/offline detection
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
    }

    onWillUnmount() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        window.removeEventListener('online', this.handleOnlineStatus);
        window.removeEventListener('offline', this.handleOnlineStatus);
    }

    setupEventListeners() {
        // Vehicle selection
        document.addEventListener('click', (e) => {
            if (e.target.matches('.o_start_inspection_btn')) {
                const vehicleId = parseInt(e.target.dataset.vehicleId);
                this.startInspection(vehicleId);
            }
        });

        // Status buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-status') || e.target.closest('.btn-status')) {
                const btn = e.target.matches('.btn-status') ? e.target : e.target.closest('.btn-status');
                const status = btn.dataset.status;
                this.setItemStatus(status);
            }
        });

        // Navigation buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-previous')) {
                this.navigatePrevious();
            } else if (e.target.matches('.nav-next')) {
                this.navigateNext();
            }
        });

        // Observations toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('.observations-toggle')) {
                this.toggleObservations();
            }
        });

        // Photo capture
        document.addEventListener('click', (e) => {
            if (e.target.matches('.take-photo-btn')) {
                this.openPhotoCapture();
            }
        });

        // Search input
        const searchInput = document.querySelector('.vehicle-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchVehicles(e.target.value);
                }, 300);
            });
        }
    }

    setupGestureHandlers() {
        if (!this.isTouch) return;

        let startX = 0;
        let startY = 0;
        const minSwipeDistance = 50;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;

            // Only handle horizontal swipes
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
                if (diffX > 0) {
                    // Swipe left - next item
                    if (this.state.currentScreen === 'inspection') {
                        this.navigateNext();
                    }
                } else {
                    // Swipe right - previous item
                    if (this.state.currentScreen === 'inspection') {
                        this.navigatePrevious();
                    }
                }
            }

            startX = 0;
            startY = 0;
        });
    }

    async checkCameraPermissions() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop());
            }
        } catch (error) {
            console.warn("Camera permission check failed:", error);
        }
    }

    handleOnlineStatus(isOnline) {
        if (isOnline && this.model.pendingChanges.length > 0) {
            this.syncPendingChanges();
        }
        
        // Update UI to show online/offline status
        const indicator = document.querySelector('.connection-indicator');
        if (indicator) {
            indicator.classList.toggle('offline', !isOnline);
        }
    }

    async syncPendingChanges() {
        try {
            const success = await this.model.syncPendingChanges();
            if (success) {
                this.notification.add("Changes synced successfully", { type: "success" });
            }
        } catch (error) {
            console.error("Sync failed:", error);
        }
    }

    // Vehicle Selection Methods
    async loadRecentVehicles() {
        const vehicles = await this.model.loadRecentVehicles();
        this.renderRecentVehicles(vehicles);
    }

    async searchVehicles(searchTerm) {
        this.state.isLoading = true;
        const vehicles = await this.model.loadVehicles(searchTerm);
        this.renderAllVehicles(vehicles);
        this.state.isLoading = false;
    }

    renderRecentVehicles(vehicles) {
        const container = document.querySelector('.recent-vehicles-list');
        if (!container) return;

        container.innerHTML = vehicles.map(vehicle => `
            <div class="vehicle-item recent-vehicle" data-vehicle-id="${vehicle.id}">
                <div class="vehicle-info">
                    <div class="vehicle-title">
                        <strong>${vehicle.license_plate || vehicle.name}</strong>
                        ${vehicle.inspection_due ? '<span class="badge badge-warning">Due</span>' : ''}
                    </div>
                    <div class="vehicle-subtitle">${vehicle.model}</div>
                    <div class="vehicle-last-inspection">
                        Last: ${vehicle.last_inspection_date ? this.formatDate(vehicle.last_inspection_date) : 'Never'}
                    </div>
                </div>
                <button class="btn btn-primary btn-sm o_start_inspection_btn" data-vehicle-id="${vehicle.id}">
                    Start
                </button>
            </div>
        `).join('');
    }

    renderAllVehicles(vehicles) {
        const container = document.querySelector('.all-vehicles-list');
        if (!container) return;

        container.innerHTML = vehicles.map(vehicle => `
            <div class="vehicle-item" data-vehicle-id="${vehicle.id}">
                <div class="vehicle-info">
                    <div class="vehicle-title">
                        <strong>${vehicle.license_plate || vehicle.name}</strong>
                        ${vehicle.inspection_due ? '<span class="badge badge-warning">Due</span>' : ''}
                        ${vehicle.has_draft_inspection ? '<span class="badge badge-info">In Progress</span>' : ''}
                    </div>
                    <div class="vehicle-subtitle">
                        ${vehicle.model}${vehicle.color ? ' - ' + vehicle.color : ''}
                    </div>
                    <div class="vehicle-last-inspection">
                        Last: ${vehicle.last_inspection_date ? this.formatDate(vehicle.last_inspection_date) + ` (${vehicle.days_since_inspection} days ago)` : 'Never'}
                    </div>
                </div>
                <button class="btn btn-primary btn-sm o_start_inspection_btn" data-vehicle-id="${vehicle.id}">
                    ${vehicle.has_draft_inspection ? 'Resume' : 'Start'}
                </button>
            </div>
        `).join('');
    }

    // Inspection Methods
    async startInspection(vehicleId) {
        this.state.isLoading = true;
        
        try {
            const inspection = await this.model.createInspection(vehicleId);
            if (inspection) {
                this.state.currentScreen = 'inspection';
                await this.updateItemState();
                this.updateProgress();
                this.updateHeader();
            } else {
                this.notification.add("Failed to start inspection", { type: "danger" });
            }
        } catch (error) {
            console.error("Failed to start inspection:", error);
            this.notification.add("Error starting inspection", { type: "danger" });
        } finally {
            this.state.isLoading = false;
        }
    }

    async updateItemState() {
        this.state.currentItem = this.model.getCurrentItem();
        this.state.currentItemIndex = this.model.currentItemIndex;
        this.state.totalItems = this.model.inspectionItems.length;
        
        if (this.state.currentItem) {
            this.state.currentStatus = this.state.currentItem.status;
            this.state.observations = this.state.currentItem.observations || '';
            this.renderCurrentItem();
        }
    }

    renderCurrentItem() {
        const item = this.state.currentItem;
        if (!item) return;

        // Update section header
        const sectionHeader = document.querySelector('.section-name');
        if (sectionHeader) {
            sectionHeader.textContent = item.section || 'General';
        }

        // Update section progress
        const sectionProgress = document.querySelector('.section-progress');
        if (sectionProgress) {
            const sectionItems = this.model.inspectionItems.filter(i => i.section === item.section);
            const currentInSection = sectionItems.findIndex(i => i.id === item.id) + 1;
            sectionProgress.textContent = `${currentInSection} / ${sectionItems.length}`;
        }

        // Update item title
        const itemTitle = document.querySelector('.item-title h2');
        if (itemTitle) {
            itemTitle.textContent = item.name;
        }

        // Update status buttons
        this.updateStatusButtons();
        
        // Update observations
        this.updateObservationsSection();
        
        // Update photo section
        this.updatePhotoSection();
    }

    updateStatusButtons() {
        const buttons = document.querySelectorAll('.btn-status');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === this.state.currentStatus) {
                btn.classList.add('active');
            }
        });
    }

    updateObservationsSection() {
        const observationsField = document.querySelector('.observations-field');
        if (observationsField) {
            observationsField.value = this.state.observations;
        }
    }

    updatePhotoSection() {
        const photoSection = document.querySelector('.photo-section');
        const currentItem = this.state.currentItem;
        
        if (photoSection && currentItem) {
            const shouldShow = currentItem.status === 'mal' || 
                             (currentItem.status === 'regular' && currentItem.photo_allowed);
            photoSection.style.display = shouldShow ? 'block' : 'none';
        }
    }

    async setItemStatus(status) {
        if (!this.state.currentItem) return;

        this.state.currentStatus = status;
        this.updateStatusButtons();
        
        // Show photo section for 'mal' status
        if (status === 'mal') {
            this.updatePhotoSection();
        }

        // Auto-advance if configured
        const observations = document.querySelector('.observations-field')?.value || '';
        
        try {
            await this.model.updateItemStatus(this.state.currentItem.id, status, observations);
            this.updateProgress();
            
            // Auto-advance to next item if enabled
            if (this.env.services.user.settings?.inspection_auto_advance !== false) {
                setTimeout(() => {
                    if (status !== 'mal' || this.state.currentItem.photo_ids?.length > 0) {
                        this.navigateNext();
                    }
                }, 800);
            }
        } catch (error) {
            console.error("Failed to update item status:", error);
            this.notification.add("Failed to save status", { type: "warning" });
        }
    }

    toggleObservations() {
        this.state.showObservations = !this.state.showObservations;
        const container = document.querySelector('.observations-field-container');
        if (container) {
            container.style.display = this.state.showObservations ? 'block' : 'none';
        }
    }

    async navigateNext() {
        const hasNext = this.model.moveToNext();
        if (hasNext) {
            await this.updateItemState();
            this.updateProgress();
            this.updateNavigation();
        } else {
            // Show summary screen
            this.showSummary();
        }
    }

    async navigatePrevious() {
        const hasPrev = this.model.moveToPrevious();
        if (hasPrev) {
            await this.updateItemState();
            this.updateProgress();
            this.updateNavigation();
        }
    }

    updateProgress() {
        this.state.progress = this.model.getProgress();
        
        // Update progress bar
        const progressBar = document.querySelector('.inspection-progress .progress-bar');
        if (progressBar) {
            progressBar.style.width = `${this.state.progress.percentage}%`;
        }

        // Update progress indicator
        const currentIndicator = document.querySelector('.current-item');
        const totalIndicator = document.querySelector('.total-items');
        if (currentIndicator && totalIndicator) {
            currentIndicator.textContent = this.state.currentItemIndex + 1;
            totalIndicator.textContent = this.state.totalItems;
        }
    }

    updateNavigation() {
        const prevBtn = document.querySelector('.nav-previous');
        const nextBtn = document.querySelector('.nav-next');
        
        if (prevBtn) {
            prevBtn.disabled = this.model.currentItemIndex === 0;
        }
        
        if (nextBtn) {
            const isLastItem = this.model.currentItemIndex === this.model.inspectionItems.length - 1;
            nextBtn.textContent = isLastItem ? 'Complete' : 'Next';
        }
    }

    updateHeader() {
        const vehicleName = document.querySelector('.vehicle-name');
        if (vehicleName && this.model.currentInspection) {
            vehicleName.textContent = `${this.model.currentInspection.vehicle_id[1]} Inspection`;
        }
    }

    showSummary() {
        this.state.currentScreen = 'summary';
        this.renderSummary();
    }

    renderSummary() {
        const progress = this.model.getProgress();
        const items = this.model.inspectionItems;
        
        const goodCount = items.filter(i => i.status === 'bien').length;
        const regularCount = items.filter(i => i.status === 'regular').length;
        const badCount = items.filter(i => i.status === 'mal').length;

        // Update summary stats
        const summaryStats = document.querySelector('.summary-stats');
        if (summaryStats) {
            summaryStats.innerHTML = `
                <div class="stat-item good">
                    <div class="stat-number">${goodCount}</div>
                    <div class="stat-label">Good</div>
                </div>
                <div class="stat-item regular">
                    <div class="stat-number">${regularCount}</div>
                    <div class="stat-label">Regular</div>
                </div>
                <div class="stat-item bad">
                    <div class="stat-number">${badCount}</div>
                    <div class="stat-label">Bad</div>
                </div>
            `;
        }

        // Show/hide screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.querySelector('.summary-screen')?.classList.add('active');
    }

    // Photo capture methods
    async openPhotoCapture() {
        // This will be implemented in the photo capture component
        this.state.isPhotoMode = true;
        // Trigger photo capture modal/component
    }

    // Utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    }
}