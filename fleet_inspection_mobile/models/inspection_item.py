# -*- coding: utf-8 -*-
from odoo import models, fields, api


class FleetInspectionLine(models.Model):
    _name = 'fleet.inspection.line'
    _description = 'Inspection Checklist Item'
    _order = 'sequence, id'

    inspection_id = fields.Many2one('fleet.inspection', string='Inspection', required=True, ondelete='cascade')
    template_item_id = fields.Many2one('fleet.inspection.template.item', string='Template Item', required=True, ondelete='restrict')
    
    # Item info from template
    name = fields.Char(string='Item Name', related='template_item_id.name', readonly=True)
    section = fields.Char(string='Section', related='template_item_id.section_id.name', readonly=True)
    sequence = fields.Integer(string='Sequence', related='template_item_id.sequence', readonly=True, store=True)
    section_sequence = fields.Integer(string='Section Sequence', related='template_item_id.section_id.sequence', readonly=True, store=True)
    
    # Inspection result
    status = fields.Selection([
        ('bien', 'Bien'),
        ('regular', 'Regular'),
        ('mal', 'Mal'),
        ('na', 'N/A')
    ], string='Status')
    
    observations = fields.Text(string='Observations')
    
    # Photos
    photo_ids = fields.One2many('fleet.inspection.photo', 'line_id', string='Photos')
    photo_count = fields.Integer(string='Photo Count', compute='_compute_photo_count')
    photo_required = fields.Boolean(string='Photo Required', compute='_compute_photo_required')
    
    # Timestamps
    inspected_at = fields.Datetime(string='Inspected At')
    time_spent = fields.Float(string='Time Spent (seconds)')
    
    # Mobile interface helpers
    is_completed = fields.Boolean(string='Completed', compute='_compute_is_completed')

    @api.depends('photo_ids')
    def _compute_photo_count(self):
        for record in self:
            record.photo_count = len(record.photo_ids)

    @api.depends('status')
    def _compute_photo_required(self):
        for record in self:
            company = record.inspection_id.vehicle_id.company_id or self.env.company
            record.photo_required = (
                record.status == 'mal' and company.inspection_require_photo_for_bad
            ) or (
                record.status == 'regular' and company.inspection_allow_photo_for_regular
            )

    @api.depends('status')
    def _compute_is_completed(self):
        for record in self:
            record.is_completed = bool(record.status)

    def write(self, vals):
        """Override to add timestamps"""
        if 'status' in vals and vals['status']:
            vals['inspected_at'] = fields.Datetime.now()
        
        return super().write(vals)

    def action_take_photo(self):
        """Open camera interface for taking photos"""
        self.ensure_one()
        
        return {
            'type': 'ir.actions.act_window',
            'name': 'Take Photo',
            'res_model': 'fleet.inspection.photo',
            'view_mode': 'form',
            'view_id': self.env.ref('fleet_inspection_mobile.view_inspection_photo_form').id,
            'target': 'new',
            'context': {
                'default_line_id': self.id,
                'default_name': f"{self.name} - Photo",
            }
        }

    def get_status_display(self):
        """Get localized status display"""
        status_map = {
            'bien': {'label': 'BIEN', 'class': 'btn-good', 'icon': 'fa-check-circle'},
            'regular': {'label': 'REGULAR', 'class': 'btn-regular', 'icon': 'fa-exclamation-triangle'},
            'mal': {'label': 'MAL', 'class': 'btn-bad', 'icon': 'fa-times-circle'},
            'na': {'label': 'N/A', 'class': 'btn-na', 'icon': 'fa-minus-circle'},
        }
        return status_map.get(self.status, {'label': '', 'class': '', 'icon': ''})

    @api.model
    def update_item_status(self, line_id, status, observations=None):
        """Update item status via mobile interface"""
        line = self.browse(line_id)
        if not line.exists():
            return {'error': 'Item not found'}
        
        vals = {
            'status': status,
            'observations': observations or '',
        }
        
        line.write(vals)
        
        # Return updated item data
        return {
            'success': True,
            'item': {
                'id': line.id,
                'status': status,
                'observations': observations,
                'photo_required': line.photo_required,
                'photo_count': line.photo_count,
            }
        }