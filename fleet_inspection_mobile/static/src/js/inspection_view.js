/** @odoo-module **/

import { registry } from "@web/core/registry";
import { InspectionMobileController } from "./inspection_controller";
import { InspectionMobileRenderer } from "./inspection_renderer";
import { InspectionMobileModel } from "./inspection_model";

/**
 * Mobile Inspection View for Fleet Vehicles
 * 
 * This custom view provides a mobile-optimized interface for vehicle inspections
 * with features like:
 * - Single-item navigation
 * - Touch-friendly controls
 * - Camera integration
 * - Offline capability
 * - Progress tracking
 */
export const inspectionMobileView = {
    type: "inspection_mobile",
    display_name: "Mobile Inspection",
    icon: "fa-mobile",
    multiRecord: false,
    searchMenuTypes: [],
    
    Controller: InspectionMobileController,
    Renderer: InspectionMobileRenderer,
    Model: InspectionMobileModel,
    
    props: (genericProps, view) => {
        const { arch, resModel, fields } = genericProps;
        
        return {
            ...genericProps,
            Model: InspectionMobileModel,
            Renderer: InspectionMobileRenderer,
            buttonTemplate: "fleet_inspection_mobile.buttons",
            archInfo: {
                arch,
                fields,
                resModel,
            },
        };
    },
};

// Register the view
registry.category("views").add("inspection_mobile", inspectionMobileView);