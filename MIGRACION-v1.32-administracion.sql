-- RITMO 1.32: acceso reversible, actividad mínima, feedback e historial.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ritmo_account_access (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 suspended boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ritmo_activity (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 day date NOT NULL DEFAULT current_date,
 feature text NOT NULL,
 visits integer NOT NULL DEFAULT 1,
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,day,feature)
);
CREATE TABLE IF NOT EXISTS public.ritmo_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('suggestion','bug')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
 message text NOT NULL CHECK(length(message) BETWEEN 1 AND 2000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','review','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ritmo_admin_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 target_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ritmo_account_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritmo_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritmo_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritmo_admin_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ritmo_account_access,public.ritmo_activity,public.ritmo_feedback,public.ritmo_admin_log FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.ritmo_account_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid())
 AND NOT EXISTS(SELECT 1 FROM public.ritmo_account_access WHERE user_id=auth.uid() AND suspended)
$$;
CREATE OR REPLACE FUNCTION public.ritmo_record_activity(p_feature text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'Cuenta suspendida o sesión no válida' USING ERRCODE='42501'; END IF;
 IF p_feature NOT IN ('app','home','calendar','bolos','reservations','economy','expenses','map','stats','projects','checklist','settings','help','more','new_bolo','new_payment','route_pdf','economy_pdf','tour_completed') OR p_feature IS NULL THEN
   RAISE EXCEPTION 'Actividad inválida';
 END IF;
 INSERT INTO public.ritmo_activity(user_id,feature) VALUES(auth.uid(),p_feature)
 ON CONFLICT(user_id,day,feature) DO UPDATE SET visits=public.ritmo_activity.visits+1,last_seen_at=now();
END $$;
CREATE OR REPLACE FUNCTION public.ritmo_set_account_access(p_user_id uuid,p_suspended boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE previous boolean;
BEGIN
 IF NOT public.is_ritmo_admin() OR NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'No tienes permisos de administración' USING ERRCODE='42501'; END IF;
 IF p_user_id IS NULL OR p_suspended IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'Cuenta no encontrada'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(132);
 IF p_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id AND role='admin') THEN RAISE EXCEPTION 'No se puede suspender una cuenta administradora'; END IF;
 SELECT suspended INTO previous FROM public.ritmo_account_access WHERE user_id=p_user_id FOR UPDATE;
 IF COALESCE(previous,false)=p_suspended THEN RETURN; END IF;
 INSERT INTO public.ritmo_account_access(user_id,suspended) VALUES(p_user_id,p_suspended)
 ON CONFLICT(user_id) DO UPDATE SET suspended=excluded.suspended,updated_at=now();
 INSERT INTO public.ritmo_admin_log(actor_id,target_id,action) VALUES(auth.uid(),p_user_id,CASE WHEN p_suspended THEN 'suspended' ELSE 'reactivated' END);
END $$;
CREATE OR REPLACE FUNCTION public.ritmo_send_feedback(p_kind text,p_title text,p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result uuid;
BEGIN
 IF NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'Cuenta suspendida o sesión no válida' USING ERRCODE='42501'; END IF;
 IF (SELECT count(*) FROM public.ritmo_feedback WHERE user_id=auth.uid() AND created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'Ya has enviado varios mensajes. Inténtalo más tarde.'; END IF;
 INSERT INTO public.ritmo_feedback(user_id,kind,title,message) VALUES(auth.uid(),p_kind,btrim(p_title),btrim(p_message)) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.ritmo_my_feedback()
RETURNS SETOF public.ritmo_feedback LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'Cuenta suspendida o sesión no válida' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT * FROM public.ritmo_feedback WHERE user_id=auth.uid() ORDER BY created_at DESC LIMIT 50;
END $$;
CREATE OR REPLACE FUNCTION public.ritmo_feedback_status(p_id uuid,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target uuid; previous text;
BEGIN
 IF NOT public.is_ritmo_admin() OR NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'No tienes permisos de administración' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('pending','review','resolved') THEN RAISE EXCEPTION 'Estado inválido'; END IF;
 SELECT user_id,status INTO target,previous FROM public.ritmo_feedback WHERE id=p_id FOR UPDATE;
 IF target IS NULL THEN RAISE EXCEPTION 'Mensaje no encontrado'; END IF;
 IF previous=p_status THEN RETURN; END IF;
 UPDATE public.ritmo_feedback SET status=p_status,updated_at=now() WHERE id=p_id;
 INSERT INTO public.ritmo_admin_log(actor_id,target_id,action) VALUES(auth.uid(),target,'feedback_'||p_status);
END $$;

CREATE OR REPLACE FUNCTION public.ritmo_log_invitation(p_email text,p_renewed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target uuid;
BEGIN
 IF NOT public.is_ritmo_admin() OR NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'No tienes permisos de administración' USING ERRCODE='42501'; END IF;
 SELECT id INTO target FROM auth.users WHERE lower(email)=lower(btrim(p_email));
 IF target IS NULL THEN RAISE EXCEPTION 'Cuenta no encontrada'; END IF;
 INSERT INTO public.ritmo_admin_log(actor_id,target_id,action) VALUES(auth.uid(),target,CASE WHEN p_renewed THEN 'invitation_renewed' ELSE 'invitation_created' END);
END $$;

-- Comprobación adicional AND: preserva las reglas de propiedad existentes.
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT c.relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
 AND c.relname NOT IN ('ritmo_account_access','ritmo_activity','ritmo_feedback','ritmo_admin_log') LOOP
   EXECUTE format('DROP POLICY IF EXISTS "ritmo active account" ON public.%I',item.relname);
   EXECUTE format('CREATE POLICY "ritmo active account" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.ritmo_account_active())) WITH CHECK ((SELECT public.ritmo_account_active()))',item.relname);
 END LOOP;
END $$;
DROP POLICY IF EXISTS "ritmo active account files" ON storage.objects;
CREATE POLICY "ritmo active account files" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (bucket_id<>'ritmo-files' OR (SELECT public.ritmo_account_active()))
WITH CHECK (bucket_id<>'ritmo-files' OR (SELECT public.ritmo_account_active()));

CREATE OR REPLACE FUNCTION public.ritmo_profile_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   IF auth.uid() IS NOT NULL AND NEW.role='admin' AND NOT public.is_ritmo_admin() THEN RAISE EXCEPTION 'No puedes asignarte el rol administrador' USING ERRCODE='42501'; END IF;
   INSERT INTO public.ritmo_admin_log(actor_id,target_id,action) VALUES(auth.uid(),NEW.id,'account_created');
 ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
   IF auth.uid() IS NOT NULL THEN
     PERFORM pg_catalog.pg_advisory_xact_lock(132);
     IF NOT public.is_ritmo_admin() OR NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'No puedes cambiar roles' USING ERRCODE='42501'; END IF;
     IF NEW.id=auth.uid() THEN RAISE EXCEPTION 'No puedes cambiar tu propio rol'; END IF;
     IF NEW.role='admin' AND EXISTS(SELECT 1 FROM public.ritmo_account_access WHERE user_id=NEW.id AND suspended) THEN RAISE EXCEPTION 'Reactiva la cuenta antes de cambiar su rol'; END IF;
   END IF;
   INSERT INTO public.ritmo_admin_log(actor_id,target_id,action) VALUES(auth.uid(),NEW.id,CASE WHEN NEW.role='admin' THEN 'role_admin' ELSE 'role_user' END);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ritmo_profile_audit ON public.profiles;
CREATE TRIGGER ritmo_profile_audit BEFORE INSERT OR UPDATE OF role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.ritmo_profile_audit();

CREATE OR REPLACE FUNCTION public.ritmo_admin_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_ritmo_admin() OR NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'No tienes permisos de administración' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
 'users',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
   SELECT l.*,u.created_at,u.last_sign_in_at,
    COALESCE(a.suspended,false) AS suspended,
    (SELECT max(last_seen_at) FROM public.ritmo_activity WHERE user_id=u.id) AS last_active_at,
    (SELECT count(*) FROM public.projects WHERE user_id=u.id) AS projects_count,
    (SELECT count(*) FROM public.bolos WHERE user_id=u.id) AS bolos_count,
    EXISTS(SELECT 1 FROM public.ritmo_activity WHERE user_id=u.id AND feature='tour_completed') AS tour_completed
   FROM public.ritmo_admin_user_list() l JOIN auth.users u ON u.id=l.id
   LEFT JOIN public.ritmo_account_access a ON a.user_id=u.id ORDER BY u.created_at DESC
 ) x),'[]'::jsonb),
 'usage',jsonb_build_object(
   'active7',(SELECT count(DISTINCT user_id) FROM public.ritmo_activity WHERE last_seen_at>=now()-interval '7 days'),
   'active30',(SELECT count(DISTINCT user_id) FROM public.ritmo_activity WHERE last_seen_at>=now()-interval '30 days'),
   'since',(SELECT min(day) FROM public.ritmo_activity),
   'features',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT feature,sum(visits) AS visits,count(DISTINCT user_id) AS users FROM public.ritmo_activity WHERE day>=current_date-29 AND feature<>'app' GROUP BY feature ORDER BY sum(visits) DESC) x),'[]'::jsonb)),
 'feedback',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT f.*,u.email,COALESCE(s.display_name,p.name,'Sin nombre') AS name FROM public.ritmo_feedback f JOIN auth.users u ON u.id=f.user_id LEFT JOIN public.user_settings s ON s.user_id=f.user_id LEFT JOIN public.profiles p ON p.id=f.user_id ORDER BY f.created_at DESC LIMIT 100) x),'[]'::jsonb),
 'history',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT l.*,a.email AS actor_email,t.email AS target_email FROM public.ritmo_admin_log l LEFT JOIN auth.users a ON a.id=l.actor_id LEFT JOIN auth.users t ON t.id=l.target_id ORDER BY l.created_at DESC,l.id DESC LIMIT 100) x),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT p.oid::regprocedure AS signature FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('ritmo_account_active','ritmo_record_activity','ritmo_set_account_access','ritmo_send_feedback','ritmo_my_feedback','ritmo_feedback_status','ritmo_admin_dashboard','ritmo_log_invitation') LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',item.signature);
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',item.signature);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.ritmo_profile_audit() FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS ritmo_activity_last_seen_idx ON public.ritmo_activity(last_seen_at);
CREATE INDEX IF NOT EXISTS ritmo_feedback_created_idx ON public.ritmo_feedback(created_at DESC);
COMMIT;
