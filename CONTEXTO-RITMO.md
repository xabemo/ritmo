# RITMO v1.40

Publicación del 3/10/2026. No requiere migración. Avatar circular con previsualización y optimización local a WebP 512 px / calidad 78% antes de usar `ritmo-files`; barra de completitud y porcentaje en Mis bolos; aviso interno de cambios de versión por usuario en campana y Centro del día; frase musical diaria bajo el saludo de Inicio. También se corrige la persistencia del buscador de Mis bolos. Los textos de publicación se gestionan desde `RITMO_RELEASE140` en `ritmo-polish.js` y el caché de `sw.js` debe subir de versión en cada entrega. Web Push externo aún no existe.

---
# RITMO v1.39

Publicación del 3/10/2026. `MIGRACION-v1.39-hoy-tocan.sql` se aplicó en Supabase antes de publicar. Añade a «Hoy tocan» un mensaje opcional y la posibilidad de compartir ubicación completa y horarios de pases con amigos aceptados; la localidad sale de la ficha del bolo. No se comparten datos económicos ni el domicilio. La ubicación compartida abre una búsqueda en Google Maps.

Inicio destaca el Centro del día, muestra los próximos bolos sin importes y sustituye los puntos ambiguos por una barra con el porcentaje de ficha completada. La campana y el Centro del día muestran mensajes de ánimo y cambios de estado de sugerencias; la campana abre directamente «Mensajes de ánimo». Al volver a la app se actualizan los avisos y también se consultan cada 30 segundos mientras está visible.

El domicilio de desplazamientos es personal y ya no pide elegir proyecto. Tarifa por km permite guardar una tarifa de 0 con «No aplicar tarifa por km». Mi cuenta acepta una foto/avatar JPG, PNG o WebP de hasta 2 MB; se guarda en el bucket existente `ritmo-files`. El primer paso del tutorial y de la guía explica cómo instalar la PWA en la pantalla de inicio en iPhone y Android. El saludo distingue mañana, tarde y noche; el eslogan es «Voy a mi RITMO».

Las notificaciones externas del móvil aún no están implementadas. Requieren permiso del usuario, suscripción Web Push y un servicio en Supabase que las envíe aunque la app esté cerrada. Los avisos actuales son internos.

Validación: migración ejecutada en Supabase sin errores; `node --check` de los JavaScript modificados; prueba local de Inicio, centro, campana, ficha de publicación, desplazamientos, tarifa y avatar con datos ficticios. No se han enviado invitaciones ni mensajes reales en pruebas.

---
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

