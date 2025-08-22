from . import models

def post_init_hook(cr, registry):
    """Post-installation hook to create default inspection template"""
    from odoo import api, SUPERUSER_ID
    
    with api.Environment.manage():
        env = api.Environment(cr, SUPERUSER_ID, {})
        
        # Check if default template already has items
        template = env.ref('fleet_inspection_mobile.default_inspection_template', raise_if_not_found=False)
        
        if template and not template.item_ids:
            # Create default inspection items using the template method
            env['fleet.inspection.template.item'].create_default_items(template.id)
            
            # Set as default template for all companies
            companies = env['res.company'].search([])
            for company in companies:
                if not company.inspection_template_id:
                    company.inspection_template_id = template.id