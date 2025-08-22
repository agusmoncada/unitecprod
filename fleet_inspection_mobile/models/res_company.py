# -*- coding: utf-8 -*-
from odoo import models, fields


class ResCompany(models.Model):
    _inherit = 'res.company'

    # Inspection Configuration
    inspection_require_photo_for_bad = fields.Boolean(
        string='Require Photo for Bad Items',
        default=True,
        help="Require photos when items are marked as 'Mal'"
    )
    
    inspection_allow_photo_for_regular = fields.Boolean(
        string='Allow Photo for Regular Items',
        default=True,
        help="Allow photos when items are marked as 'Regular'"
    )
    
    inspection_max_photos_per_item = fields.Integer(
        string='Max Photos per Item',
        default=3,
        help="Maximum number of photos allowed per inspection item"
    )
    
    inspection_enable_gps = fields.Boolean(
        string='Enable GPS Location',
        default=False,
        help="Capture GPS coordinates with photos"
    )
    
    inspection_require_signature = fields.Boolean(
        string='Require Digital Signature',
        default=True,
        help="Require driver signature to complete inspection"
    )
    
    inspection_auto_create_maintenance = fields.Boolean(
        string='Auto-create Maintenance Request',
        default=True,
        help='Automatically create maintenance requests for items marked as "Mal"'
    )
    
    inspection_template_id = fields.Many2one(
        'fleet.inspection.template',
        string='Default Inspection Template',
        help='Default template used for new inspections'
    )
    
    # Mobile UI Settings
    inspection_auto_advance = fields.Boolean(
        string='Auto-advance to Next Item',
        default=True,
        help="Automatically move to next item after rating current one"
    )
    
    inspection_sound_feedback = fields.Boolean(
        string='Sound Feedback',
        default=False,
        help="Play sounds when buttons are pressed"
    )
    
    inspection_high_contrast = fields.Boolean(
        string='High Contrast Mode',
        default=False,
        help="Use high contrast colors for better visibility"
    )
    
    # Retention and Compliance
    inspection_retention_days = fields.Integer(
        string='Inspection Retention (days)',
        default=1825,  # 5 years
        help="Number of days to retain completed inspections"
    )
    
    inspection_require_odometer = fields.Boolean(
        string='Require Odometer Reading',
        default=True,
        help="Require odometer reading during inspection"
    )