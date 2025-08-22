# -*- coding: utf-8 -*-
from odoo import models, fields, api


class FleetVehicleSimple(models.Model):
    """
    Simple vehicle model for inspection module
    This can work independently or extend the fleet module if available
    """
    _name = 'fleet.vehicle'
    _description = 'Vehicle for Inspection'
    _rec_name = 'display_name'
    
    name = fields.Char(string='Vehicle Name', required=True)
    license_plate = fields.Char(string='License Plate', required=True)
    vin_sn = fields.Char(string='Chassis Number')
    
    # Basic vehicle info
    model_id = fields.Many2one('fleet.vehicle.model', string='Model')
    brand_id = fields.Many2one('fleet.vehicle.model.brand', string='Brand')
    color = fields.Char(string='Color')
    seats = fields.Integer(string='Seats')
    doors = fields.Integer(string='Doors')
    
    # Status
    active = fields.Boolean(string='Active', default=True)
    state_id = fields.Many2one('fleet.vehicle.state', string='State')
    
    # Odometer
    odometer = fields.Float(string='Last Odometer', compute='_get_odometer', inverse='_set_odometer')
    odometer_unit = fields.Selection([
        ('kilometers', 'km'),
        ('miles', 'mi')
    ], string='Odometer Unit', default='kilometers')
    
    # Driver
    driver_id = fields.Many2one('res.partner', string='Driver')
    
    # Computed fields
    display_name = fields.Char(string='Display Name', compute='_compute_display_name', store=True)
    
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

    @api.depends('name', 'license_plate')
    def _compute_display_name(self):
        for vehicle in self:
            if vehicle.license_plate:
                vehicle.display_name = f"{vehicle.license_plate} ({vehicle.name})"
            else:
                vehicle.display_name = vehicle.name or 'Unnamed Vehicle'

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

    def _get_odometer(self):
        for vehicle in self:
            vehicle.odometer = 0  # Simple fallback

    def _set_odometer(self):
        # Simple fallback - in real fleet module this would create odometer log
        pass

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


class FleetVehicleModel(models.Model):
    _name = 'fleet.vehicle.model'
    _description = 'Vehicle Model'
    
    name = fields.Char(string='Model Name', required=True)
    brand_id = fields.Many2one('fleet.vehicle.model.brand', string='Brand', required=True)
    vehicle_type = fields.Selection([
        ('car', 'Car'),
        ('truck', 'Truck'),
        ('van', 'Van'),
        ('motorcycle', 'Motorcycle'),
        ('other', 'Other')
    ], string='Vehicle Type', default='car')


class FleetVehicleModelBrand(models.Model):
    _name = 'fleet.vehicle.model.brand'
    _description = 'Vehicle Brand'
    
    name = fields.Char(string='Brand Name', required=True)
    logo = fields.Binary(string='Logo')


class FleetVehicleState(models.Model):
    _name = 'fleet.vehicle.state'
    _description = 'Vehicle State'
    
    name = fields.Char(string='State Name', required=True)
    sequence = fields.Integer(string='Sequence', default=10)