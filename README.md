# RITMO v1.35

Supabase: MIGRACION-v1.35.sql aplicada el 2/10/2026. No repetir migraciones antiguas.

Menú ☰: Guía y primeros pasos, Ajustes, Administración (solo administradores), Sugerencias y errores, Actualizar datos, Cerrar sesión; Mi cuenta al pie. Ajustes: proyectos, desplazamientos, tipos de pase y tarifas. Más mantiene agenda, economía, amigos y checklist.

Mi cuenta conserva edición de nombre y contraseña, y muestra email y fecha de creación de la cuenta. Los nombres de tipos predeterminados (Concierto, Baile, Marcha, Otro) se personalizan por cuenta; también se editan y crean tipos propios.

Administración permite responder a sugerencias/errores. Respuestas persistentes, con autor y fecha, visibles en Mis mensajes y notificadas en campana/Centro del día. Entrega dentro de RITMO, sin envío de email ni notificación push externa. Guardado idempotente y solo autorizado a administradores activos; solo el remitente puede leer sus respuestas y marcarlas leídas.

Amigos: Feed, Mis amigos, Proyectos y bolos compartidos, Peticiones pendientes y Mensajes de ánimo. Inicio muestra peticiones de amistad/proyecto/bolo, coincidencias, novedades compartidas y respuestas. Centro del día se destaca en marfil dorado cuando requiere atención; los enlaces abren la gestión correspondiente.

Compartir proyecto pide seleccionar proyecto y amigos aceptados en un único formulario. La creación y las invitaciones son una transacción. El invitado debe aceptar y elegir su proyecto personal. Los programas se comparten como parte del proyecto; se elimina la casilla separada. Los espacios vacíos creados en v1.34 se conservan: se completan desde Invitar amigos.

Cualquier participante puede editar fecha, estado, ubicación y pases mediante Editar datos compartidos. Las ediciones llevan revisión para impedir sobrescribir cambios concurrentes. Las copias del proyecto reciben solo las columnas comunes; los cachés, kilómetros, gastos, cobros, domicilio y salida siguen personales. No se alteran los duplicados históricos. Se conserva el flujo de revisión de coincidencias y eliminación local de v1.34. La antigua vinculación de un bolo individual sigue siendo independiente; no se sobrescriben sus columnas controladas por el organizador desde la nueva vinculación de proyecto.

Programas y nuevas observaciones se aportan en Información del proyecto, con autor. Las notas privadas preexistentes se conservan como privadas y no se publican retroactivamente. Las observaciones compartidas se incluyen en la hoja de ruta si se selecciona ese bloque. No hay sincronización en segundo plano con la app cerrada; se actualiza al cargar y periódicamente con la app visible.

Validación: prueba SQL con tres cuentas ficticias y rollback (invitación, aceptación, edición desde otro participante, rechazo de tercero, revisión obsoleta, privacidad económica, respuesta administradora, idempotencia y lectura); pruebas JS de menús, avisos, escape de respuestas y nombres de tipos; revisión móvil de cuenta, tipos, selector de amigos y editor compartido. No se han enviado invitaciones ni respuestas a usuarios reales durante las pruebas.
