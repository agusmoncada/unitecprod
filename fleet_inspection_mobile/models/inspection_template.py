# -*- coding: utf-8 -*-
from odoo import models, fields, api


class FleetInspectionTemplate(models.Model):
    _name = 'fleet.inspection.template'
    _description = 'Fleet Inspection Template'
    _order = 'sequence, name'

    name = fields.Char(string='Template Name', required=True)
    description = fields.Text(string='Description')
    active = fields.Boolean(string='Active', default=True)
    sequence = fields.Integer(string='Sequence', default=10)
    
    # Template items
    item_ids = fields.One2many('fleet.inspection.template.item', 'template_id', string='Inspection Items')
    section_ids = fields.One2many('fleet.inspection.template.section', 'template_id', string='Sections')
    
    # Statistics
    item_count = fields.Integer(string='Total Items', compute='_compute_stats')
    section_count = fields.Integer(string='Total Sections', compute='_compute_stats')
    
    @api.depends('item_ids', 'section_ids')
    def _compute_stats(self):
        for record in self:
            record.item_count = len(record.item_ids)
            record.section_count = len(record.section_ids)

    def action_duplicate_template(self):
        """Duplicate template with all items and sections"""
        self.ensure_one()
        
        new_template = self.copy({
            'name': f"{self.name} (Copy)",
            'active': False,
        })
        
        return {
            'type': 'ir.actions.act_window',
            'name': 'Template',
            'view_mode': 'form',
            'res_model': 'fleet.inspection.template',
            'res_id': new_template.id,
            'target': 'current',
        }


class FleetInspectionTemplateSection(models.Model):
    _name = 'fleet.inspection.template.section'
    _description = 'Inspection Template Section'
    _order = 'sequence, name'

    template_id = fields.Many2one('fleet.inspection.template', string='Template', required=True, ondelete='cascade')
    name = fields.Char(string='Section Name', required=True)
    description = fields.Text(string='Description')
    sequence = fields.Integer(string='Sequence', default=10)
    
    # Items in this section
    item_ids = fields.One2many('fleet.inspection.template.item', 'section_id', string='Items')
    item_count = fields.Integer(string='Item Count', compute='_compute_item_count')
    
    @api.depends('item_ids')
    def _compute_item_count(self):
        for record in self:
            record.item_count = len(record.item_ids)


class FleetInspectionTemplateItem(models.Model):
    _name = 'fleet.inspection.template.item'
    _description = 'Inspection Template Item'
    _order = 'section_sequence, sequence, name'

    template_id = fields.Many2one('fleet.inspection.template', string='Template', required=True, ondelete='cascade')
    section_id = fields.Many2one('fleet.inspection.template.section', string='Section', required=True, ondelete='cascade')
    
    name = fields.Char(string='Item Name', required=True)
    description = fields.Text(string='Description')
    sequence = fields.Integer(string='Sequence', default=10)
    section_sequence = fields.Integer(string='Section Sequence', related='section_id.sequence', store=True)
    
    # Configuration
    is_mandatory = fields.Boolean(string='Mandatory', default=True)
    photo_required_on_bad = fields.Boolean(string='Photo Required on Bad', default=True)
    photo_allowed_on_regular = fields.Boolean(string='Photo Allowed on Regular', default=True)
    
    # Instructions
    instructions = fields.Text(string='Instructions')
    tips = fields.Text(string='Tips')

    @api.model
    def create_default_items(self, template_id):
        """Create default inspection items based on PRD specifications"""
        
        sections_data = [
            {
                'name': 'SISTEMA ELÉCTRICO',
                'sequence': 10,
                'items': [
                    'Luces altas y bajas',
                    'Luces de posición y giro',
                    'Luces de freno y retroceso',
                    'Balizas Intermitentes',
                    'Alarma acústica de retroceso',
                    'Luces de tablero instrumentos',
                    'Bocina',
                ]
            },
            {
                'name': 'CARROCERÍA Y CHASIS',
                'sequence': 20,
                'items': [
                    'Chapa y pintura',
                    'Parabrisas, limpia parabrisas, cristales y espejos',
                    'Paragolpe trasero / delantero',
                    'Puertas y seguros',
                    'Freno de estacionamiento',
                ]
            },
            {
                'name': 'INTERIOR',
                'sequence': 30,
                'items': [
                    'Instrumental',
                    'Levantavidrios, cerraduras',
                    'Calefactor / Desempañador',
                    'Aire acondicionado',
                    'Apoyacabezas',
                    'Funcionamiento equipo de radio Am/Fm',
                    'Tacógrafo',
                ]
            },
            {
                'name': 'ELEMENTOS DE SEGURIDAD',
                'sequence': 40,
                'items': [
                    'Cinturones de seguridad',
                    'Matafuegos',
                    'Balizas triángulo',
                    'Barra remolque',
                    'Botiquín',
                    'Arrestallamas',
                ]
            },
            {
                'name': 'TREN RODANTE',
                'sequence': 50,
                'items': [
                    'Cubiertas, llantas y bulones',
                    'Presión de los neumáticos',
                    'Rueda/s de auxilio',
                    'Alineación y balanceo',
                    'Llave de ruedas y gato',
                ]
            },
            {
                'name': 'LIMPIEZA',
                'sequence': 60,
                'items': [
                    'Estado general de limpieza',
                ]
            },
        ]
        
        template = self.env['fleet.inspection.template'].browse(template_id)
        
        for section_data in sections_data:
            # Create section
            section = self.env['fleet.inspection.template.section'].create({
                'template_id': template_id,
                'name': section_data['name'],
                'sequence': section_data['sequence'],
            })
            
            # Create items for section
            for i, item_name in enumerate(section_data['items']):
                self.create({
                    'template_id': template_id,
                    'section_id': section.id,
                    'name': item_name,
                    'sequence': (i + 1) * 10,
                })
        
        return True