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
            showingPhotoCapture: false,
            capturedPhotos: [],
            photoRequired: false,
            // Driver information
            showingDriverInfo: false,
            selectedVehicleId: null,
            driverInfo: {
                license_number: '',
                license_type: '',
                license_expiry: '',
                defensive_course: false,
                course_expiry: '',
                course_duration: '',
                odometer: '',
            },
            // Signature
            showingSignature: false,
            driverSignature: null,
            // Draft inspection selection
            showingDraftSelection: false,
            draftInspections: [],
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
        this.onCapturePhoto = this.onCapturePhoto.bind(this);
        this.onSavePhotos = this.onSavePhotos.bind(this);
        this.onSkipPhotos = this.onSkipPhotos.bind(this);
        this.onRemovePhoto = this.onRemovePhoto.bind(this);
        this.onSaveDriverInfo = this.onSaveDriverInfo.bind(this);
        this.onSkipDriverInfo = this.onSkipDriverInfo.bind(this);
        this.onSaveSignature = this.onSaveSignature.bind(this);
        this.onSkipSignature = this.onSkipSignature.bind(this);
        this.clearSignature = this.clearSignature.bind(this);
        this.setupSignatureCanvas = this.setupSignatureCanvas.bind(this);
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
            console.log("Vehicle selected:", vehicleId);
            
            // Load vehicle data to get current odometer reading
            const vehicleData = await this.orm.read("fleet.vehicle", [vehicleId], ['odometer', 'name', 'license_plate']);
            const vehicle = vehicleData && vehicleData.length > 0 ? vehicleData[0] : {};
            
            // Pre-fill odometer with current vehicle reading
            this.state.driverInfo.odometer = vehicle.odometer || '';
            
            // Store selected vehicle and show driver info form
            this.state.selectedVehicleId = vehicleId;
            this.state.selectingVehicle = false;
            this.state.showingDriverInfo = true;
            this.state.loading = false;
        } catch (error) {
            console.error("Error creating inspection:", error);
            console.error("Error details:", error.message, error.stack);
            
            let errorMessage = "Error al crear inspección";
            if (error.message && error.message.includes('template')) {
                errorMessage = "No hay plantillas de inspección disponibles. Contacte al administrador.";
            } else if (error.message && error.message.includes('odometer')) {
                errorMessage = "Se requiere lectura del odómetro para crear la inspección.";
            } else if (error.message) {
                errorMessage += ": " + error.message;
            }
            
            if (this.notification) {
                this.notification.add(errorMessage, {
                    type: "danger",
                    sticky: true
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
        try {
            this.state.loading = true;
            
            // Get draft inspections for current user
            const draftInspections = await this.orm.search_read('fleet.inspection', 
                [['state', '=', 'draft'], ['create_uid', '=', this.user.userId]], 
                ['id', 'name', 'vehicle_id', 'inspection_date', 'completion_percentage']
            );
            
            if (draftInspections.length === 0) {
                this.notification.add("No tienes inspecciones pendientes", {
                    type: "info",
                });
                this.state.loading = false;
                return;
            }
            
            if (draftInspections.length === 1) {
                // Resume the single draft inspection
                await this.resumeInspection(draftInspections[0].id);
            } else {
                // Show selection if multiple drafts exist
                this.state.draftInspections = draftInspections;
                this.state.showingDraftSelection = true;
            }
            
            this.state.loading = false;
        } catch (error) {
            console.error("Error loading draft inspections:", error);
            this.notification.add("Error al cargar inspecciones pendientes", {
                type: "danger",
            });
            this.state.loading = false;
        }
    }

    async resumeInspection(inspectionId) {
        try {
            console.log("Resuming inspection:", inspectionId);
            this.state.loading = true;
            
            // Load the existing inspection
            const inspection = await this.orm.read('fleet.inspection', [inspectionId], [
                'id', 'name', 'vehicle_id', 'driver_id', 'template_id', 'state'
            ]);
            
            if (!inspection || inspection.length === 0) {
                throw new Error("Inspection not found");
            }
            
            const inspectionData = inspection[0];
            
            // Load vehicle info
            const vehicleData = await this.orm.read('fleet.vehicle', [inspectionData.vehicle_id[0]], 
                ['name', 'license_plate']);
            const vehicle = vehicleData[0];
            
            // Load inspection items
            const lines = await this.orm.search_read('fleet.inspection.line', 
                [['inspection_id', '=', inspectionId]], 
                ['id', 'name', 'section', 'status', 'observations', 'sequence'], 
                { order: 'sequence' }
            );
            
            // Set up state for inspection
            this.state.currentInspection = inspectionData;
            this.state.items = lines;
            this.state.vehicleInfo = {
                id: vehicle.id,
                name: vehicle.name,
                license_plate: vehicle.license_plate,
                driver: inspectionData.driver_id[1]
            };
            
            // Find first incomplete item
            const incompleteItems = lines.filter(item => !item.status);
            if (incompleteItems.length > 0) {
                this.state.currentItem = incompleteItems[0];
                this.state.itemIndex = lines.findIndex(item => item.id === this.state.currentItem.id);
            } else {
                // All items completed, go to summary
                this.state.currentItem = null;
                this.state.itemIndex = lines.length;
                this.goToSummary();
                return;
            }
            
            // Hide draft selection and show inspection
            this.state.showingDraftSelection = false;
            this.state.inspectionStarted = true;
            this.state.loading = false;
            
        } catch (error) {
            console.error("Error resuming inspection:", error);
            this.notification.add("Error al reanudar inspección: " + error.message, {
                type: "danger",
            });
            this.state.loading = false;
        }
    }

    goToSummary() {
        // Set summary state
        this.state.inspectionCompleted = false; // Will be set to true after summary is shown
        this.state.itemIndex = this.state.items.length; // Show summary
        this.state.currentItem = null;
        
        // Calculate completion stats
        this.calculateCompletionStats();
    }

    calculateCompletionStats() {
        const items = this.state.items;
        this.state.completionStats = {
            total: items.length,
            good: items.filter(item => item.status === 'bien').length,
            regular: items.filter(item => item.status === 'regular').length,
            bad: items.filter(item => item.status === 'mal').length,
            na: items.filter(item => item.status === 'na').length,
        };
    }

    async onSelectStatus(status) {
        if (!this.state.currentItem) return;

        // Store selected status
        this.state.selectedStatus = status;

        // For 'mal' status, check if photos are required
        if (status === 'mal' && this.state.currentItem.photo_required) {
            this.state.observations = this.state.currentItem.observations || '';
            this.state.showingObservations = true;
            this.state.photoRequired = true;
            return;
        }

        // For 'regular' status, show observations input without photo requirement
        if (status === 'regular') {
            this.state.observations = this.state.currentItem.observations || '';
            this.state.showingObservations = true;
            this.state.photoRequired = false;
            return;
        }

        // For 'bien' and 'na', save directly
        await this.saveStatusAndObservations(status, '', []);
    }

    async saveStatusAndObservations(status, observations, photos = null) {
        if (!this.state.currentItem) return;

        try {
            console.log("Saving status for item:", this.state.currentItem.id, "status:", status);
            
            // Update the inspection line status and observations
            await this.orm.write("fleet.inspection.line", [this.state.currentItem.id], {
                status: status,
                observations: observations || false
            });

            // Save photos if provided
            if (photos && photos.length > 0) {
                console.log("Saving", photos.length, "photos for item");
                for (const photo of photos) {
                    await this.orm.create("fleet.inspection.photo", [{
                        line_id: this.state.currentItem.id,
                        name: photo.name || `Photo_${new Date().getTime()}.jpg`,
                        image: photo.data, // Base64 encoded image
                        taken_at: new Date().toISOString().replace('T', ' ').split('.')[0],
                    }]);
                }
            }

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
            setTimeout(async () => await this.onNextItem(), 300);

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
        // If photo is required, show photo capture screen
        if (this.state.photoRequired && this.state.selectedStatus === 'mal') {
            this.state.showingObservations = false;
            this.state.showingPhotoCapture = true;
            this.state.capturedPhotos = [];
        } else {
            // Save without photos
            await this.saveStatusAndObservations(this.state.selectedStatus, this.state.observations, []);
            this.state.showingObservations = false;
            this.state.selectedStatus = null;
            this.state.observations = '';
            this.state.photoRequired = false;
        }
    }

    async onSkipObservations() {
        // If photo is required, still need to show photo capture
        if (this.state.photoRequired && this.state.selectedStatus === 'mal') {
            this.state.showingObservations = false;
            this.state.showingPhotoCapture = true;
            this.state.capturedPhotos = [];
        } else {
            await this.saveStatusAndObservations(this.state.selectedStatus, '', []);
            this.state.showingObservations = false;
            this.state.selectedStatus = null;
            this.state.observations = '';
            this.state.photoRequired = false;
        }
    }

    async onCapturePhoto(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            // Handle multiple files if selected from gallery
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64Data = e.target.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
                    this.state.capturedPhotos.push({
                        name: file.name || `Photo_${Date.now()}_${i}.jpg`,
                        data: base64Data,
                        preview: e.target.result, // Keep full data URL for preview
                    });
                };
                reader.readAsDataURL(file);
            }
            event.target.value = ''; // Reset input
        }
    }

    onRemovePhoto(index) {
        this.state.capturedPhotos.splice(index, 1);
    }

    async onSaveDriverInfo() {
        // Validate required fields
        if (!this.state.driverInfo.license_number || !this.state.driverInfo.license_type) {
            if (this.notification) {
                this.notification.add("Número de licencia y tipo son obligatorios", {
                    type: "warning",
                });
            }
            return;
        }

        try {
            console.log("Creating inspection with driver info for vehicle ID:", this.state.selectedVehicleId);
            this.state.loading = true;
            
            // Get vehicle data for odometer and other info
            const vehicleData = await this.orm.read("fleet.vehicle", [this.state.selectedVehicleId], ['odometer', 'name', 'license_plate']);
            const vehicle = vehicleData && vehicleData.length > 0 ? vehicleData[0] : {};
            
            // Get default template
            let templateId = false;
            try {
                const templates = await this.orm.searchRead(
                    "fleet.inspection.template", 
                    [['active', '=', true]], 
                    ['id', 'name'], 
                    { limit: 1, order: 'sequence asc' }
                );
                if (templates.length > 0) {
                    templateId = templates[0].id;
                }
            } catch (templateError) {
                console.warn("Could not fetch inspection template:", templateError);
            }
            
            // Get device info
            const deviceInfo = `${navigator.userAgent} - ${new Date().toLocaleString()}`;
            
            // Create new inspection with all required fields including driver info
            const inspectionData = {
                vehicle_id: this.state.selectedVehicleId,
                driver_id: this.user.partnerId,
                state: 'draft',
                inspection_date: new Date().toISOString().replace('T', ' ').split('.')[0],
                start_time: new Date().toISOString().replace('T', ' ').split('.')[0],
                device_info: deviceInfo,
                // Driver information
                license_number: this.state.driverInfo.license_number,
                license_type: this.state.driverInfo.license_type,
                license_expiry: this.state.driverInfo.license_expiry || false,
                defensive_course: this.state.driverInfo.defensive_course,
                course_expiry: this.state.driverInfo.course_expiry || false,
                course_duration: this.state.driverInfo.course_duration || false,
                odometer: parseFloat(this.state.driverInfo.odometer) || 0,
            };
            
            // Add template if found
            if (templateId) {
                inspectionData.template_id = templateId;
            }
            
            // Add odometer if available
            if (vehicle.odometer) {
                inspectionData.odometer = vehicle.odometer;
            }
            
            console.log("Creating inspection with data:", inspectionData);
            const inspectionId = await this.orm.create("fleet.inspection", [inspectionData]);
            
            const actualInspectionId = Array.isArray(inspectionId) ? inspectionId[0] : inspectionId;
            console.log("Actual inspection ID:", actualInspectionId);
            
            // Store inspection and hide driver info
            this.state.currentInspection = actualInspectionId;
            this.state.showingDriverInfo = false;
            this.state.loading = false;
            
            // Load the inspection and start the mobile inspection flow
            await this.startInspectionFlow(actualInspectionId);
        } catch (error) {
            console.error("Error creating inspection:", error);
            if (this.notification) {
                this.notification.add("Error al crear inspección: " + (error.message || 'Error desconocido'), {
                    type: "danger",
                    sticky: true
                });
            }
            this.state.loading = false;
        }
    }

    onSkipDriverInfo() {
        // Set minimal required values
        this.state.driverInfo.license_number = 'No especificado';
        this.state.driverInfo.license_type = 'B';
        this.onSaveDriverInfo();
    }

    resetToStartPage() {
        // Reset all state to initial values
        this.state.currentInspection = null;
        this.state.currentItem = null;
        this.state.items = [];
        this.state.itemIndex = 0;
        this.state.loading = false;
        this.state.selectingVehicle = false;
        this.state.vehicles = [];
        this.state.inspectionStarted = false;
        this.state.vehicleInfo = null;
        this.state.inspectionCompleted = false;
        this.state.completionStats = null;
        this.state.showingObservations = false;
        this.state.selectedStatus = null;
        this.state.observations = '';
        this.state.showingPhotoCapture = false;
        this.state.capturedPhotos = [];
        this.state.photoRequired = false;
        this.state.showingDriverInfo = false;
        this.state.selectedVehicleId = null;
        this.state.driverInfo = {
            license_number: '',
            license_type: '',
            license_expiry: '',
            defensive_course: false,
            course_duration: '',
        };
        this.state.showingSignature = false;
        this.state.driverSignature = null;
        
        // Show start page message
        if (this.notification) {
            this.notification.add("Listo para una nueva inspección", {
                type: "info",
                sticky: false
            });
        }
    }

    async onSavePhotos() {
        if (this.state.capturedPhotos.length === 0 && this.state.photoRequired) {
            if (this.notification) {
                this.notification.add("Se requiere al menos una foto para elementos marcados como 'Mal'", {
                    type: "warning",
                });
            }
            return;
        }

        await this.saveStatusAndObservations(
            this.state.selectedStatus, 
            this.state.observations, 
            this.state.capturedPhotos
        );
        
        this.state.showingPhotoCapture = false;
        this.state.capturedPhotos = [];
        this.state.selectedStatus = null;
        this.state.observations = '';
        this.state.photoRequired = false;
    }

    async onSkipPhotos() {
        // Can't skip if photos are required
        if (this.state.photoRequired) {
            if (this.notification) {
                this.notification.add("Las fotos son obligatorias para elementos marcados como 'Mal'", {
                    type: "danger",
                });
            }
            return;
        }

        await this.saveStatusAndObservations(this.state.selectedStatus, this.state.observations, []);
        this.state.showingPhotoCapture = false;
        this.state.capturedPhotos = [];
        this.state.selectedStatus = null;
        this.state.observations = '';
        this.state.photoRequired = false;
    }

    async onNextItem() {
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
                // All verified complete, show signature screen
                this.showSignatureScreen();
            }
        } catch (error) {
            console.error("Error verifying completion:", error);
            // Fallback to completion screen with warning
            this.showCompletionScreen();
        }
    }

    showSignatureScreen() {
        this.state.showingSignature = true;
        this.state.driverSignature = null;
        
        // Setup canvas after render
        setTimeout(() => this.setupSignatureCanvas(), 100);
    }

    setupSignatureCanvas() {
        const canvas = document.getElementById('signatureCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        // Set canvas size to match display size
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Set drawing style
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        let isDrawing = false;
        let hasSignature = false;

        // Mouse events
        const startDrawing = (e) => {
            isDrawing = true;
            hasSignature = true;
            const rect = canvas.getBoundingClientRect();
            ctx.beginPath();
            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        };

        const draw = (e) => {
            if (!isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            ctx.stroke();
        };

        const stopDrawing = () => {
            if (isDrawing) {
                isDrawing = false;
                // Save signature as base64
                this.state.driverSignature = canvas.toDataURL().split(',')[1];
            }
        };

        // Touch events
        const startTouch = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        };

        const moveTouch = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        };

        const endTouch = (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        };

        // Add event listeners
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        canvas.addEventListener('touchstart', startTouch, { passive: false });
        canvas.addEventListener('touchmove', moveTouch, { passive: false });
        canvas.addEventListener('touchend', endTouch, { passive: false });

        // Store canvas and context for clearing
        this.signatureCanvas = canvas;
        this.signatureCtx = ctx;
    }

    clearSignature() {
        if (this.signatureCanvas && this.signatureCtx) {
            this.signatureCtx.clearRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
            this.state.driverSignature = null;
        }
    }

    async onSaveSignature() {
        if (!this.state.driverSignature) {
            if (this.notification) {
                this.notification.add("Se requiere la firma del conductor para finalizar", {
                    type: "warning",
                });
            }
            return;
        }

        try {
            // Save signature to inspection
            await this.orm.write("fleet.inspection", [this.state.currentInspection], {
                driver_signature: this.state.driverSignature
            });

            // Now complete the inspection
            this.state.showingSignature = false;
            this.showCompletionScreen();
        } catch (error) {
            console.error("Error saving signature:", error);
            if (this.notification) {
                this.notification.add("Error al guardar firma: " + (error.message || 'Error desconocido'), {
                    type: "danger",
                });
            }
        }
    }

    async onSkipSignature() {
        // Skip signature and complete directly
        this.state.showingSignature = false;
        this.showCompletionScreen();
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
            
            // Show success notification
            if (this.notification) {
                this.notification.add("¡Inspección completada exitosamente!", {
                    type: "success",
                    sticky: false
                });
            }
            
            // Show completion screen briefly, then reset to start page
            this.state.inspectionCompleted = true;
            
            // Auto-return to start page after 3 seconds
            setTimeout(() => {
                this.resetToStartPage();
            }, 3000);
        } catch (error) {
            console.error("Error completing inspection:", error);
            
            let errorMessage = "Error al completar inspección";
            if (error.message && error.message.includes('template')) {
                errorMessage = "Falta plantilla de inspección. Contacte al administrador.";
            } else if (error.message && error.message.includes('odometer')) {
                errorMessage = "Se requiere lectura del odómetro para completar.";
            } else if (error.message && error.message.includes('items remaining')) {
                errorMessage = "Hay elementos incompletos. Revise todos los elementos.";
            } else if (error.message && error.message.includes('Photos are required')) {
                errorMessage = "Se requieren fotos para elementos marcados como 'Mal'.";
            } else if (error.message) {
                errorMessage += ": " + error.message;
            }
            
            // Don't show completion screen, stay in inspection mode
            if (this.notification) {
                this.notification.add(errorMessage, {
                    type: "danger",
                    sticky: true
                });
            }
        }
    }
}

// Register the client action
registry.category("actions").add("fleet_inspection_mobile", FleetInspectionMobile);