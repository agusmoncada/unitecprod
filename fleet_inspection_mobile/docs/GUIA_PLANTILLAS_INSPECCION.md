# Guía para Editar Plantillas de Inspección

## ¿Qué es una Plantilla de Inspección?

Una plantilla de inspección es un conjunto predefinido de ítems que deben ser revisados durante la inspección de un vehículo. Cada plantilla se divide en **secciones** (ej: Sistema Eléctrico, Frenos, Motor) y cada sección contiene **ítems específicos** a inspeccionar.

## Pasos para Editar una Plantilla de Inspección

### 1. Acceder al Módulo de Flota

1. Inicie sesión en Odoo
2. Vaya al menú principal
3. Haga clic en **"Flota"** (Fleet)

### 2. Navegar a las Plantillas de Inspección

1. En el menú de Flota, busque **"Inspecciones"**
2. Haga clic en **"Configuración"**
3. Seleccione **"Plantillas de Inspección"**

### 3. Seleccionar o Crear una Plantilla

#### Para editar una plantilla existente:
- Haga clic en la plantilla que desea modificar desde la lista

#### Para crear una nueva plantilla:
- Haga clic en el botón **"Nuevo"** o **"Crear"**

### 4. Editar Información Básica de la Plantilla

Complete los siguientes campos:

- **Nombre de la Plantilla**: Nombre descriptivo (ej: "Inspección Mensual Camiones")
- **Descripción**: Breve descripción del propósito de la plantilla
- **Activa**: Marque esta casilla para que la plantilla esté disponible para usar
- **Secuencia**: Número que determina el orden de aparición (plantillas con números menores aparecen primero)

### 5. Agregar o Editar Secciones

Las secciones agrupan ítems relacionados (ej: todos los ítems del sistema eléctrico).

#### Para agregar una nueva sección:

1. En la pestaña **"Secciones"**, haga clic en **"Agregar una línea"**
2. Complete:
   - **Nombre de la Sección**: ej: "Sistema Eléctrico"
   - **Secuencia**: Orden de aparición (10, 20, 30, etc.)

#### Para editar una sección existente:

1. Haga clic en la sección en la lista
2. Modifique los campos necesarios
3. Haga clic en **"Guardar"**

### 6. Agregar o Editar Ítems de Inspección

Los ítems son los elementos específicos que se inspeccionarán.

#### Para agregar un nuevo ítem:

1. En la pestaña **"Ítems"**, haga clic en **"Agregar una línea"**
2. Complete los siguientes campos:

   **Campos Básicos:**
   - **Nombre del Ítem**: Lo que se va a inspeccionar (ej: "Luces altas y bajas")
   - **Sección**: Seleccione la sección a la que pertenece
   - **Descripción**: Instrucciones detalladas para el inspector (opcional)
   - **Secuencia**: Orden dentro de la sección (10, 20, 30, etc.)

   **Configuración de Fotos:**
   - **Foto Requerida en Mal**: ✓ si se debe tomar foto obligatoria cuando el ítem está "MAL"
   - **Foto Permitida en Regular**: ✓ si se permite tomar foto cuando está "REGULAR"
   
   **Otras Opciones:**
   - **Obligatorio**: ✓ si este ítem no puede omitirse durante la inspección

#### Para editar un ítem existente:

1. Haga clic en el ítem en la lista
2. Modifique los campos necesarios
3. Haga clic en **"Guardar"**

### 7. Organizar el Orden de los Ítems

El orden de aparición durante la inspección está determinado por:

1. **Secuencia de la Sección**: Las secciones con números menores aparecen primero
2. **Secuencia del Ítem**: Dentro de cada sección, los ítems con números menores aparecen primero

**Tip:** Use incrementos de 10 (10, 20, 30...) para dejar espacio para futuros ítems intermedios.

### 8. Guardar los Cambios

1. Una vez completados todos los cambios, haga clic en **"Guardar"**
2. La plantilla estará disponible inmediatamente para nuevas inspecciones

## Ejemplo Práctico

### Crear una sección "Sistema de Frenos" con sus ítems:

1. **Agregar Sección:**
   - Nombre: "Sistema de Frenos"
   - Secuencia: 20

2. **Agregar Ítems:**
   
   **Ítem 1:**
   - Nombre: "Freno de mano"
   - Sección: "Sistema de Frenos"
   - Secuencia: 10
   - Obligatorio: ✓
   - Foto Requerida en Mal: ✓

   **Ítem 2:**
   - Nombre: "Pedal de freno"
   - Sección: "Sistema de Frenos"
   - Secuencia: 20
   - Obligatorio: ✓
   - Foto Requerida en Mal: ✓

   **Ítem 3:**
   - Nombre: "Líquido de frenos"
   - Sección: "Sistema de Frenos"
   - Secuencia: 30
   - Obligatorio: ✓
   - Foto Permitida en Regular: ✓
   - Foto Requerida en Mal: ✓

## Consejos Importantes

1. **Planificación**: Antes de crear la plantilla, haga una lista de todas las secciones e ítems necesarios

2. **Nomenclatura Clara**: Use nombres descriptivos y consistentes para facilitar el trabajo del inspector

3. **Fotos Estratégicas**: Solo requiera fotos en ítems donde la documentación visual sea realmente necesaria

4. **Prueba Piloto**: Después de crear una plantilla, realice una inspección de prueba para verificar que todo funcione correctamente

5. **Revisión Periódica**: Revise y actualice las plantillas según cambien las necesidades o regulaciones

## Solución de Problemas Comunes

### La plantilla no aparece al crear una nueva inspección
- Verifique que la plantilla esté marcada como **"Activa"**
- Asegúrese de haber guardado todos los cambios

### Los ítems aparecen en orden incorrecto
- Revise los números de secuencia de las secciones
- Revise los números de secuencia de los ítems dentro de cada sección
- Números menores aparecen primero

### No puedo eliminar una sección o ítem
- Puede estar siendo utilizado en inspecciones existentes
- Desactive el ítem en lugar de eliminarlo si ya está en uso

## Permisos Necesarios

Para editar plantillas de inspección necesita uno de estos permisos:
- **Administrador de Inspección de Flota** (Fleet Inspection Manager)
- **Administrador del Sistema**

Si no puede acceder a las plantillas, contacte a su administrador del sistema.

---

*Última actualización: Octubre 2025*