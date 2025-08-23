/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

/**
 * Mobile Inspection Client Action
 * 
 * This client action provides a mobile-optimized interface for vehicle inspections
 */
export class FleetInspectionMobile extends Component {
    static template = "fleet_inspection_mobile.InspectionMobile";
    
    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.notification = useService("notification");
        this.user = useService("user");
        
        this.state = useState({
            currentInspection: null,
            currentItem: null,
            items: [],
            itemIndex: 0,
            loading: false,
            selectingVehicle: false,
            vehicles: [],
            inspectionStarted: false,
            vehicleInfo: null,
            inspectionCompleted: false,
            completionStats: null,
        });
        
        this.loadInspection();
        
        // Bind methods to maintain context
        this.onSelectVehicle = this.onSelectVehicle.bind(this);
        this.onCancelVehicleSelection = this.onCancelVehicleSelection.bind(this);
        this.onClickStart = this.onClickStart.bind(this);
        this.onClickResume = this.onClickResume.bind(this);
        this.onSelectStatus = this.onSelectStatus.bind(this);
        this.onNextItem = this.onNextItem.bind(this);
        this.onPreviousItem = this.onPreviousItem.bind(this);
    }

    async loadInspection() {
        try {
            // For now, just load a basic interface
            this.state.loading = false;
        } catch (error) {
            console.error("Error loading inspection:", error);
            this.notification.add("Error loading inspection", {
                type: "danger",
            });
        }
    }

    async startNewInspection() {
        try {
            // Show vehicle selection
            this.state.selectingVehicle = true;
            this.state.vehicles = await this.loadVehicles();
        } catch (error) {
            console.error("Error starting inspection:", error);
            this.notification.add("Error al iniciar inspección", {
                type: "danger",
            });
        }
    }

    async loadVehicles() {
        try {
            const vehicles = await this.orm.searchRead(
                "fleet.vehicle",
                [],
                ["id", "name", "license_plate", "driver_id"],
                { limit: 100 }
            );
            return vehicles;
        } catch (error) {
            console.error("Error loading vehicles:", error);
            return [];
        }
    }

    async onSelectVehicle(vehicleId) {
        try {
            this.state.loading = true;
            
            // Create new inspection - let Odoo handle the default datetime
            const inspectionId = await this.orm.create("fleet.inspection", [{
                vehicle_id: vehicleId,
                driver_id: this.user.partnerId,
                state: 'draft',
                // Don't set inspection_date, let the default fields.Datetime.now handle it
            }]);
            
            // Start the inspection directly in mobile interface
            this.state.currentInspection = inspectionId[0];
            this.state.selectingVehicle = false;
            this.state.vehicles = [];
            this.state.loading = false;
            
            // Load the inspection and start the mobile inspection flow
            await this.startInspectionFlow(inspectionId[0]);
        } catch (error) {
            console.error("Error creating inspection:", error);
            if (this.notification) {
                this.notification.add("Error al crear inspección", {
                    type: "danger",
                });
            }
            this.state.loading = false;
        }
    }

    onCancelVehicleSelection() {
        this.state.selectingVehicle = false;
        this.state.vehicles = [];
    }

    async startInspectionFlow(inspectionId) {
        try {
            // Load inspection data
            const inspection = await this.orm.read("fleet.inspection", [inspectionId], [
                'name', 'vehicle_id', 'driver_id', 'inspection_date', 'state'
            ]);
            
            if (inspection && inspection.length > 0) {
                this.state.vehicleInfo = {
                    name: inspection[0].vehicle_id[1],
                    driver: inspection[0].driver_id[1],
                    inspectionName: inspection[0].name,
                };
                this.state.inspectionStarted = true;
                
                // Initialize the inspection (create lines from template)
                await this.orm.call("fleet.inspection", "action_start_inspection", [inspectionId]);
                
                // Load inspection items
                await this.loadInspectionItems(inspectionId);
            }
        } catch (error) {
            console.error("Error starting inspection flow:", error);
            if (this.notification) {
                this.notification.add("Error al iniciar el flujo de inspección", {
                    type: "danger",
                });
            }
        }
    }

    async loadInspectionItems(inspectionId) {
        try {
            // Load inspection items (lines)
            const items = await this.orm.searchRead(
                "fleet.inspection.line",
                [['inspection_id', '=', inspectionId]],
                ['id', 'template_item_id', 'status', 'observations', 'photo_ids', 'sequence'],
                { order: 'sequence asc' }
            );
            
            // Load template item details
            for (let item of items) {
                if (item.template_item_id) {
                    const templateItem = await this.orm.read(
                        "fleet.inspection.template.item",
                        [item.template_item_id[0]],
                        ['name', 'description', 'section_id', 'photo_required']
                    );
                    if (templateItem && templateItem.length > 0) {
                        item.name = templateItem[0].name;
                        item.description = templateItem[0].description;
                        item.section = templateItem[0].section_id ? templateItem[0].section_id[1] : 'General';
                        item.photo_required = templateItem[0].photo_required;
                    }
                }
            }
            
            this.state.items = items;
            this.state.itemIndex = 0;
            this.state.currentItem = items.length > 0 ? items[0] : null;
        } catch (error) {
            console.error("Error loading inspection items:", error);
            this.state.items = [];
            this.state.itemIndex = 0;
        }
    }

    onClickStart() {
        this.startNewInspection();
    }

    async onClickResume() {
        // Resume existing inspection - show draft inspections
        await this.action.doAction({
            type: 'ir.actions.act_window',
            res_model: 'fleet.inspection',
            view_mode: 'kanban,form',
            domain: [['state', '=', 'draft']],
            target: 'current',
            context: {},
            name: 'Inspecciones Pendientes',
        });
    }

    async onSelectStatus(status) {
        if (!this.state.currentItem) return;

        try {
            // Update the inspection line status
            await this.orm.write("fleet.inspection.line", [this.state.currentItem.id], {
                status: status
            });

            // Update local state
            this.state.currentItem.status = status;
            const itemIndex = this.state.items.findIndex(item => item.id === this.state.currentItem.id);
            if (itemIndex >= 0) {
                this.state.items[itemIndex].status = status;
            }

            // Auto-advance to next item after selection (unless it's "Mal" and needs photo)
            if (status !== 'mal' || !this.state.currentItem.photo_required) {
                setTimeout(() => this.onNextItem(), 500);
            } else {
                // TODO: Show photo capture for "Mal" items
                setTimeout(() => this.onNextItem(), 500);
            }

        } catch (error) {
            console.error("Error updating status:", error);
            if (this.notification) {
                this.notification.add("Error al actualizar estado", {
                    type: "danger",
                });
            }
        }
    }

    onNextItem() {
        if (this.state.itemIndex < this.state.items.length - 1) {
            this.state.itemIndex++;
            this.state.currentItem = this.state.items[this.state.itemIndex];
        } else {
            // All items completed - show completion screen
            this.showCompletionScreen();
        }
    }

    onPreviousItem() {
        if (this.state.itemIndex > 0) {
            this.state.itemIndex--;
            this.state.currentItem = this.state.items[this.state.itemIndex];
        }
    }

    showCompletionScreen() {
        this.state.inspectionCompleted = true;
        // Calculate completion stats
        const completed = this.state.items.filter(item => item.status).length;
        const total = this.state.items.length;
        this.state.completionStats = {
            completed,
            total,
            percentage: Math.round((completed / total) * 100)
        };
    }
}

// Register the client action
registry.category("actions").add("fleet_inspection_mobile", FleetInspectionMobile);