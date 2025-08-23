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
        });
        
        this.loadInspection();
        
        // Bind methods to maintain context
        this.onSelectVehicle = this.onSelectVehicle.bind(this);
        this.onCancelVehicleSelection = this.onCancelVehicleSelection.bind(this);
        this.onClickStart = this.onClickStart.bind(this);
        this.onClickResume = this.onClickResume.bind(this);
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
            
            // Open the inspection in form view
            await this.action.doAction({
                type: 'ir.actions.act_window',
                res_model: 'fleet.inspection',
                res_id: inspectionId[0],
                view_mode: 'form',
                views: [[false, 'form']],
                target: 'current',
                context: {
                    'form_view_initial_mode': 'edit',
                },
            });
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

    async loadInspectionItems() {
        // Load inspection items from template
        // This would be implemented based on your inspection template structure
        this.state.items = [];
        this.state.itemIndex = 0;
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
}

// Register the client action
registry.category("actions").add("fleet_inspection_mobile", FleetInspectionMobile);