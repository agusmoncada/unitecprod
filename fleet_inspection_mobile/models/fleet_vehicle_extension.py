# -*- coding: utf-8 -*-
from odoo import models, fields, api


class FleetVehicleInspectionExtension(models.Model):
    _inherit = 'fleet.vehicle'
    
    # Inspection related fields
    inspection_ids = fields.One2many('fleet.inspection', 'vehicle_id', string='Inspections')
    inspection_count = fields.Integer(string='Inspection Count', compute='_compute_inspection_stats')
    last_inspection_id = fields.Many2one('fleet.inspection', string='Last Inspection', compute='_compute_inspection_stats')
    last_inspection_date = fields.Datetime(string='Last Inspection Date', compute='_compute_inspection_stats')
    last_inspection_status = fields.Selection(
        related='last_inspection_id.overall_status',
        string='Last Inspection Status'
    )
    days_since_inspection = fields.Integer(string='Days Since Last Inspection', compute='_compute_inspection_stats')
    inspection_due = fields.Boolean(string='Inspection Due', compute='_compute_inspection_due')

    @api.depends('inspection_ids', 'inspection_ids.state', 'inspection_ids.inspection_date')
    def _compute_inspection_stats(self):
        for vehicle in self:
            completed_inspections = vehicle.inspection_ids.filtered(lambda i: i.state == 'completed')
            vehicle.inspection_count = len(completed_inspections)
            
            if completed_inspections:
                latest = completed_inspections.sorted('inspection_date', reverse=True)[0]
                vehicle.last_inspection_id = latest
                vehicle.last_inspection_date = latest.inspection_date
                
                if latest.inspection_date:
                    delta = fields.Datetime.now() - latest.inspection_date
                    vehicle.days_since_inspection = delta.days
                else:
                    vehicle.days_since_inspection = 999
            else:
                vehicle.last_inspection_id = False
                vehicle.last_inspection_date = False
                vehicle.days_since_inspection = 999

    @api.depends('days_since_inspection')
    def _compute_inspection_due(self):
        for vehicle in self:
            vehicle.inspection_due = vehicle.days_since_inspection >= 30

    def action_start_inspection(self):
        """Start new inspection for this vehicle"""
        self.ensure_one()
        
        # Check if there's already a draft inspection
        draft_inspection = self.inspection_ids.filtered(lambda i: i.state == 'draft')
        if draft_inspection:
            return draft_inspection[0].action_resume_inspection()
        
        # Create new inspection
        inspection = self.env['fleet.inspection'].create({
            'vehicle_id': self.id,
            'driver_id': self.driver_id.id or self.env.user.partner_id.id,
            'vehicle_name': self.display_name,
            'odometer': self.odometer,
        })
        
        return inspection.action_start_inspection()