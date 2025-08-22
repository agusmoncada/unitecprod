/** @odoo-module **/

import { Model } from "@web/views/model";
import { KeepLast } from "@web/core/utils/concurrency";

export class InspectionMobileModel extends Model {
    setup() {
        super.setup();
        this.keepLast = new KeepLast();
        this.currentInspection = null;
        this.currentItemIndex = 0;
        this.inspectionItems = [];
        this.isOffline = false;
        this.pendingChanges = [];
    }

    async load(params = {}) {
        const data = await super.load(params);
        if (params.inspectionId) {
            await this.loadInspection(params.inspectionId);
        }
        return data;
    }

    async loadInspection(inspectionId) {
        try {
            const inspection = await this.keepLast.add(
                this.orm.read("fleet.inspection", [inspectionId], [
                    "name", "vehicle_id", "driver_id", "state", "inspection_date",
                    "inspection_line_ids", "overall_status", "completion_percentage"
                ])
            );
            
            if (inspection.length > 0) {
                this.currentInspection = inspection[0];
                await this.loadInspectionItems();
            }
        } catch (error) {
            console.error("Failed to load inspection:", error);
            this.isOffline = true;
        }
    }

    async loadInspectionItems() {
        if (!this.currentInspection?.inspection_line_ids?.length) {
            return;
        }

        try {
            const items = await this.keepLast.add(
                this.orm.read("fleet.inspection.line", this.currentInspection.inspection_line_ids, [
                    "name", "section", "sequence", "status", "observations", 
                    "photo_ids", "photo_required", "template_item_id",
                    "section_sequence"
                ])
            );
            
            // Sort items by section sequence and then by item sequence
            this.inspectionItems = items.sort((a, b) => {
                if (a.section_sequence !== b.section_sequence) {
                    return a.section_sequence - b.section_sequence;
                }
                return a.sequence - b.sequence;
            });

            // Find first incomplete item
            const incompleteIndex = this.inspectionItems.findIndex(item => !item.status);
            this.currentItemIndex = incompleteIndex >= 0 ? incompleteIndex : 0;
            
        } catch (error) {
            console.error("Failed to load inspection items:", error);
            this.isOffline = true;
        }
    }

    getCurrentItem() {
        return this.inspectionItems[this.currentItemIndex] || null;
    }

    getNextItem() {
        const nextIndex = this.currentItemIndex + 1;
        return nextIndex < this.inspectionItems.length ? this.inspectionItems[nextIndex] : null;
    }

    getPreviousItem() {
        const prevIndex = this.currentItemIndex - 1;
        return prevIndex >= 0 ? this.inspectionItems[prevIndex] : null;
    }

    async updateItemStatus(itemId, status, observations = '') {
        const itemIndex = this.inspectionItems.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return false;

        const updateData = {
            status: status,
            observations: observations,
            inspected_at: new Date().toISOString()
        };

        try {
            if (this.isOffline) {
                // Store for later sync
                this.pendingChanges.push({
                    model: 'fleet.inspection.line',
                    id: itemId,
                    data: updateData,
                    timestamp: Date.now()
                });
                
                // Update local data
                Object.assign(this.inspectionItems[itemIndex], updateData);
            } else {
                await this.orm.write("fleet.inspection.line", [itemId], updateData);
                
                // Update local data
                Object.assign(this.inspectionItems[itemIndex], updateData);
                
                // Refresh inspection stats
                await this.refreshInspectionStats();
            }
            
            return true;
        } catch (error) {
            console.error("Failed to update item status:", error);
            this.isOffline = true;
            // Fallback to offline mode
            return this.updateItemStatus(itemId, status, observations);
        }
    }

    async refreshInspectionStats() {
        if (!this.currentInspection?.id) return;
        
        try {
            const updated = await this.orm.read("fleet.inspection", [this.currentInspection.id], [
                "completion_percentage", "overall_status", "items_good", "items_regular", "items_bad"
            ]);
            
            if (updated.length > 0) {
                Object.assign(this.currentInspection, updated[0]);
            }
        } catch (error) {
            console.error("Failed to refresh inspection stats:", error);
        }
    }

