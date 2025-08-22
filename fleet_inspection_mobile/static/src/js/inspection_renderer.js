/** @odoo-module **/

import { Renderer } from "@web/views/renderer";
import { useState, onMounted, onWillUnmount } from "@odoo/owl";

export class InspectionMobileRenderer extends Renderer {
    setup() {
        super.setup();
        
        this.state = useState({
            isLoading: false,
            currentScreen: 'vehicle-selection',
            showTooltips: false,
        });
        
        onMounted(this.onMounted);
        onWillUnmount(this.onWillUnmount);
    }

    onMounted() {
        // Add mobile-specific classes
        document.body.classList.add('o_inspection_mobile_mode');
        
        // Prevent zoom on double tap for iOS
        if (this.env.device.isMobile) {
            this.preventZoom();
        }
        
        // Setup viewport meta tag for better mobile experience
        this.setupViewport();
        
        // Initialize touch feedback
        this.setupTouchFeedback();
    }

    onWillUnmount() {
        document.body.classList.remove('o_inspection_mobile_mode');
    }

    preventZoom() {
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Prevent pinch zoom
        document.addEventListener('touchmove', function (event) {
            if (event.scale !== 1) {
                event.preventDefault();
            }
        }, false);
    }

    setupViewport() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    }

    setupTouchFeedback() {
        // Add touch feedback for buttons
        document.addEventListener('touchstart', (e) => {
            if (e.target.matches('button, .btn, .clickable')) {
                e.target.classList.add('touching');
            }
        });
        
        document.addEventListener('touchend', (e) => {
            setTimeout(() => {
                document.querySelectorAll('.touching').forEach(el => {
                    el.classList.remove('touching');
                });
            }, 100);
        });
    }

    render() {
        return this.renderMobileInterface();
    }

    renderMobileInterface() {
        return `
            <div class="o_fleet_inspection_mobile">
                ${this.renderHeader()}
                ${this.renderContent()}
                ${this.renderFooter()}
                ${this.renderModals()}
            </div>
        `;
    }

    renderHeader() {
        const progress = this.props.model.getProgress();
        const currentInspection = this.props.model.currentInspection;
        
        return `
            <div class="inspection-header">
                <div class="container-fluid">
                    <div class="row align-items-center">
                        <div class="col-2">
                            <button class="btn btn-link back-btn" ${this.state.currentScreen === 'vehicle-selection' ? 'style="visibility: hidden;"' : ''}>
                                <i class="fa fa-arrow-left"></i>
                            </button>
                        </div>
                        <div class="col-8 text-center">
                            <h4 class="mb-0 vehicle-name">
                                ${currentInspection ? 
                                    `${currentInspection.vehicle_id[1]}` : 
                                    'Vehicle Inspection'
                                }
                            </h4>
                            ${this.renderConnectionStatus()}
                        </div>
                        <div class="col-2 text-right">
                            ${this.state.currentScreen === 'inspection' ? 
                                `<div class="progress-indicator">
                                    <span class="current-item">${this.props.model.currentItemIndex + 1}</span> / 
                                    <span class="total-items">${progress.total}</span>
                                </div>` : 
                                ''
                            }
                        </div>
                    </div>
                    ${this.state.currentScreen === 'inspection' ? this.renderProgressBar(progress) : ''}
                </div>
            </div>
        `;
    }

    renderConnectionStatus() {
        const isOffline = this.props.model.isOffline;
        const hasPending = this.props.model.pendingChanges.length > 0;
        
        if (isOffline || hasPending) {
            return `
                <div class="connection-status ${isOffline ? 'offline' : 'pending'}">
                    <i class="fa fa-${isOffline ? 'wifi-off' : 'clock-o'}"></i>
                    <small>${isOffline ? 'Offline' : `${hasPending} pending`}</small>
                </div>
            `;
        }
        return '';
    }

    renderProgressBar(progress) {
        return `
            <div class="row mt-2">
                <div class="col-12">
                    <div class="progress inspection-progress">
                        <div class="progress-bar" role="progressbar" style="width: ${progress.percentage}%">
                            <span class="sr-only">${Math.round(progress.percentage)}% Complete</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderContent() {
        switch (this.state.currentScreen) {
            case 'vehicle-selection':
                return this.renderVehicleSelection();
            case 'inspection':
                return this.renderInspectionItem();
            case 'summary':
                return this.renderSummary();
            default:
                return this.renderVehicleSelection();
        }
    }

    renderVehicleSelection() {
        return `
            <div class="inspection-content">
                <div class="screen vehicle-selection-screen active">
                    <div class="container-fluid">
                        ${this.renderSearchSection()}
                        ${this.renderRecentVehicles()}
                        ${this.renderAllVehicles()}
                    </div>
                </div>
            </div>
        `;
    }

    renderSearchSection() {
        return `
            <div class="search-section mt-3">
                <div class="input-group">
                    <input type="text" class="form-control vehicle-search" 
                           placeholder="Search by license plate, model..." 
                           autocomplete="off">
                    <div class="input-group-append">
                        <span class="input-group-text">
                            <i class="fa fa-search"></i>
                        </span>
                    </div>
                </div>
                <div class="search-tips mt-2">
                    <small class="text-muted">
                        <i class="fa fa-lightbulb-o"></i> 
                        Tip: Search by license plate for fastest results
                    </small>
                </div>
            </div>
        `;
    }

    renderRecentVehicles() {
        return `
            <div class="recent-vehicles mt-4">
                <h5>
                    <i class="fa fa-history"></i> Recent Vehicles
                </h5>
                <div class="recent-vehicles-list">
                    ${this.state.isLoading ? this.renderLoadingSpinner() : ''}
                </div>
            </div>
        `;
    }

    renderAllVehicles() {
        return `
            <div class="all-vehicles mt-4">
                <h5>
                    <i class="fa fa-car"></i> All Vehicles
                </h5>
                <div class="all-vehicles-list">
                    ${this.state.isLoading ? this.renderLoadingSpinner() : ''}
                </div>
            </div>
        `;
    }

    renderInspectionItem() {
        const currentItem = this.props.model.getCurrentItem();
        if (!currentItem) return this.renderNoItem();

        return `
            <div class="inspection-content">
                <div class="screen inspection-item-screen active">
                    <div class="container-fluid">
                        ${this.renderItemCard(currentItem)}
                    </div>
                </div>
            </div>
        `;
    }

    renderItemCard(item) {
        const sectionItems = this.props.model.inspectionItems.filter(i => i.section === item.section);
        const currentInSection = sectionItems.findIndex(i => i.id === item.id) + 1;
        
        return `
            <div class="item-card">
                <div class="section-header">
                    <span class="section-name">${item.section || 'General'}</span>
                    <span class="section-progress">${currentInSection} / ${sectionItems.length}</span>
                </div>
                
                <div class="item-title">
                    <h2>${item.name}</h2>
                    ${item.instructions ? `<p class="item-instructions">${item.instructions}</p>` : ''}
                </div>
                
                ${this.renderStatusButtons(item)}
                ${this.renderObservationsSection(item)}
                ${this.renderPhotoSection(item)}
            </div>
        `;
    }

    renderStatusButtons(item) {
        const statuses = [
            { value: 'bien', label: 'BIEN', icon: 'fa-check-circle', class: 'btn-good' },
            { value: 'regular', label: 'REGULAR', icon: 'fa-exclamation-triangle', class: 'btn-regular' },
            { value: 'mal', label: 'MAL', icon: 'fa-times-circle', class: 'btn-bad' },
        ];

        return `
            <div class="status-buttons">
                ${statuses.map(status => `
                    <button class="btn btn-status ${status.class} ${item.status === status.value ? 'active' : ''}" 
                            data-status="${status.value}"
                            aria-label="Mark as ${status.label}">
                        <i class="fa ${status.icon}"></i>
                        <span>${status.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderObservationsSection(item) {
        return `
            <div class="observations-section">
                <button class="btn btn-link observations-toggle" type="button">
                    <i class="fa fa-comment"></i> Add observation
                    <i class="fa fa-chevron-down toggle-icon"></i>
                </button>
                <div class="observations-field-container" style="display: none;">
                    <textarea class="form-control observations-field" 
                              placeholder="Write your observations here..." 
                              rows="3">${item.observations || ''}</textarea>
                    <small class="form-text text-muted">
                        Describe any issues, damage, or additional notes
                    </small>
                </div>
            </div>
        `;
    }

    renderPhotoSection(item) {
        const showPhotoSection = item.status === 'mal' || 
                                (item.status === 'regular' && item.photo_allowed);
        
        if (!showPhotoSection) {
            return '<div class="photo-section" style="display: none;"></div>';
        }

        const isRequired = item.status === 'mal' && item.photo_required;
        
        return `
            <div class="photo-section">
                ${isRequired ? 
                    `<div class="photo-required-alert">
                        <i class="fa fa-camera"></i> Photo required for items marked as BAD
                    </div>` : 
                    `<div class="photo-optional-info">
                        <i class="fa fa-camera"></i> Add photos to document the issue
                    </div>`
                }
                <div class="photo-controls">
                    <button class="btn btn-primary btn-block take-photo-btn">
                        <i class="fa fa-camera"></i> Take Photo
                    </button>
                </div>
                <div class="photo-gallery">
                    ${this.renderPhotoGallery(item.photo_ids || [])}
                </div>
            </div>
        `;
    }

    renderPhotoGallery(photoIds) {
        if (!photoIds.length) return '';
        
        return `
            <div class="photo-thumbnails">
                ${photoIds.map((photoId, index) => `
                    <div class="photo-thumbnail" data-photo-id="${photoId}">
                        <img src="/web/image/fleet.inspection.photo/${photoId}/image" 
                             alt="Photo ${index + 1}" 
                             class="thumbnail-image">
                        <button class="btn btn-sm btn-danger photo-delete" data-photo-id="${photoId}">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderNoItem() {
        return `
            <div class="inspection-content">
                <div class="screen no-item-screen active">
                    <div class="container-fluid text-center">
                        <div class="no-item-message">
                            <i class="fa fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                            <h4>No inspection items found</h4>
                            <p>Please ensure the inspection template is properly configured.</p>
                            <button class="btn btn-primary" onclick="location.reload()">
                                <i class="fa fa-refresh"></i> Reload
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSummary() {
        const items = this.props.model.inspectionItems;
        const goodCount = items.filter(i => i.status === 'bien').length;
        const regularCount = items.filter(i => i.status === 'regular').length;
        const badCount = items.filter(i => i.status === 'mal').length;
        const naCount = items.filter(i => i.status === 'na').length;
        
        return `
            <div class="inspection-content">
                <div class="screen summary-screen active">
                    <div class="container-fluid">
                        <div class="summary-card">
                            <div class="text-center mb-4">
                                <i class="fa fa-check-circle fa-4x text-success"></i>
                                <h3 class="mt-3">Inspection Complete!</h3>
                                <p class="text-muted">Review your results and sign below</p>
                            </div>
                            
                            <div class="summary-stats">
                                <div class="row text-center">
                                    <div class="col-3">
                                        <div class="stat-item good">
                                            <div class="stat-number">${goodCount}</div>
                                            <div class="stat-label">Good</div>
                                        </div>
                                    </div>
                                    <div class="col-3">
                                        <div class="stat-item regular">
                                            <div class="stat-number">${regularCount}</div>
                                            <div class="stat-label">Regular</div>
                                        </div>
                                    </div>
                                    <div class="col-3">
                                        <div class="stat-item bad">
                                            <div class="stat-number">${badCount}</div>
                                            <div class="stat-label">Bad</div>
                                        </div>
                                    </div>
                                    <div class="col-3">
                                        <div class="stat-item na">
                                            <div class="stat-number">${naCount}</div>
                                            <div class="stat-label">N/A</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            ${this.renderGeneralObservations()}
                            ${this.renderSignatureSection()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderGeneralObservations() {
        return `
            <div class="general-observations mt-4">
                <h5><i class="fa fa-comment"></i> General Observations</h5>
                <textarea class="form-control" 
                          placeholder="Any additional comments about the vehicle..." 
                          rows="4" 
                          id="general-observations"></textarea>
                <small class="form-text text-muted">
                    Add any overall comments about the vehicle condition
                </small>
            </div>
        `;
    }

    renderSignatureSection() {
        return `
            <div class="signature-section mt-4">
                <h5><i class="fa fa-pencil"></i> Driver Signature</h5>
                <div class="signature-pad-container">
                    <canvas class="signature-pad" width="400" height="200"></canvas>
                    <div class="signature-placeholder">
                        <i class="fa fa-pencil"></i>
                        <span>Sign here</span>
                    </div>
                </div>
                <div class="signature-controls mt-2">
                    <button class="btn btn-secondary clear-signature">
                        <i class="fa fa-eraser"></i> Clear
                    </button>
                </div>
            </div>
        `;
    }

    renderFooter() {
        const currentItem = this.props.model.getCurrentItem();
        const isFirstItem = this.props.model.currentItemIndex === 0;
        const isLastItem = this.props.model.currentItemIndex === this.props.model.inspectionItems.length - 1;
        
        if (this.state.currentScreen === 'vehicle-selection') {
            return ''; // No footer for vehicle selection
        }
        
        if (this.state.currentScreen === 'summary') {
            return this.renderSummaryFooter();
        }

        return `
            <div class="inspection-footer">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-6">
                            <button class="btn btn-outline-primary btn-block nav-previous" 
                                    ${isFirstItem ? 'disabled' : ''}>
                                <i class="fa fa-arrow-left"></i> Previous
                            </button>
                        </div>
                        <div class="col-6">
                            <button class="btn btn-primary btn-block nav-next">
                                ${isLastItem ? 'Complete' : 'Next'} 
                                <i class="fa fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSummaryFooter() {
        return `
            <div class="inspection-footer">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-6">
                            <button class="btn btn-outline-secondary btn-block" id="back-to-inspection">
                                <i class="fa fa-arrow-left"></i> Back
                            </button>
                        </div>
                        <div class="col-6">
                            <button class="btn btn-success btn-block" id="complete-inspection">
                                <i class="fa fa-check"></i> Complete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderModals() {
        return `
            ${this.renderPhotoModal()}
            ${this.renderConfirmationModal()}
        `;
    }

    renderPhotoModal() {
        return `
            <div class="modal fade photo-capture-modal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Take Photo</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="camera-container">
                                <video class="camera-preview" autoplay playsinline muted></video>
                                <canvas class="photo-canvas" style="display: none;"></canvas>
                                <div class="camera-overlay">
                                    <div class="camera-guides"></div>
                                </div>
                            </div>
                            <div class="photo-preview" style="display: none;">
                                <img class="captured-photo" alt="Captured photo"/>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <div class="camera-controls">
                                <button class="btn btn-primary btn-lg capture-btn">
                                    <i class="fa fa-camera"></i>
                                </button>
                                <button class="btn btn-secondary retake-btn" style="display: none;">
                                    <i class="fa fa-refresh"></i> Retake
                                </button>
                                <button class="btn btn-success save-photo-btn" style="display: none;">
                                    <i class="fa fa-check"></i> Save Photo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderConfirmationModal() {
        return `
            <div class="modal fade confirmation-modal" tabindex="-1" role="dialog">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Confirm Action</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="confirmation-message">Are you sure?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary confirm-btn">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderLoadingSpinner() {
        return `
            <div class="text-center p-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
            </div>
        `;
    }
}