# -*- coding: utf-8 -*-
from odoo import models, fields, api


class FleetVehicle(models.Model):
    _inherit = 'fleet.vehicle'

    # Inspection fields
    inspection_ids = fields.One2many('fleet.inspection', 'vehicle_id', string='Inspections')
    inspection_count = fields.Integer(string='Inspection Count', compute='_compute_inspection_stats')
    last_inspection_id = fields.Many2one('fleet.inspection', string='Last Inspection', compute='_compute_inspection_stats')
    last_inspection_date = fields.Datetime(string='Last Inspection Date', compute='_compute_inspection_stats')
    last_inspection_status = fields.Selection(
        related='last_inspection_id.overall_status',
        string='Last Inspection Status'
    )
    
    # Inspection status summary
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
                
                # Calculate days since last inspection
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
        """Vehicle needs inspection if more than 30 days since last one"""
        for vehicle in self:
            vehicle.inspection_due = vehicle.days_since_inspection >= 30

    def action_view_inspections(self):
        """Smart button to view vehicle inspections"""
        self.ensure_one()
        
        action = self.env.ref('fleet_inspection_mobile.action_fleet_inspection').read()[0]
        action['domain'] = [('vehicle_id', '=', self.id)]
        action['context'] = {
            'default_vehicle_id': self.id,
            'search_default_vehicle_id': self.id,
        }
        
        if len(self.inspection_ids) == 1:
            action['views'] = [(False, 'form')]
            action['res_id'] = self.inspection_ids.id
        
        return action

    def action_start_inspection(self):
        """Start new inspection for this vehicle"""
        self.ensure_one()
        
        # Check if there's already a draft inspection
        draft_inspection = self.inspection_ids.filtered(lambda i: i.state == 'draft')
        if draft_inspection:
            return draft_inspection[0].action_resume_inspection()
        
        # Create new inspection
        inspection = self.env['fleet.inspection'].create_from_vehicle(self.id)
        return inspection.action_start_inspection()

    def action_quick_inspection_status(self):
        """Quick view of inspection status"""
        self.ensure_one()
        
        return {
            'type': 'ir.actions.act_window',
            'name': f'Inspection Status - {self.name}',
            'view_mode': 'form',
            'res_model': 'fleet.vehicle.inspection.status.wizard',
            'target': 'new',
            'context': {'default_vehicle_id': self.id}
        }

    @api.model
    def get_vehicles_for_inspection(self, search_term=None, limit=20):
        """Get vehicles for mobile inspection interface"""
        domain = [('active', '=', True)]
        
        if search_term:
            domain += ['|', '|', 
                      ('license_plate', 'ilike', search_term),
                      ('vin_sn', 'ilike', search_term),
                      ('model_id.name', 'ilike', search_term)]
        
        vehicles = self.search(domain, limit=limit)
        
        result = []
        for vehicle in vehicles:
            result.append({
                'id': vehicle.id,
                'name': vehicle.name,
                'license_plate': vehicle.license_plate,
                'model': vehicle.model_id.name,
                'color': vehicle.color,
                'last_inspection_date': vehicle.last_inspection_date,
                'last_inspection_status': vehicle.last_inspection_status,
                'days_since_inspection': vehicle.days_since_inspection,
                'inspection_due': vehicle.inspection_due,
                'has_draft_inspection': bool(vehicle.inspection_ids.filtered(lambda i: i.state == 'draft')),
            })
        
        return result

    @api.model
    def get_recent_inspected_vehicles(self, limit=5):
        """Get recently inspected vehicles for quick access"""
        user_inspections = self.env['fleet.inspection'].search([
            ('create_uid', '=', self.env.uid),
            ('state', '=', 'completed')
        ], order='inspection_date desc', limit=limit)
        
        vehicles_data = []
        seen_vehicles = set()
        
        for inspection in user_inspections:
            if inspection.vehicle_id.id not in seen_vehicles:
                vehicle = inspection.vehicle_id
                vehicles_data.append({
                    'id': vehicle.id,
                    'name': vehicle.name,
                    'license_plate': vehicle.license_plate,
                    'model': vehicle.model_id.name,
                    'last_inspection_date': inspection.inspection_date,
                    'last_inspection_status': inspection.overall_status,
                })
                seen_vehicles.add(vehicle.id)
        
        return vehicles_data