# Fleet Vehicle Inspection Mobile

A mobile-optimized Odoo v16 addon that replaces paper-based vehicle inspection forms with a digital, user-friendly interface.

## Features

- **Mobile-First Design**: Single-item-at-a-time interface optimized for smartphones
- **Touch-Friendly Controls**: Large buttons and intuitive navigation
- **Camera Integration**: Native camera access for damage documentation
- **Offline Capability**: Continue inspections without internet connection
- **Auto-sync**: Automatic synchronization when connection is restored
- **Digital Signatures**: Touch-enabled signature capture
- **Spanish (Argentina) Localization**: Full translation support
- **Fleet Integration**: Seamless integration with Odoo Fleet module
- **Progress Tracking**: Visual progress indicators and completion statistics
- **Photo Management**: Multiple photos per item with annotation support

## Requirements

- Odoo Community Edition v16.0
- Fleet module installed and configured
- Modern web browser with camera support
- Mobile device with touch screen (recommended)

## Installation

1. Copy the `fleet_inspection_mobile` folder to your Odoo addons directory
2. Update the apps list in Odoo
3. Install the "Fleet Vehicle Inspection Mobile" module
4. Configure inspection templates in Fleet > Inspections > Configuration > Inspection Templates

## Configuration

### Company Settings

Navigate to Settings > Companies and configure the following options:

- **Require Photo for Bad Items**: Enforce photo capture for items marked as "Mal"
- **Allow Photo for Regular Items**: Allow optional photos for "Regular" items
- **Max Photos per Item**: Maximum number of photos per inspection item (default: 3)
- **Enable GPS Location**: Capture GPS coordinates with photos
- **Require Digital Signature**: Mandate driver signature for completion
- **Auto-create Maintenance**: Automatically generate maintenance requests for "Mal" items
- **Default Inspection Template**: Template used for new inspections

### User Groups

The module defines two security groups:

- **Fleet Inspection User**: Can create and manage their own inspections
- **Fleet Inspection Manager**: Full access to all inspections and configuration

## Usage

### Starting an Inspection

1. Navigate to Fleet > Inspections > Mobile Interface
2. Search for or select a vehicle from the list
3. Tap "Start Inspection" or "Resume" for draft inspections

### Mobile Interface

The mobile interface provides:

- **Header**: Vehicle name, progress indicator, and connection status
- **Item Card**: Current inspection item with section information
- **Status Buttons**: Large touch-friendly buttons for "BIEN", "REGULAR", "MAL"
- **Observations**: Expandable text area for additional notes
- **Photo Section**: Camera integration for required/optional photos
- **Navigation**: Previous/Next buttons with swipe gesture support

### Completing Items

1. Review the inspection item description
2. Select the appropriate status (BIEN/REGULAR/MAL)
3. Add observations if needed
4. Take photos for items marked as MAL (required) or REGULAR (optional)
5. Navigate to the next item using buttons or swipe gestures

### Finishing Inspection

1. Complete all inspection items
2. Review the summary statistics
3. Add general observations about the vehicle
4. Provide digital signature
5. Tap "Complete" to finalize

## Mobile Features

### Offline Mode

The app automatically handles offline scenarios:

- Inspections continue without internet connection
- Changes are stored locally and synced when online
- Visual indicators show offline status and pending changes

### Touch Gestures

- **Swipe Left**: Navigate to next item
- **Swipe Right**: Navigate to previous item  
- **Long Press**: Access additional options (future feature)

### Camera Features

- **Auto-focus**: Continuous autofocus for sharp images
- **Flash Control**: Toggle flashlight on supported devices
- **Front/Back Camera**: Switch between cameras
- **Photo Compression**: Automatic image compression for storage efficiency
- **Annotation Support**: Draw circles, arrows, and text on photos

## Technical Architecture

### Data Models

