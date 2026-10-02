# RITMO v1.38

Supabase: MIGRACION-v1.35.sql aplicada el 2/10/2026. Esta versión solo cambia interfaz; no requiere ejecutar SQL. El programa del bolo es una tarjeta siempre visible (incluido un programa compartido) y el resto de apartados plegables ocupa menos altura.

Toda pantalla secundaria muestra una flecha de vuelta contextual: vuelve al apartado desde el que se abrió. Al crear un bolo la fecha comienza vacía, para que no genere un conflicto ficticio con el día actual.

Mi cuenta presenta el cierre de sesión como una acción discreta. Amigos, Administración y Feedback usan listas compactas y desplegables; Administración resume usuarios y Feedback muestra el número de mensajes pendientes y en revisión antes de abrirlos. Centro del día ordena primero las acciones pendientes, conflictos y respuestas.

El violeta acentúa solo algunas tarjetas de métricas, resumen de bolos, programa y contenido de amigos; los menús mantienen marfil y verde.

Menú ☰: Mi cuenta, Guía y primeros pasos, Ajustes, Administración (solo administradores), Sugerencias y errores y Actualizar datos. Cerrar sesión queda dentro de Mi cuenta. La X/avatar superior abre exactamente Mi cuenta. Ajustes: proyectos, desplazamientos, tipos de pase y tarifas.

Más agrupa Mi agenda (Mis bolos, Calendario, Reservas, Mapa y Checklist) y Mi dinero (Resumen económico, Gastos y Estadísticas); Amigos queda como acceso directo. Cada apartado de Amigos abre su propia pantalla, con vuelta a la portada de Amigos, para evitar acumular información en una sola vista.

La paleta conserva marfil y verde como base, dorado para avisos y violeta puntual en tarjetas informativas. La tipografía de Estadísticas guía la escala de las demás pantallas; la dashboard guía el contraste entre etiquetas, títulos y números.

Mi cuenta conserva edición de nombre y contraseña, y muestra email y fecha de creación de la cuenta. Los nombres de tipos predeterminados (Concierto, Baile, Marcha, Otro) se personalizan por cuenta; también se editan y crean tipos propios.

Administración permite responder a sugerencias/errores. Respuestas persistentes, con autor y fecha, visibles en Mis mensajes y notificadas en campana/Centro del día. Entrega dentro de RITMO, sin envío de email ni notificación push externa. Guardado idempotente y solo autorizado a administradores activos; solo el remitente puede leer sus respuestas y marcarlas leídas.

Amigos: Feed, Mis amigos, Proyectos y bolos compartidos, Peticiones pendientes y Mensajes de ánimo. Inicio muestra peticiones de amistad/proyecto/bolo, coincidencias, novedades compartidas y respuestas. Centro del día se destaca en marfil dorado cuando requiere atención; los enlaces abren la gestión correspondiente.

Compartir proyecto pide seleccionar proyecto y amigos aceptados en un único formulario. La creación y las invitaciones son una transacción. El invitado debe aceptar y elegir su proyecto personal. Los programas se comparten como parte del proyecto; se elimina la casilla separada. Los espacios vacíos creados en v1.34 se conservan: se completan desde Invitar amigos.

Cualquier participante puede editar fecha, estado, ubicación y pases mediante Editar datos compartidos. Las ediciones llevan revisión para impedir sobrescribir cambios concurrentes. Las copias del proyecto reciben solo las columnas comunes; los cachés, kilómetros, gastos, cobros, domicilio y salida siguen personales. No se alteran los duplicados históricos. Se conserva el flujo de revisión de coincidencias y eliminación local de v1.34. La antigua vinculación de un bolo individual sigue siendo independiente; no se sobrescriben sus columnas controladas por el organizador desde la nueva vinculación de proyecto.

Programas y nuevas observaciones se aportan en Información del proyecto, con autor. Las notas privadas preexistentes se conservan como privadas y no se publican retroactivamente. Las observaciones compartidas se incluyen en la hoja de ruta si se selecciona ese bloque. No hay sincronización en segundo plano con la app cerrada; se actualiza al cargar y periódicamente con la app visible.

Validación: prueba SQL con tres cuentas ficticias y rollback (invitación, aceptación, edición desde otro participante, rechazo de tercero, revisión obsoleta, privacidad económica, respuesta administradora, idempotencia y lectura); pruebas JS de menús, avisos, escape de respuestas y nombres de tipos; revisión móvil de cuenta, tipos, selector de amigos y editor compartido. No se han enviado invitaciones ni respuestas a usuarios reales durante las pruebas.
