# -*- coding: utf-8 -*-
from odoo import models, fields, api
import base64
import logging

_logger = logging.getLogger(__name__)


class FleetInspectionPhoto(models.Model):
    _name = 'fleet.inspection.photo'
    _description = 'Inspection Photo'
    _order = 'sequence, id'

    line_id = fields.Many2one('fleet.inspection.line', string='Inspection Item', required=True, ondelete='cascade')
    inspection_id = fields.Many2one('fleet.inspection', string='Inspection', related='line_id.inspection_id', store=True)
    
    name = fields.Char(string='Photo Name', required=True)
    description = fields.Text(string='Description')
    sequence = fields.Integer(string='Sequence', default=10)
    
    # Photo data
    image = fields.Binary(string='Photo', required=True)
    image_filename = fields.Char(string='Filename')
    image_size = fields.Integer(string='File Size (bytes)')
    
    # Metadata
    taken_at = fields.Datetime(string='Taken At', default=fields.Datetime.now)
    device_info = fields.Char(string='Device Info')
    gps_latitude = fields.Float(string='GPS Latitude', digits=(10, 7))
    gps_longitude = fields.Float(string='GPS Longitude', digits=(10, 7))
    
    # Annotations
    has_annotations = fields.Boolean(string='Has Annotations', default=False)
    annotations_data = fields.Text(string='Annotations JSON')

    @api.model
    def create(self, vals):
        """Override create to handle photo processing"""
        if 'image' in vals and vals['image']:
            vals['image_size'] = len(base64.b64decode(vals['image']))
            
        if not vals.get('name'):
            sequence = len(self.search([('line_id', '=', vals.get('line_id'))]))
            vals['name'] = f"Photo {sequence + 1}"
            
        return super().create(vals)

    def action_annotate_photo(self):
        """Open photo annotation interface"""
        self.ensure_one()
        
        return {
            'type': 'ir.actions.act_window',
            'name': 'Annotate Photo',
            'view_mode': 'form',
            'res_model': 'fleet.inspection.photo',
            'res_id': self.id,
            'view_id': self.env.ref('fleet_inspection_mobile.view_inspection_photo_annotate').id,
            'target': 'new',
        }

    def get_gps_location(self):
        """Get GPS location string"""
        if self.gps_latitude and self.gps_longitude:
            return f"{self.gps_latitude:.6f}, {self.gps_longitude:.6f}"
        return ""

    @api.model
    def upload_photo_base64(self, line_id, image_data, metadata=None):
        """Upload photo from mobile interface"""
        if not image_data:
            return {'error': 'No image data provided'}
        
        line = self.env['fleet.inspection.line'].browse(line_id)
        if not line.exists():
            return {'error': 'Inspection item not found'}
        
        try:
            # Process metadata
            vals = {
                'line_id': line_id,
                'image': image_data,
                'taken_at': fields.Datetime.now(),
            }
            
            if metadata:
                vals.update({
                    'device_info': metadata.get('device_info', ''),
                    'gps_latitude': metadata.get('latitude', 0.0),
                    'gps_longitude': metadata.get('longitude', 0.0),
                    'image_filename': metadata.get('filename', f'photo_{fields.Datetime.now().strftime("%Y%m%d_%H%M%S")}.jpg'),
                })
            
            photo = self.create(vals)
            
            return {
                'success': True,
                'photo_id': photo.id,
                'photo_name': photo.name,
            }
            
        except Exception as e:
            _logger.error(f"Error uploading photo: {str(e)}")
            return {'error': f'Upload failed: {str(e)}'}

    def delete_photo(self):
        """Delete photo with confirmation"""
        self.ensure_one()
        
        return {
            'type': 'ir.actions.act_window',
            'name': 'Confirm Delete',
            'view_mode': 'form',
            'res_model': 'fleet.inspection.photo.delete.wizard',
            'target': 'new',
            'context': {'default_photo_id': self.id}
        }