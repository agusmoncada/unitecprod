/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

/**
 * Mobile Inspection Client Action
 * 
 * This client action provides a mobile-optimized interface for vehicle inspections
 */
export class FleetInspectionMobile extends Component {
    static template = "fleet_inspection_mobile.InspectionMobile";
    static props = ["*"];

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.notification = useService("notification");
        this.rpc = useService("rpc");
        
        this.state = {
            currentInspection: null,
            currentItem: null,
            items: [],
            itemIndex: 0,
            loading: true,
        };
        
        this.loadInspection();
    }

    async loadInspection() {
        try {
            // For now, just load a basic interface
            this.state.loading = false;
            this.render();
        } catch (error) {
            console.error("Error loading inspection:", error);
            this.notification.add(_t("Error loading inspection"), {
                type: "danger",
            });
        }
    }

    async startNewInspection() {
        try {
            const vehicleId = await this.selectVehicle();
            if (!vehicleId) return;
            
            const inspection = await this.orm.create("fleet.inspection", {
                vehicle_id: vehicleId,
                driver_id: this.env.user.partner_id,
                state: 'draft',
            });
            
            this.state.currentInspection = inspection;
            await this.loadInspectionItems();
        } catch (error) {
            console.error("Error starting inspection:", error);
            this.notification.add(_t("Error starting inspection"), {
                type: "danger",
            });
        }
    }

    async selectVehicle() {
        // Open vehicle selection dialog
        const action = {
            type: 'ir.actions.act_window',
            res_model: 'fleet.vehicle',
            view_mode: 'kanban,form',
            views: [[false, 'kanban'], [false, 'form']],
            target: 'new',
            context: {},
        };
        
        return this.action.doAction(action);
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

    onClickResume() {
        // Resume existing inspection
        this.action.doAction({
            type: 'ir.actions.act_window',
            res_model: 'fleet.inspection',
            view_mode: 'kanban,form',
            domain: [['state', '=', 'draft']],
            context: {},
        });
    }

    onClickBack() {
        this.action.doAction({
            type: 'ir.actions.act_window',
            res_model: 'fleet.vehicle',
            view_mode: 'kanban,tree,form',
        });
    }
}

// Register the client action
registry.category("actions").add("fleet_inspection_mobile", FleetInspectionMobile);