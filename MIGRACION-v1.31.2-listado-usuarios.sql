-- Listado de administración por el mismo canal que los datos de la app.
-- Mantiene los mismos destinatarios: únicamente administradores de RITMO.
BEGIN;
CREATE OR REPLACE FUNCTION public.ritmo_admin_user_list()
RETURNS TABLE (id uuid, email text, name text, role text, state text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT public.is_ritmo_admin() THEN
    RAISE EXCEPTION 'No tienes permisos de administración' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id,
         u.email::text,
         COALESCE(NULLIF(btrim(s.display_name), ''), NULLIF(u.raw_user_meta_data->>'name', ''), p.name::text, '')::text,
         COALESCE(p.role::text, 'user'),
         CASE WHEN
           u.raw_user_meta_data->>'requires_onboarding' = 'true'
           OR s.user_id IS NULL
           OR (u.invited_at IS NOT NULL
               AND COALESCE(u.raw_user_meta_data->>'requires_onboarding', '') <> 'false'
               AND COALESCE(u.raw_user_meta_data->>'onboarding_completed_at', '') = '')
         THEN CASE WHEN u.last_sign_in_at IS NULL THEN 'invited' ELSE 'pending' END
         ELSE 'active' END::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_settings s ON s.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;
REVOKE ALL ON FUNCTION public.ritmo_admin_user_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ritmo_admin_user_list() TO authenticated;
COMMIT;
