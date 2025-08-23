# -*- coding: utf-8 -*-
from odoo import models, fields, api
from odoo.exceptions import UserError
import logging

_logger = logging.getLogger(__name__)


class FleetInspection(models.Model):
    _name = 'fleet.inspection'
    _description = 'Vehicle Inspection'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'inspection_date desc'
    _rec_name = 'name'

    name = fields.Char(string='Inspection Number', compute='_compute_name', store=True)
    vehicle_id = fields.Many2one('fleet.vehicle', string='Vehicle', required=True, ondelete='cascade')
    # Fallback vehicle name if fleet module not available
    vehicle_name = fields.Char(string='Vehicle Name')
    driver_id = fields.Many2one('res.partner', string='Driver', required=True)
    inspection_date = fields.Datetime(string='Inspection Date', default=fields.Datetime.now, required=True)
    odometer = fields.Float(string='Odometer (km)')
    
    state = fields.Selection([
        ('draft', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], string='Status', default='draft', required=True, tracking=True)
    
    # Driver information
    license_number = fields.Char(string='License Number')
    license_type = fields.Char(string='License Type')
    license_expiry = fields.Date(string='License Expiry')
    defensive_course = fields.Boolean(string='Defensive Driving Course')
    course_duration = fields.Char(string='Course Duration')
    
    # Insurance information
    insurance_policy = fields.Char(string='Insurance Policy')
    insurance_expiry = fields.Date(string='Insurance Expiry')
    
    # Inspection items
    inspection_line_ids = fields.One2many('fleet.inspection.line', 'inspection_id', string='Inspection Items')
    
    # Summary fields
    items_good = fields.Integer(string='Items - Good', compute='_compute_summary', store=True)
    items_regular = fields.Integer(string='Items - Regular', compute='_compute_summary', store=True)
    items_bad = fields.Integer(string='Items - Bad', compute='_compute_summary', store=True)
    items_na = fields.Integer(string='Items - N/A', compute='_compute_summary', store=True)
    total_items = fields.Integer(string='Total Items', compute='_compute_summary', store=True)
    completion_percentage = fields.Float(string='Completion %', compute='_compute_summary', store=True)
    
    overall_status = fields.Selection([
        ('good', 'Good - Ready to Use'),
        ('attention', 'Attention Required'),
        ('maintenance', 'Requires Maintenance')
    ], string='Overall Status', compute='_compute_overall_status', store=True)
    
    # Signatures
    driver_signature = fields.Binary(string='Driver Signature')
    supervisor_signature = fields.Binary(string='Supervisor Signature')
    
    observations = fields.Text(string='General Observations')
    
    # Metadata
    completion_time = fields.Float(string='Completion Time (minutes)', compute='_compute_completion_time', store=True)
    device_info = fields.Char(string='Device Info')
    start_time = fields.Datetime(string='Start Time')
    end_time = fields.Datetime(string='End Time')
    
    # Template reference
    template_id = fields.Many2one('fleet.inspection.template', string='Inspection Template')

    @api.depends('vehicle_id', 'inspection_date')
    def _compute_name(self):
        for record in self:
            if record.vehicle_id and record.inspection_date:
                date_str = fields.Datetime.to_string(record.inspection_date)[:10]
                record.name = f"INS/{record.vehicle_id.license_plate or record.vehicle_id.name}/{date_str}"
            else:
                record.name = "New Inspection"

    @api.depends('inspection_line_ids', 'inspection_line_ids.status')
    def _compute_summary(self):
        for record in self:
            lines = record.inspection_line_ids
            record.items_good = len(lines.filtered(lambda l: l.status == 'bien'))
            record.items_regular = len(lines.filtered(lambda l: l.status == 'regular'))
            record.items_bad = len(lines.filtered(lambda l: l.status == 'mal'))
            record.items_na = len(lines.filtered(lambda l: l.status == 'na'))
            record.total_items = len(lines)
            
            completed_items = record.items_good + record.items_regular + record.items_bad + record.items_na
            if record.total_items > 0:
                record.completion_percentage = (completed_items / record.total_items) * 100
            else:
                record.completion_percentage = 0

    @api.depends('items_bad', 'items_regular')
    def _compute_overall_status(self):
        for record in self:
            if record.items_bad > 0:
                record.overall_status = 'maintenance'
            elif record.items_regular > 0:
                record.overall_status = 'attention'
            else:
                record.overall_status = 'good'

    @api.depends('start_time', 'end_time')
    def _compute_completion_time(self):
        for record in self:
            if record.start_time and record.end_time:
                delta = record.end_time - record.start_time
                record.completion_time = delta.total_seconds() / 60.0
            else:
                record.completion_time = 0.0

    def action_start_inspection(self):
        """Initialize inspection from template"""
        self.ensure_one()
        if not self.start_time:
            self.start_time = fields.Datetime.now()
            
        if not self.template_id:
            template = self.env['fleet.inspection.template'].search([('active', '=', True)], limit=1)
            if not template:
                raise UserError("No active inspection template found. Please create one first.")
            self.template_id = template
        
        # Create inspection lines from template
        if not self.inspection_line_ids:
            self._create_inspection_lines()
        
        return {
            'type': 'ir.actions.act_window',
            'name': 'Vehicle Inspection',
            'view_mode': 'inspection_mobile',
            'res_model': 'fleet.inspection',
            'res_id': self.id,
            'target': 'current',
        }

    def initialize_mobile_inspection(self):
        """Initialize inspection from template for mobile interface"""
        self.ensure_one()
        
        if not self.start_time:
            self.start_time = fields.Datetime.now()
            
        if not self.template_id:
            template = self.env['fleet.inspection.template'].search([('active', '=', True)], limit=1)
            if not template:
                raise UserError("No active inspection template found. Please create one first.")
            self.template_id = template
        
        # Create inspection lines from template
        if not self.inspection_line_ids:
            self._create_inspection_lines()
        
        return True

    def _create_inspection_lines(self):
        """Create inspection lines from template items"""
        if not self.template_id:
            return
            
        lines_vals = []
        for item in self.template_id.item_ids:
            lines_vals.append({
                'inspection_id': self.id,
                'template_item_id': item.id,
                'status': False,  # Will be set during inspection
            })
        
        self.env['fleet.inspection.line'].create(lines_vals)

    def action_complete_inspection(self):
        """Mark inspection as completed"""
        self.ensure_one()
        
        # Validation
        incomplete_items = self.inspection_line_ids.filtered(lambda l: not l.status)
        if incomplete_items:
            raise UserError(f"Please complete all inspection items. {len(incomplete_items)} items remaining.")
        
        # Check required photos
        bad_items_without_photos = self.inspection_line_ids.filtered(
            lambda l: l.status == 'mal' and l.photo_required and not l.photo_ids
        )
        if bad_items_without_photos:
            raise UserError("Photos are required for all items marked as 'Mal'.")
        
        self.state = 'completed'
        self.end_time = fields.Datetime.now()
        
        # Auto-create maintenance requests if configured
        if self.env.company.inspection_auto_create_maintenance:
            self._create_maintenance_requests()
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Inspection Completed',
                'message': f'Inspection for {self.vehicle_id.name} has been completed successfully.',
                'type': 'success',
                'sticky': False,
            }
        }

    def _create_maintenance_requests(self):
        """Create maintenance requests for items marked as 'Mal'"""
        bad_items = self.inspection_line_ids.filtered(lambda l: l.status == 'mal')
        
        if not bad_items:
            return
        
        # Group by section for better organization
        sections = {}
        for item in bad_items:
            section = item.section or 'General'
            if section not in sections:
                sections[section] = []
            sections[section].append(item)
        
        # Create one maintenance request per section
        for section, items in sections.items():
            description = f"Issues found during inspection {self.name}:\n\n"
            for item in items:
                description += f"• {item.name}"
                if item.observations:
                    description += f": {item.observations}"
                description += "\n"
            
            self.env['fleet.vehicle.log.services'].create({
                'vehicle_id': self.vehicle_id.id,
                'description': f'Maintenance Required - {section}',
                'notes': description,
                'state': 'new',
                'service_type_id': self.env.ref('fleet.type_service_maintenance').id,
            })

    @api.model
    def create_from_vehicle(self, vehicle_id, driver_id=None):
        """Create new inspection for vehicle"""
        vehicle = self.env['fleet.vehicle'].browse(vehicle_id)
        if not vehicle.exists():
            raise UserError("Vehicle not found.")
        
        # Use current user as driver if not specified
        if not driver_id:
            driver_id = self.env.user.partner_id.id
        
        vals = {
            'vehicle_id': vehicle_id,
            'driver_id': driver_id,
            'odometer': vehicle.odometer,
        }
        
        inspection = self.create(vals)
        inspection.action_start_inspection()
        return inspection

    def action_resume_inspection(self):
        """Resume incomplete inspection"""
        self.ensure_one()
        if self.state != 'draft':
            raise UserError("Only draft inspections can be resumed.")
        
        return {
            'type': 'ir.actions.act_window',
            'name': 'Resume Inspection',
            'view_mode': 'inspection_mobile',
            'res_model': 'fleet.inspection',
            'res_id': self.id,
            'target': 'current',
        }

    def get_next_item(self, current_item_id=None):
        """Get next incomplete item for mobile interface"""
        self.ensure_one()
        
        incomplete_items = self.inspection_line_ids.filtered(lambda l: not l.status).sorted('sequence')
        if not incomplete_items:
            return False
        
        if not current_item_id:
            return incomplete_items[0]
        
        current_index = incomplete_items.ids.index(current_item_id) if current_item_id in incomplete_items.ids else -1
        if current_index >= 0 and current_index < len(incomplete_items) - 1:
            return incomplete_items[current_index + 1]
        
        return False

    def get_previous_item(self, current_item_id):
        """Get previous item for mobile interface"""
        self.ensure_one()
        
        all_items = self.inspection_line_ids.sorted('sequence')
        if not current_item_id or current_item_id not in all_items.ids:
            return False
        
        current_index = all_items.ids.index(current_item_id)
        if current_index > 0:
            return all_items[current_index - 1]
        
        return False

    def action_view_details(self):
        """Open inspection details view"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Inspection Details',
            'view_mode': 'form',
            'res_model': 'fleet.inspection',
            'res_id': self.id,
            'target': 'current',
        }