    moveToNext() {
        if (this.currentItemIndex < this.inspectionItems.length - 1) {
            this.currentItemIndex++;
            return true;
        }
        return false;
    }

    moveToPrevious() {
        if (this.currentItemIndex > 0) {
            this.currentItemIndex--;
            return true;
        }
        return false;
    }

    moveToItem(index) {
        if (index >= 0 && index < this.inspectionItems.length) {
            this.currentItemIndex = index;
            return true;
        }
        return false;
    }

    getProgress() {
        const completedItems = this.inspectionItems.filter(item => item.status).length;
        const totalItems = this.inspectionItems.length;
        return {
            completed: completedItems,
            total: totalItems,
            percentage: totalItems > 0 ? (completedItems / totalItems) * 100 : 0
        };
    }

    async completeInspection(signature = null, generalObservations = '') {
        if (!this.currentInspection?.id) return false;

        const updateData = {
            state: 'completed',
            end_time: new Date().toISOString(),
            observations: generalObservations
        };

        if (signature) {
            updateData.driver_signature = signature;
        }

        try {
            await this.orm.write("fleet.inspection", [this.currentInspection.id], updateData);
            Object.assign(this.currentInspection, updateData);
            return true;
        } catch (error) {
            console.error("Failed to complete inspection:", error);
            return false;
        }
    }

    async syncPendingChanges() {
        if (!this.pendingChanges.length || this.isOffline) {
            return false;
        }

        try {
            for (const change of this.pendingChanges) {
                await this.orm.write(change.model, [change.id], change.data);
            }
            
            this.pendingChanges = [];
            this.isOffline = false;
            await this.refreshInspectionStats();
            return true;
        } catch (error) {
            console.error("Failed to sync pending changes:", error);
            return false;
        }
    }

    // Vehicle selection methods
    async loadVehicles(searchTerm = '') {
        try {
            return await this.keepLast.add(
                this.orm.call("fleet.vehicle", "get_vehicles_for_inspection", {
                    search_term: searchTerm,
                    limit: 20
                })
            );
        } catch (error) {
            console.error("Failed to load vehicles:", error);
            return [];
        }
    }

    async loadRecentVehicles() {
        try {
            return await this.keepLast.add(
                this.orm.call("fleet.vehicle", "get_recent_inspected_vehicles", {
                    limit: 5
                })
            );
        } catch (error) {
            console.error("Failed to load recent vehicles:", error);
            return [];
        }
    }

    async createInspection(vehicleId) {
        try {
            const inspectionId = await this.orm.call("fleet.inspection", "create_from_vehicle", [vehicleId]);
            await this.loadInspection(inspectionId.id);
            return inspectionId;
        } catch (error) {
            console.error("Failed to create inspection:", error);
            return null;
        }
    }

    // Photo management
    async uploadPhoto(itemId, imageData, metadata = {}) {
        try {
            return await this.orm.call("fleet.inspection.photo", "upload_photo_base64", [itemId, imageData, metadata]);
        } catch (error) {
            console.error("Failed to upload photo:", error);
            return { error: "Upload failed" };
        }
    }

    // Storage methods for offline functionality
    saveToStorage() {
        if (typeof Storage !== "undefined") {
            localStorage.setItem('inspection_data', JSON.stringify({
                currentInspection: this.currentInspection,
                inspectionItems: this.inspectionItems,
                currentItemIndex: this.currentItemIndex,
                pendingChanges: this.pendingChanges,
                timestamp: Date.now()
            }));
        }
    }

    loadFromStorage() {
        if (typeof Storage !== "undefined") {
            const data = localStorage.getItem('inspection_data');
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    // Only restore if data is less than 24 hours old
                    if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                        this.currentInspection = parsed.currentInspection;
                        this.inspectionItems = parsed.inspectionItems || [];
                        this.currentItemIndex = parsed.currentItemIndex || 0;
                        this.pendingChanges = parsed.pendingChanges || [];
                        return true;
                    }
                } catch (error) {
                    console.error("Failed to parse stored inspection data:", error);
                }
            }
        }
        return false;
    }

    clearStorage() {
        if (typeof Storage !== "undefined") {
            localStorage.removeItem('inspection_data');
        }
    }
}