# RITMO v1.32.2

Corrección v1.32.2: cada tarjeta de Próximos compromisos en Inicio abre su ficha. Se elimina la navegación del contenedor al calendario, que interfería con el clic del bolo. Caché PWA actualizada. Sin cambios de Supabase.

Publicación: https://xabemo.github.io/ritmo/

Administración: usuarios con búsqueda, alta, último inicio de sesión, última actividad, cantidades de proyectos y bolos y tutorial completado; suspensión/reactivación de acceso a RITMO conservando datos; uso agregado de 7/30 días, feedback con estados e historial.

Suspensión aplicada en la base de datos mediante comprobación adicional a las reglas de propiedad existentes, incluidos archivos de ritmo-files para peticiones autenticadas. Al abrir la app se comprueba el acceso; durante el uso se vuelve a comprobar mediante actividad. Las cuentas administradoras no se suspenden desde el panel y no pueden cambiar su propio rol. No se cambian contraseñas.

Más y el menú lateral comparten opciones, orden e iconos SVG. Guía y primeros pasos arriba de Ajustes. Sugerencias y errores accesible en ambos menús y en Ajustes; cada usuario consulta solo sus mensajes y el administrador gestiona su estado.

Actividad mínima: apertura de secciones/herramientas y tutorial finalizado, fecha y cantidad; sin importes, ubicación, textos ni datos de bolos. Métricas e historial nuevos empiezan con esta versión. Último inicio de sesión utiliza el dato previo de autenticación. Los accesos a herramientas se cuentan como aperturas, no como creación/exportación completada. Se agrupan eventos repetidos por usuario/sección durante dos minutos.

MIGRACION-v1.32-administracion.sql aplicada en Supabase. Pruebas reales de permisos, suspensión, lectura/escritura bloqueadas, reactivación y feedback en transacción descartada; revisión móvil con datos simulados. No se suspenden cuentas reales ni se envían invitaciones durante las pruebas.

Archivos nuevos: ritmo-admin.js y ritmo-admin.css en raíz, junto a index.html y sw.js actualizados. Mantener config.js, ritmo-features.js, ritmo-features.css, jspdf.umd.min.js, assets, icons y manifest.webmanifest. No hace falta ejecutar SQL ni subir archivos manualmente para este proyecto.

Corrección v1.32.1: se recupera el aspecto original del menú lateral (iconos sencillos sin recuadros, lista sobre fondo crema) y se aplica a Más. Se conserva el ajuste de icono de Ajustes y las opciones nuevas de v1.32. Las tarjetas de bolos de Inicio, Calendario, Bolos y Reservas sustituyen el punto de color del proyecto por una franja izquierda de 5 px; en reservas abarca toda la tarjeta. Las bolitas de ficha completada se conservan. Sin cambios de base de datos.

Validación: sintaxis de scripts y revisión móvil con dos proyectos y una reserva; franja por proyecto, sin marcador circular y sin duplicar el borde en tarjetas anidadas.
