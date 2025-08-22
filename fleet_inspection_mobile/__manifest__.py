# -*- coding: utf-8 -*-
{
    'name': 'Fleet Vehicle Inspection Mobile',
    'version': '16.0.1.0.0',
    'category': 'Fleet',
    'summary': 'Mobile-optimized vehicle inspection addon for Odoo Fleet module',
    'description': """
Fleet Vehicle Inspection Mobile
===============================

A mobile-optimized Odoo addon that replaces paper-based vehicle inspection forms 
with a digital, user-friendly interface. Features:

* Mobile-first single-item-at-a-time interface
* Automatic camera integration for damage documentation
* Seamless Fleet module integration
* Offline capability with auto-sync
* Spanish (Argentina) localization
* Digital signatures
* Progress tracking and analytics
    """,
    'author': 'ItPatagon',
    'website': 'https://www.itpatagon.com',
    'depends': ['base', 'web', 'fleet'],
    'data': [
        'security/inspection_security.xml',
        'security/ir.model.access.csv',
        'data/vehicle_data.xml',
        'data/inspection_template_data.xml',
        'data/inspection_items_data.xml',
        'views/vehicle_views.xml',
        'views/inspection_views.xml',
        'views/inspection_mobile.xml',
        'views/menu.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'fleet_inspection_mobile/static/src/scss/inspection_mobile.scss',
            'fleet_inspection_mobile/static/src/js/utils/camera.js',
            'fleet_inspection_mobile/static/src/js/utils/storage.js',
            'fleet_inspection_mobile/static/src/js/inspection_model.js',
            'fleet_inspection_mobile/static/src/js/inspection_controller.js',
            'fleet_inspection_mobile/static/src/js/inspection_renderer.js',
            'fleet_inspection_mobile/static/src/js/components/photo_capture.js',
            'fleet_inspection_mobile/static/src/js/components/signature_pad.js',
            'fleet_inspection_mobile/static/src/js/inspection_view.js',
            'fleet_inspection_mobile/static/src/xml/inspection_templates.xml',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
    'post_init_hook': 'post_init_hook',
}