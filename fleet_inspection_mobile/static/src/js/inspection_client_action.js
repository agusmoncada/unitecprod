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
            showingObservations: false,
            selectedStatus: null,
            observations: '',
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
        this.onSaveObservations = this.onSaveObservations.bind(this);
        this.onSkipObservations = this.onSkipObservations.bind(this);
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
            console.log("Creating inspection for vehicle ID:", vehicleId);
            this.state.loading = true;
            
            // Create new inspection - let Odoo handle the default datetime
            const inspectionId = await this.orm.create("fleet.inspection", [{
                vehicle_id: vehicleId,
                driver_id: this.user.partnerId,
                state: 'draft',
                // Don't set inspection_date, let the default fields.Datetime.now handle it
            }]);
            
            console.log("Inspection created with ID:", inspectionId);
            console.log("Inspection ID type:", typeof inspectionId, "Is array:", Array.isArray(inspectionId));
            
            // Extract the actual ID - orm.create returns [id] array
            const actualInspectionId = Array.isArray(inspectionId) ? inspectionId[0] : inspectionId;
            console.log("Actual inspection ID:", actualInspectionId, "Type:", typeof actualInspectionId);
            
            // Start the inspection directly in mobile interface
            this.state.currentInspection = actualInspectionId;
            this.state.selectingVehicle = false;
            this.state.vehicles = [];
            this.state.loading = false;
            
            // Load the inspection and start the mobile inspection flow
            await this.startInspectionFlow(actualInspectionId);
        } catch (error) {
            console.error("Error creating inspection:", error);
            console.error("Error details:", error.message, error.stack);
            if (this.notification) {
                this.notification.add("Error al crear inspección: " + error.message, {
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
            console.log("Starting inspection flow for ID:", inspectionId);
            console.log("ID type:", typeof inspectionId);
            
            // Ensure inspectionId is a number
            let id = inspectionId;
            if (Array.isArray(inspectionId)) {
                id = inspectionId[0];
            }
            id = parseInt(id);
            if (isNaN(id) || id <= 0) {
                throw new Error(`Invalid inspection ID: ${inspectionId}, parsed as: ${id}`);
            }
            
            console.log("Using sanitized ID:", id);
            
            // Load inspection data
            const inspection = await this.orm.read("fleet.inspection", [id], [
                'name', 'vehicle_id', 'driver_id', 'inspection_date', 'state'
            ]);
            
            console.log("Loaded inspection data:", inspection);
            
            if (inspection && inspection.length > 0) {
                this.state.vehicleInfo = {
                    name: inspection[0].vehicle_id[1],
                    driver: inspection[0].driver_id[1],
                    inspectionName: inspection[0].name,
                };
                
                console.log("Set vehicle info:", this.state.vehicleInfo);
                
                // Initialize the inspection (create lines from template)
                console.log("Calling initialize_mobile_inspection...");
                try {
                    const result = await this.orm.call("fleet.inspection", "initialize_mobile_inspection", [id]);
                    console.log("initialize_mobile_inspection result:", result);
                } catch (templateError) {
                    console.error("Error in initialize_mobile_inspection:", templateError);
                    // Check if template exists
                    const templates = await this.orm.searchRead(
                        "fleet.inspection.template", 
                        [['active', '=', true]], 
                        ['id', 'name']
                    );
                    console.log("Available templates:", templates);
                    
                    if (templates.length === 0) {
                        if (this.notification) {
                            this.notification.add("No hay plantillas de inspección disponibles. Contacte al administrador.", {
                                type: "warning",
                            });
                        }
                        return;
                    } else {
                        throw templateError; // Re-throw if templates exist but there's another error
                    }
                }
                
                // Load inspection items
                console.log("Loading inspection items...");
                await this.loadInspectionItems(id);
                
                this.state.inspectionStarted = true;
                console.log("Inspection flow started successfully");
            } else {
                console.error("No inspection data found for ID:", inspectionId);
            }
        } catch (error) {
            console.error("Error starting inspection flow:", error);
            console.error("Error details:", error.message, error.stack);
            if (this.notification) {
                this.notification.add("Error al iniciar el flujo de inspección: " + error.message, {
                    type: "danger",
                });
            }
        }
    }

    async loadInspectionItems(inspectionId) {
        try {
            console.log("Loading inspection items for inspection ID:", inspectionId);
            
            // Load inspection items (lines)
            const items = await this.orm.searchRead(
                "fleet.inspection.line",
                [['inspection_id', '=', inspectionId]],
                ['id', 'template_item_id', 'status', 'observations', 'photo_ids', 'sequence'],
                { order: 'sequence asc' }
            );
            
            console.log("Found inspection items:", items);
            
            // Load template item details in batch for better performance
            const templateItemIds = items
                .filter(item => item.template_item_id && item.template_item_id.length > 0)
                .map(item => item.template_item_id[0]);
            
            let templateItemsMap = {};
            if (templateItemIds.length > 0) {
                try {
                    const templateItems = await this.orm.read(
                        "fleet.inspection.template.item",
                        templateItemIds,
                        ['name', 'description', 'section_id', 'photo_required_on_bad']
                    );
                    
                    // Create a map for fast lookup
                    templateItems.forEach(templateItem => {
                        templateItemsMap[templateItem.id] = templateItem;
                    });
                } catch (templateError) {
                    console.error("Error loading template items:", templateError);
                }
            }
            
            // Apply template data to items
            for (let item of items) {
                if (item.template_item_id && item.template_item_id.length > 0) {
                    const templateItem = templateItemsMap[item.template_item_id[0]];
                    if (templateItem) {
                        item.name = templateItem.name;
                        item.description = templateItem.description;
                        item.section = templateItem.section_id ? templateItem.section_id[1] : 'General';
                        item.photo_required = templateItem.photo_required_on_bad;
                    } else {
                        // Set fallback values
                        item.name = `Item ${item.id}`;
                        item.description = 'Elemento de inspección';
                        item.section = 'General';
                        item.photo_required = false;
                    }
                } else {
                    console.log("Item has no template_item_id:", item);
                    // Set fallback values
                    item.name = `Item ${item.id}`;
                    item.description = 'Elemento de inspección';
                    item.section = 'General';
                    item.photo_required = false;
                }
            }
            
            console.log("Loaded all template items in batch");
            
            this.state.items = items;
            this.state.itemIndex = 0;
            this.state.currentItem = items.length > 0 ? items[0] : null;
            
            console.log("Final items loaded:", items.length, "Current item:", this.state.currentItem);
        } catch (error) {
            console.error("Error loading inspection items:", error);
            console.error("Error details:", error.message, error.stack);
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

        // For 'regular' and 'mal' status, show observations input
        if (status === 'regular' || status === 'mal') {
            this.state.selectedStatus = status;
            this.state.observations = this.state.currentItem.observations || '';
            this.state.showingObservations = true;
            return;
        }

        // For 'bien' and 'na', save directly
        await this.saveStatusAndObservations(status, '');
    }

    async saveStatusAndObservations(status, observations) {
        if (!this.state.currentItem) return;

        try {
            console.log("Saving status for item:", this.state.currentItem.id, "status:", status);
            
            // Update the inspection line status and observations
            await this.orm.write("fleet.inspection.line", [this.state.currentItem.id], {
                status: status,
                observations: observations || false
            });

            console.log("Status saved successfully");

            // Update local state
            this.state.currentItem.status = status;
            this.state.currentItem.observations = observations;
            const itemIndex = this.state.items.findIndex(item => item.id === this.state.currentItem.id);
            if (itemIndex >= 0) {
                this.state.items[itemIndex].status = status;
                this.state.items[itemIndex].observations = observations;
            }

            // Show success feedback
            if (this.notification) {
                this.notification.add("Estado guardado", {
                    type: "success",
                    sticky: false
                });
            }

            // Auto-advance to next item
            setTimeout(() => this.onNextItem(), 300);

        } catch (error) {
            console.error("Error updating status:", error);
            if (this.notification) {
                this.notification.add("Error al actualizar estado: " + error.message, {
                    type: "danger",
                });
            }
        }
    }

    async onSaveObservations() {
        await this.saveStatusAndObservations(this.state.selectedStatus, this.state.observations);
        this.state.showingObservations = false;
        this.state.selectedStatus = null;
        this.state.observations = '';
    }

    onSkipObservations() {
        this.saveStatusAndObservations(this.state.selectedStatus, '');
        this.state.showingObservations = false;
        this.state.selectedStatus = null;
        this.state.observations = '';
    }

    onNextItem() {
        if (this.state.itemIndex < this.state.items.length - 1) {
            this.state.itemIndex++;
            this.state.currentItem = this.state.items[this.state.itemIndex];
        } else {
            // Reached last item - check if all are completed before finishing
            const incompleteItems = this.state.items.filter(item => !item.status);
            console.log("Checking completion status:");
            console.log("Total items:", this.state.items.length);
            console.log("Incomplete items:", incompleteItems.length);
            console.log("Incomplete items IDs:", incompleteItems.map(item => ({id: item.id, name: item.name})));
            
            if (incompleteItems.length > 0) {
                // Show notification about incomplete items
                if (this.notification) {
                    this.notification.add(`Faltan ${incompleteItems.length} elementos por completar. Revise los elementos pendientes.`, {
                        type: "warning",
                    });
                }
                // Go to first incomplete item
                const firstIncompleteIndex = this.state.items.findIndex(item => !item.status);
                if (firstIncompleteIndex >= 0) {
                    this.state.itemIndex = firstIncompleteIndex;
                    this.state.currentItem = this.state.items[firstIncompleteIndex];
                }
            } else {
                // Double-check by reloading items from server before completing
                console.log("All items appear complete in frontend, verifying with server...");
                await this.verifyCompletionAndFinish();
            }
        }
    }

    onPreviousItem() {
        if (this.state.itemIndex > 0) {
            this.state.itemIndex--;
            this.state.currentItem = this.state.items[this.state.itemIndex];
        }
    }

    async verifyCompletionAndFinish() {
        try {
            // Reload items from server to check actual completion status
            const serverItems = await this.orm.searchRead(
                "fleet.inspection.line",
                [['inspection_id', '=', this.state.currentInspection]],
                ['id', 'status'],
                { order: 'sequence asc' }
            );
            
            const incompleteServerItems = serverItems.filter(item => !item.status);
            console.log("Server verification:");
            console.log("Server items:", serverItems.length);
            console.log("Server incomplete:", incompleteServerItems.length);
            console.log("Incomplete server items:", incompleteServerItems);
            
            if (incompleteServerItems.length > 0) {
                // Sync frontend with server state
                incompleteServerItems.forEach(serverItem => {
                    const frontendItem = this.state.items.find(item => item.id === serverItem.id);
                    if (frontendItem) {
                        frontendItem.status = serverItem.status;
                    }
                });
                
                // Show notification and go to first incomplete
                if (this.notification) {
                    this.notification.add(`${incompleteServerItems.length} elementos no se guardaron correctamente. Revisando...`, {
                        type: "warning",
                    });
                }
                
                const firstIncompleteIndex = this.state.items.findIndex(item => 
                    incompleteServerItems.some(serverItem => serverItem.id === item.id)
                );
                if (firstIncompleteIndex >= 0) {
                    this.state.itemIndex = firstIncompleteIndex;
                    this.state.currentItem = this.state.items[firstIncompleteIndex];
                }
            } else {
                // All verified complete, proceed with completion
                this.showCompletionScreen();
            }
        } catch (error) {
            console.error("Error verifying completion:", error);
            // Fallback to completion screen with warning
            this.showCompletionScreen();
        }
    }

    async showCompletionScreen() {
        // Calculate completion stats
        const completed = this.state.items.filter(item => item.status).length;
        const total = this.state.items.length;
        this.state.completionStats = {
            completed,
            total,
            percentage: Math.round((completed / total) * 100)
        };

        // Complete the inspection in the backend
        try {
            await this.orm.call("fleet.inspection", "action_complete_inspection", [this.state.currentInspection]);
            this.state.inspectionCompleted = true;
        } catch (error) {
            console.error("Error completing inspection:", error);
            // Show completion screen anyway but with warning
            this.state.inspectionCompleted = true;
            if (this.notification) {
                this.notification.add("Inspección completada pero con advertencias. Verifique el estado.", {
                    type: "warning",
                });
            }
        }
    }
}

// Register the client action
registry.category("actions").add("fleet_inspection_mobile", FleetInspectionMobile);