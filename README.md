# RITMO v1.34

Tres rayas: Proyectos, Ajustes, Guía y primeros pasos, Administración (solo admin) y Actualizar datos. Más: Mi agenda (Bolos, Calendario, Reservas, Mapa), Mi dinero (Mis cobros, Gastos, Estadísticas), Amigos, Checklist y Sugerencias. Se conserva la estética marfil/verde. Esta distribución sustituye la propuesta anterior de menús idénticos.

Las renovaciones de sesión del mismo usuario no reinician la app. Al salir se conserva sección, ficha, desplazamiento y borrador en sessionStorage (hasta 24 horas, separado por usuario). En recarga se restaura después de cargar la cuenta. Cerrar sesión elimina el estado. Los archivos seleccionados no se pueden reconstruir tras recarga; se informa de ello. Validado por pruebas de renovación y restauración; pendiente de confirmar el ciclo físico de cambio de apps en iPhone.

Nuevo guardado con RPC ritmo_create_bolo: token por formulario, bloqueo transaccional por usuario y devolución del bolo existente al repetir el token. Coincidencia en proyecto, fecha y ubicación normalizada avisa antes de crear otro; se permite una segunda actuación real mediante casilla explícita. No se eliminan duplicados históricos. Conserva los permisos de propietario. Dos pulsaciones en el mismo formulario quedan bloqueadas durante el guardado.

Reserva rápida: proyecto, fecha y ubicación opcional; no requiere geocodificar ni completar economía. Desde Reservas → Confirmar abre edición completa; solo se confirma al guardar. Las reservas del sistema individual compartido anterior las confirma su organizador.

Tutorial inicial antes de primeros pasos. Bloque individual de compartir bolo reducido a desplegable. Programa no necesario desactivado cuando hay programa propio/compartido; Sin desplazamiento desactivado cuando hay kilómetros.

Proyectos con amigos: en Proyectos → Vincular un proyecto con amigos. El creador invita a amigos aceptados, cada uno acepta vinculando un proyecto propio. Solo una vinculación activa por proyecto. Sin aceptación no se consultan ni importan datos ajenos. Se sincroniza al cargar Amigos/datos, abrir ficha o durante la consulta periódica de un minuto con la app visible. No es un proceso en segundo plano con la app cerrada.

Se importan fechas nuevas al proyecto personal con su propio caché predeterminado y km pendientes. Ante una fecha coincidente se requiere vincular, añadir por separado o excluir: nunca fusionar por suposición. Vincular conserva toda la ficha local. Los cambios del creador se ven en la información compartida; aplicar fecha/estado/ubicación a una ficha existente es explícito para no machacarla. Los horarios compartidos aparecen como alternativa si no hay pases personales. El programa compartido también puede usarse en la hoja de ruta PDF.

Solo se comparte fecha/estado/ubicación/horarios. El envío automático de programas requiere consentimiento al vincular y se puede desactivar. Las observaciones personales no se migran: hay notas compartidas separadas, firmadas por autor. Se indica creador del bolo. Borrar la ficha de un proyecto compartido solo la borra en la agenda de ese usuario y se recuerda su exclusión para no reimportarla. Desvincular conserva las fichas; las aportaciones ya publicadas permanecen en el espacio común. La vinculación por proyecto es independiente del sistema de invitación a un solo bolo de v1.33.

Supabase: MIGRACION-v1.34-guardado.sql y MIGRACION-v1.34-proyectos.sql aplicadas. No repetir. Tablas nuevas con RLS y sin acceso directo para anon/authenticated; funciones auxiliares privadas; los RPC validan usuario activo y participación. No se enviaron invitaciones, notas ni cambios a cuentas reales durante la comprobación.

Validación: pruebas SQL entre tres usuarios ficticios en transacción revertida (permisos, coincidencias, privacidad, programas, autoría, importación, borrado personal, desvinculación e idempotencia). Pruebas JS de menús, checks, ciclo de autenticación, regreso a ficha y aislamiento por cuenta. Vista móvil a 390 px: reservas, confirmación, menús y aportaciones. Conservados activos y configuración existentes. Las condiciones de servicios de rutas de v1.33 no cambian.