- **fleet.inspection**: Main inspection record
- **fleet.inspection.line**: Individual checklist items
- **fleet.inspection.photo**: Photo attachments with metadata
- **fleet.inspection.template**: Configurable inspection templates
- **fleet.inspection.template.section**: Template sections
- **fleet.inspection.template.item**: Template items

### JavaScript Components

- **InspectionMobileView**: Custom Odoo view type
- **InspectionMobileController**: Main controller logic
- **InspectionMobileRenderer**: UI rendering and templates
- **InspectionMobileModel**: Data management and API calls
- **PhotoCaptureComponent**: Camera integration
- **SignaturePad**: Digital signature capture
- **CameraUtils**: Camera utilities and permissions
- **StorageUtils**: Offline storage management

### Mobile-First CSS

- Responsive design with mobile breakpoints
- Touch-optimized button sizes (minimum 48px)
- High contrast mode support
- Dark mode compatibility
- Print styles for reports

## Default Inspection Template

The module includes a comprehensive inspection template based on Argentine vehicle regulations:

### Sections

1. **SISTEMA ELÉCTRICO** (Electrical System)
2. **CARROCERÍA Y CHASIS** (Body and Chassis)
3. **INTERIOR** (Interior)
4. **ELEMENTOS DE SEGURIDAD** (Safety Elements)
5. **TREN RODANTE** (Running Gear)
6. **LIMPIEZA** (Cleanliness)

### Items per Section

Each section contains specific inspection items with:
- Detailed instructions
- Mandatory/optional flags
- Photo requirements
- Localized descriptions in Spanish

## API Endpoints

The module provides JSON endpoints for future native mobile app integration:

- `/api/inspection/vehicles` - Get vehicles available for inspection
- `/api/inspection/start` - Initialize new inspection
- `/api/inspection/item/update` - Update inspection item status
- `/api/inspection/photo/upload` - Handle photo uploads

## Customization

### Adding Custom Items

1. Navigate to Fleet > Inspections > Configuration > Inspection Templates
2. Select the template to modify
3. Add new sections or items as needed
4. Configure photo requirements and validation rules

### Extending Functionality

The module is designed for extensibility:

- Inherit from base models to add custom fields
- Override JavaScript components for custom UI behavior
- Add custom validation rules in Python
- Create custom report templates

## Performance Considerations

- **Image Compression**: Photos are automatically compressed to 2MB max
- **Local Caching**: Frequently used data cached for 12-24 hours
- **Lazy Loading**: Vehicle lists loaded on-demand
- **Background Sync**: Changes synchronized in background
- **Memory Management**: Old cached data automatically cleaned up

## Troubleshooting

### Common Issues

1. **Camera not working**: Check browser permissions and HTTPS requirement
2. **Photos not uploading**: Verify file size limits and network connectivity
3. **Offline sync failed**: Check for conflicting changes and retry sync
4. **Touch gestures not responsive**: Ensure proper viewport meta tag

### Browser Support

- **Recommended**: Chrome 90+, Safari 14+, Firefox 88+
- **Camera Support**: Requires modern browser with getUserMedia API
- **Touch Support**: Works on desktop but optimized for touch devices

### Performance Tips

- Clear browser cache regularly
- Use WiFi for initial data loading
- Keep photos under 2MB each
- Complete inspections promptly to avoid timeout

## Support and Maintenance

### Regular Maintenance

- Monitor storage usage and clean expired data
- Update inspection templates as regulations change
- Review user permissions and access controls
- Backup inspection data regularly

### Data Retention

- Completed inspections retained for 5 years (configurable)
- Photos stored in Odoo filestore with proper access control
- Audit trails maintained for all modifications
- Export capabilities for regulatory compliance

## License

This module is licensed under LGPL-3. See the LICENSE file for details.

## Changelog

### Version 1.0.0 (January 2025)

- Initial release
- Mobile-optimized inspection interface
- Camera integration with photo capture
- Offline capability and sync
- Spanish (Argentina) localization
- Digital signature support
- Fleet module integration
- Default inspection template for Argentine regulations