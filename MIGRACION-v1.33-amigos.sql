-- RITMO 1.33. Nuevos espacios voluntarios; las tablas personales mantienen su RLS.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ritmo_social_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
 code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))
);
CREATE TABLE IF NOT EXISTS public.ritmo_friendships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), requester uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 recipient uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','accepted','declined','removed','blocked')),
 blocked_by uuid REFERENCES auth.users ON DELETE CASCADE, updated_at timestamptz NOT NULL DEFAULT now(), CHECK(requester<>recipient)
);
CREATE UNIQUE INDEX IF NOT EXISTS ritmo_friend_pair ON public.ritmo_friendships(least(requester,recipient),greatest(requester,recipient));
CREATE TABLE IF NOT EXISTS public.ritmo_shared_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 source_bolo uuid UNIQUE REFERENCES public.bolos ON DELETE SET NULL,
 title text NOT NULL, event_date date NOT NULL, state text NOT NULL DEFAULT 'active' CHECK(state IN('active','cancelled')),
 share_program boolean NOT NULL DEFAULT false, revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ritmo_shared_members (
 event_id uuid NOT NULL REFERENCES public.ritmo_shared_events ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'invited' CHECK(state IN('invited','accepted','declined','left','removed')),
 personal_bolo uuid REFERENCES public.bolos ON DELETE SET NULL,
 seen_revision integer NOT NULL DEFAULT 0, PRIMARY KEY(event_id,user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ritmo_one_shared_bolo ON public.ritmo_shared_members(personal_bolo) WHERE personal_bolo IS NOT NULL AND state='accepted';
CREATE INDEX IF NOT EXISTS ritmo_members_user ON public.ritmo_shared_members(user_id,state);
CREATE TABLE IF NOT EXISTS public.ritmo_social_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 bolo_id uuid NOT NULL UNIQUE REFERENCES public.bolos ON DELETE CASCADE,
 city text NOT NULL CHECK(length(city) BETWEEN 1 AND 120), visible boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.ritmo_cheers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 recipient uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, post_id uuid REFERENCES public.ritmo_social_posts ON DELETE SET NULL,
 message text NOT NULL CHECK(length(message) BETWEEN 1 AND 280), created_at timestamptz NOT NULL DEFAULT now(), seen boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ritmo_cheers_inbox ON public.ritmo_cheers(recipient,created_at DESC);
CREATE TABLE IF NOT EXISTS public.ritmo_shared_memories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.ritmo_shared_events ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, message text NOT NULL DEFAULT '' CHECK(length(message)<=500),
 photo_path text, hidden boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['ritmo_social_profiles','ritmo_friendships','ritmo_shared_events','ritmo_shared_members','ritmo_social_posts','ritmo_cheers','ritmo_shared_memories'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ritmo_social_active(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_user) AND NOT EXISTS(SELECT 1 FROM public.ritmo_account_access a WHERE a.user_id=p_user AND a.suspended)
$$;
CREATE OR REPLACE FUNCTION public.ritmo_social_name(p_user uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(nullif(trim(s.display_name),''),nullif(trim(p.name),''),'Compañero de RITMO') FROM public.profiles p LEFT JOIN public.user_settings s ON s.user_id=p.id WHERE p.id=p_user
$$;
CREATE OR REPLACE FUNCTION public.ritmo_are_friends(a uuid,b uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.ritmo_social_active(a) AND public.ritmo_social_active(b) AND EXISTS(SELECT 1 FROM public.ritmo_friendships f WHERE least(f.requester,f.recipient)=least(a,b) AND greatest(f.requester,f.recipient)=greatest(a,b) AND f.state='accepted')
$$;
CREATE OR REPLACE FUNCTION public.ritmo_event_member(p_event uuid,p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.ritmo_social_active(p_user) AND EXISTS(SELECT 1 FROM public.ritmo_shared_members m JOIN public.ritmo_shared_events e ON e.id=m.event_id WHERE m.event_id=p_event AND m.user_id=p_user AND m.state='accepted' AND public.ritmo_social_active(e.owner_id))
$$;
CREATE OR REPLACE FUNCTION public.ritmo_shared_payload(p_event uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',e.id,'owner_id',e.owner_id,'owner_name',public.ritmo_social_name(e.owner_id),'title',e.title,'event_date',e.event_date,'state',e.state,'revision',e.revision,'share_program',e.share_program,
 'status',coalesce(b.status::text,'cancelado'),'location',b.location,'latitude',b.latitude,'longitude',b.longitude,
 'program_url',CASE WHEN e.share_program THEN b.program_photo_url END,
 'passes',coalesce((SELECT jsonb_agg(jsonb_build_object('pass_number',p.pass_number,'start_time',p.start_time,'end_time',p.end_time,'standard_type',coalesce(t.name,p.standard_type::text,'otro')) ORDER BY p.pass_number) FROM public.bolo_passes p LEFT JOIN public.pass_types t ON t.id=p.pass_type_id WHERE p.bolo_id=e.source_bolo),'[]'::jsonb),
 'members',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',public.ritmo_social_name(m.user_id),'state',m.state,'seen',m.seen_revision>=e.revision)) FROM public.ritmo_shared_members m WHERE m.event_id=e.id AND m.state IN('invited','accepted') AND public.ritmo_social_active(m.user_id)),'[]'::jsonb))
 FROM public.ritmo_shared_events e LEFT JOIN public.bolos b ON b.id=e.source_bolo WHERE e.id=p_event
$$;

-- Al modificar la fuente solo se propagan fecha, estado y destino. Nunca importes, km, notas o domicilio.
CREATE OR REPLACE FUNCTION public.ritmo_sync_shared() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bid uuid; ev public.ritmo_shared_events%ROWTYPE; b public.bolos%ROWTYPE;
BEGIN
 IF TG_TABLE_NAME='bolo_passes' THEN bid:=CASE WHEN TG_OP='DELETE' THEN OLD.bolo_id ELSE NEW.bolo_id END;
 ELSE bid:=CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
 END IF;
 SELECT * INTO ev FROM public.ritmo_shared_events WHERE source_bolo=bid;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF TG_TABLE_NAME='bolos' THEN
  IF TG_OP='UPDATE' THEN
   IF (NEW.event_date,NEW.status,NEW.location,NEW.latitude,NEW.longitude,NEW.program_photo_url,NEW.project_id) IS NOT DISTINCT FROM (OLD.event_date,OLD.status,OLD.location,OLD.latitude,OLD.longitude,OLD.program_photo_url,OLD.project_id) THEN RETURN NULL; END IF;
  END IF;
 END IF;
 SELECT * INTO b FROM public.bolos WHERE id=bid;
 UPDATE public.ritmo_shared_events SET title=coalesce((SELECT name FROM public.projects WHERE id=b.project_id),title),event_date=coalesce(b.event_date,event_date),state=CASE WHEN b.id IS NULL OR b.status::text='cancelado' THEN 'cancelled' ELSE 'active' END,revision=revision+1,updated_at=now() WHERE id=ev.id;
 IF b.id IS NOT NULL THEN
 UPDATE public.bolos dst SET event_date=b.event_date,status=b.status,location=b.location,latitude=b.latitude,longitude=b.longitude
 FROM public.ritmo_shared_members m WHERE m.event_id=ev.id AND m.state='accepted' AND m.user_id<>ev.owner_id AND dst.id=m.personal_bolo;
 END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.ritmo_shared_bolo_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ev public.ritmo_shared_events%ROWTYPE; b public.bolos%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN
  SELECT * INTO ev FROM public.ritmo_shared_events WHERE source_bolo=OLD.id;
  IF FOUND THEN
   UPDATE public.ritmo_shared_events SET state='cancelled',revision=revision+1,updated_at=now() WHERE id=ev.id;
   UPDATE public.ritmo_shared_members SET state='left',personal_bolo=NULL WHERE event_id=ev.id AND user_id=ev.owner_id;
   UPDATE public.bolos dst SET status='cancelado' FROM public.ritmo_shared_members m WHERE m.event_id=ev.id AND m.state='accepted' AND dst.id=m.personal_bolo;
  ELSE UPDATE public.ritmo_shared_members SET state='left',personal_bolo=NULL WHERE personal_bolo=OLD.id;
  END IF;
  RETURN OLD;
 END IF;
 SELECT e.* INTO ev FROM public.ritmo_shared_members m JOIN public.ritmo_shared_events e ON e.id=m.event_id WHERE m.personal_bolo=NEW.id AND m.state='accepted' AND m.user_id<>e.owner_id;
 IF FOUND THEN
  SELECT * INTO b FROM public.bolos WHERE id=ev.source_bolo;
  IF b.id IS NOT NULL THEN NEW.event_date:=b.event_date;NEW.status:=b.status;NEW.location:=b.location;NEW.latitude:=b.latitude;NEW.longitude:=b.longitude; END IF;
  IF ev.state='cancelled' THEN NEW.status:='cancelado'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ritmo_social_bolo_guard BEFORE UPDATE OR DELETE ON public.bolos FOR EACH ROW EXECUTE FUNCTION public.ritmo_shared_bolo_guard();
CREATE TRIGGER ritmo_social_bolo_sync AFTER UPDATE ON public.bolos FOR EACH ROW EXECUTE FUNCTION public.ritmo_sync_shared();
CREATE TRIGGER ritmo_social_pass_sync AFTER INSERT OR UPDATE OR DELETE ON public.bolo_passes FOR EACH ROW EXECUTE FUNCTION public.ritmo_sync_shared();

CREATE OR REPLACE FUNCTION public.ritmo_social(p_action text,p_data jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me uuid:=auth.uid(); peer uuid; fid uuid; eid uuid; bid uuid; pid uuid; msg text; result jsonb; f public.ritmo_friendships%ROWTYPE; ev public.ritmo_shared_events%ROWTYPE; b public.bolos%ROWTYPE; m public.ritmo_shared_members%ROWTYPE;
BEGIN
 IF me IS NULL OR NOT public.ritmo_social_active(me) THEN RAISE EXCEPTION 'Acceso no permitido' USING ERRCODE='42501'; END IF;
 INSERT INTO public.ritmo_social_profiles(user_id) VALUES(me) ON CONFLICT DO NOTHING;
 -- Serializar operaciones por usuario evita duplicados y eludir límites con doble clic.
 PERFORM 1 FROM public.ritmo_social_profiles WHERE user_id=me FOR UPDATE;
 IF p_action='request' THEN
  SELECT user_id INTO peer FROM public.ritmo_social_profiles WHERE code=upper(regexp_replace(p_data->>'code','[^a-zA-Z0-9]','','g'));
  IF peer IS NULL OR peer=me OR NOT public.ritmo_social_active(peer) THEN RAISE EXCEPTION 'Código no disponible. Pide a tu amigo su código de Amigos.'; END IF;
  SELECT * INTO f FROM public.ritmo_friendships WHERE least(requester,recipient)=least(me,peer) AND greatest(requester,recipient)=greatest(me,peer) FOR UPDATE;
  IF f.state='blocked' THEN RAISE EXCEPTION 'No se puede enviar esta solicitud'; END IF;
  IF f.state IN('pending','accepted') THEN RETURN jsonb_build_object('ok',true); END IF;
  IF (SELECT count(*) FROM public.ritmo_friendships WHERE requester=me AND updated_at>now()-interval '1 day')>=20 THEN RAISE EXCEPTION 'Has alcanzado el límite diario de solicitudes'; END IF;
  IF f.id IS NULL THEN INSERT INTO public.ritmo_friendships(requester,recipient) VALUES(me,peer);
  ELSE UPDATE public.ritmo_friendships SET requester=me,recipient=peer,state='pending',blocked_by=NULL,updated_at=now() WHERE id=f.id; END IF;
 ELSIF p_action='friend' THEN
  SELECT * INTO f FROM public.ritmo_friendships WHERE id=(p_data->>'id')::uuid AND me IN(requester,recipient) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no disponible' USING ERRCODE='42501'; END IF;
  msg:=p_data->>'state';peer:=CASE WHEN f.requester=me THEN f.recipient ELSE f.requester END;
  IF msg IN('accepted','declined') AND NOT(f.state='pending' AND f.recipient=me) THEN RAISE EXCEPTION 'Solo el destinatario puede responder'; END IF;
  IF msg NOT IN('accepted','declined','removed','blocked') OR msg IS NULL THEN RAISE EXCEPTION 'Acción inválida'; END IF;
  IF f.state='blocked' AND f.blocked_by<>me THEN RAISE EXCEPTION 'Solicitud no disponible'; END IF;
  UPDATE public.ritmo_friendships SET state=msg,blocked_by=CASE WHEN msg='blocked' THEN me END,updated_at=now() WHERE id=f.id;
  IF msg='blocked' THEN
   UPDATE public.ritmo_shared_members mm SET state='removed',personal_bolo=NULL FROM public.ritmo_shared_events e WHERE e.id=mm.event_id AND ((e.owner_id=me AND mm.user_id=peer) OR(e.owner_id=peer AND mm.user_id=me));
  END IF;
 ELSIF p_action='share' THEN
  SELECT * INTO b FROM public.bolos WHERE id=(p_data->>'bolo')::uuid AND user_id=me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bolo no disponible' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.ritmo_shared_members mm JOIN public.ritmo_shared_events e ON e.id=mm.event_id WHERE mm.personal_bolo=b.id AND mm.state='accepted' AND e.owner_id<>me) THEN RAISE EXCEPTION 'Este bolo ya está vinculado a un organizador'; END IF;
  INSERT INTO public.ritmo_shared_events(owner_id,source_bolo,title,event_date,state,share_program) SELECT me,b.id,p.name,b.event_date,CASE WHEN b.status::text='cancelado' THEN 'cancelled' ELSE 'active' END,coalesce((p_data->>'program')::boolean,false) FROM public.projects p WHERE p.id=b.project_id
  ON CONFLICT(source_bolo) DO UPDATE SET share_program=excluded.share_program,revision=public.ritmo_shared_events.revision+1 RETURNING id INTO eid;
  INSERT INTO public.ritmo_shared_members(event_id,user_id,state,personal_bolo,seen_revision) SELECT eid,me,'accepted',b.id,revision FROM public.ritmo_shared_events WHERE id=eid ON CONFLICT(event_id,user_id) DO UPDATE SET state='accepted',personal_bolo=b.id;
  RETURN jsonb_build_object('id',eid);
 ELSIF p_action IN('invite','accept','decline','leave','remove','seen','memory','hide_memory') THEN
  eid:=(p_data->>'event')::uuid;
  SELECT * INTO ev FROM public.ritmo_shared_events WHERE id=eid FOR UPDATE;
  SELECT * INTO m FROM public.ritmo_shared_members WHERE event_id=eid AND user_id=me;
  IF ev.id IS NULL OR NOT public.ritmo_social_active(ev.owner_id) THEN RAISE EXCEPTION 'Bolo compartido no disponible' USING ERRCODE='42501'; END IF;
  IF p_action='invite' THEN
   peer:=(p_data->>'user')::uuid;
   IF ev.owner_id<>me OR NOT public.ritmo_are_friends(me,peer) OR ev.state<>'active' THEN RAISE EXCEPTION 'Solo puedes invitar amigos a tus bolos activos' USING ERRCODE='42501'; END IF;
   INSERT INTO public.ritmo_shared_members(event_id,user_id) VALUES(eid,peer) ON CONFLICT(event_id,user_id) DO UPDATE SET state='invited' WHERE public.ritmo_shared_members.state IN('left','removed','declined');
  ELSIF p_action='accept' THEN
   IF m.state='accepted' THEN RETURN jsonb_build_object('bolo',m.personal_bolo); END IF;
   IF m.state IS DISTINCT FROM 'invited' OR NOT public.ritmo_are_friends(me,ev.owner_id) OR ev.state<>'active' THEN RAISE EXCEPTION 'Invitación no disponible' USING ERRCODE='42501'; END IF;
   SELECT * INTO b FROM public.bolos WHERE id=ev.source_bolo;
   bid:=nullif(p_data->>'bolo','')::uuid;
   IF bid IS NOT NULL THEN
    PERFORM 1 FROM public.bolos WHERE id=bid AND user_id=me FOR UPDATE;
    IF NOT FOUND OR EXISTS(SELECT 1 FROM public.ritmo_shared_members WHERE personal_bolo=bid AND state='accepted') THEN RAISE EXCEPTION 'Selecciona un bolo propio sin vincular'; END IF;
   ELSE
    pid:=(p_data->>'project')::uuid;
    IF NOT EXISTS(SELECT 1 FROM public.projects WHERE id=pid AND user_id=me AND active) THEN RAISE EXCEPTION 'Selecciona uno de tus proyectos'; END IF;
    INSERT INTO public.bolos(user_id,project_id,event_date,status,location,latitude,longitude,bolo_price,includes_travel,kilometers,returns_home)
    SELECT me,pid,b.event_date,b.status,b.location,b.latitude,b.longitude,p.default_bolo_price,false,0,true FROM public.projects p WHERE p.id=pid RETURNING id INTO bid;
   END IF;
   UPDATE public.ritmo_shared_members SET state='accepted',personal_bolo=bid,seen_revision=ev.revision WHERE event_id=eid AND user_id=me;
   UPDATE public.bolos SET event_date=b.event_date,status=b.status,location=b.location,latitude=b.latitude,longitude=b.longitude WHERE id=bid;
   RETURN jsonb_build_object('bolo',bid);
  ELSIF p_action='decline' THEN
   UPDATE public.ritmo_shared_members SET state='declined' WHERE event_id=eid AND user_id=me AND state='invited';
  ELSIF p_action='leave' THEN
   IF ev.owner_id=me THEN RAISE EXCEPTION 'El organizador puede retirar compañeros o cancelar el bolo'; END IF;
   UPDATE public.ritmo_shared_members SET state='left',personal_bolo=NULL WHERE event_id=eid AND user_id=me;
  ELSIF p_action='remove' THEN
   peer:=(p_data->>'user')::uuid;
   IF ev.owner_id<>me OR peer=me THEN RAISE EXCEPTION 'Acceso no permitido' USING ERRCODE='42501'; END IF;
   UPDATE public.ritmo_shared_members SET state='removed',personal_bolo=NULL WHERE event_id=eid AND user_id=peer;
  ELSE
   IF NOT public.ritmo_event_member(eid,me) THEN RAISE EXCEPTION 'Solo participantes confirmados' USING ERRCODE='42501'; END IF;
   IF p_action='seen' THEN UPDATE public.ritmo_shared_members SET seen_revision=ev.revision WHERE event_id=eid AND user_id=me;
   ELSIF p_action='hide_memory' THEN UPDATE public.ritmo_shared_memories SET hidden=true WHERE id=(p_data->>'id')::uuid AND event_id=eid AND user_id=me;
   ELSE
    msg:=trim(coalesce(p_data->>'message',''));
    IF length(msg)>500 OR (msg='' AND coalesce(p_data->>'photo','')='') THEN RAISE EXCEPTION 'Añade un recuerdo de hasta 500 caracteres o una foto'; END IF;
    IF (SELECT count(*) FROM public.ritmo_shared_memories WHERE user_id=me AND created_at>now()-interval '1 day')>=20 THEN RAISE EXCEPTION 'Límite diario de recuerdos alcanzado'; END IF;
    IF coalesce(p_data->>'photo','')<>'' AND (split_part(p_data->>'photo','/',1)<>eid::text OR split_part(p_data->>'photo','/',2)<>me::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='ritmo-social' AND name=p_data->>'photo')) THEN RAISE EXCEPTION 'Foto no válida'; END IF;
    INSERT INTO public.ritmo_shared_memories(event_id,user_id,message,photo_path) VALUES(eid,me,msg,nullif(p_data->>'photo',''));
   END IF;
  END IF;
 ELSIF p_action='publish' THEN
  bid:=(p_data->>'bolo')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.bolos WHERE id=bid AND user_id=me) THEN RAISE EXCEPTION 'Bolo no disponible' USING ERRCODE='42501'; END IF;
  msg:=trim(coalesce(p_data->>'city',''));
  IF coalesce((p_data->>'visible')::boolean,false) AND length(msg) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Escribe la localidad que quieres compartir'; END IF;
  INSERT INTO public.ritmo_social_posts(user_id,bolo_id,city,visible) VALUES(me,bid,coalesce(nullif(msg,''),'Sin localidad'),coalesce((p_data->>'visible')::boolean,false)) ON CONFLICT(bolo_id) DO UPDATE SET city=excluded.city,visible=excluded.visible;
 ELSIF p_action='cheer' THEN
  SELECT p.user_id,p.id INTO peer,pid FROM public.ritmo_social_posts p JOIN public.bolos src ON src.id=p.bolo_id WHERE p.id=(p_data->>'post')::uuid AND p.visible AND src.event_date=(now() AT TIME ZONE 'Europe/Madrid')::date AND src.status::text='confirmado';
  IF peer IS NULL OR NOT public.ritmo_are_friends(me,peer) THEN RAISE EXCEPTION 'Esta publicación ya no está disponible' USING ERRCODE='42501'; END IF;
  msg:=trim(coalesce(p_data->>'message',''));
  IF length(msg) NOT BETWEEN 1 AND 280 THEN RAISE EXCEPTION 'Escribe entre 1 y 280 caracteres'; END IF;
  IF (SELECT count(*) FROM public.ritmo_cheers WHERE sender=me AND created_at>now()-interval '1 hour')>=30 THEN RAISE EXCEPTION 'Límite de mensajes por hora alcanzado'; END IF;
  INSERT INTO public.ritmo_cheers(sender,recipient,post_id,message) VALUES(me,peer,pid,msg);
 ELSIF p_action='read_cheers' THEN UPDATE public.ritmo_cheers SET seen=true WHERE recipient=me;
 ELSIF p_action<>'state' THEN RAISE EXCEPTION 'Acción desconocida';
 END IF;
 IF p_action<>'state' THEN RETURN jsonb_build_object('ok',true); END IF;
 SELECT jsonb_build_object(
 'code',(SELECT code FROM public.ritmo_social_profiles WHERE user_id=me),
 'friends',coalesce((SELECT jsonb_agg(jsonb_build_object('id',ff.id,'user_id',CASE WHEN ff.requester=me THEN ff.recipient ELSE ff.requester END,'name',public.ritmo_social_name(CASE WHEN ff.requester=me THEN ff.recipient ELSE ff.requester END),'state',ff.state,'incoming',ff.recipient=me,'blocked_by_me',ff.blocked_by=me,
 'together',(SELECT count(*) FROM public.ritmo_shared_members a JOIN public.ritmo_shared_members z ON z.event_id=a.event_id JOIN public.ritmo_shared_events e ON e.id=a.event_id WHERE a.user_id=me AND z.user_id=CASE WHEN ff.requester=me THEN ff.recipient ELSE ff.requester END AND a.state='accepted' AND z.state='accepted' AND e.event_date<(now() AT TIME ZONE 'Europe/Madrid')::date AND e.state='active')) ORDER BY ff.updated_at DESC) FROM public.ritmo_friendships ff WHERE me IN(ff.requester,ff.recipient) AND (ff.state IN('accepted','pending') OR(ff.state='blocked' AND ff.blocked_by=me)) AND public.ritmo_social_active(ff.requester) AND public.ritmo_social_active(ff.recipient)),'[]'::jsonb),
 'events',coalesce((SELECT jsonb_agg(x.data ORDER BY x.event_date DESC) FROM (SELECT e.event_date,CASE WHEN mm.state='accepted' THEN public.ritmo_shared_payload(e.id) ELSE jsonb_build_object('id',e.id,'owner_id',e.owner_id,'owner_name',public.ritmo_social_name(e.owner_id),'title',e.title,'event_date',e.event_date,'state',e.state) END ||jsonb_build_object('membership',mm.state,'personal_bolo',mm.personal_bolo,'seen_revision',mm.seen_revision) data FROM public.ritmo_shared_members mm JOIN public.ritmo_shared_events e ON e.id=mm.event_id WHERE mm.user_id=me AND mm.state IN('accepted','invited') AND public.ritmo_social_active(e.owner_id) ORDER BY e.event_date DESC LIMIT 500)x),'[]'::jsonb),
 'feed',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'user_id',p.user_id,'name',public.ritmo_social_name(p.user_id),'project',pr.name,'city',p.city,'date',src.event_date)) FROM public.ritmo_social_posts p JOIN public.bolos src ON src.id=p.bolo_id JOIN public.projects pr ON pr.id=src.project_id WHERE p.visible AND public.ritmo_are_friends(me,p.user_id) AND src.status::text='confirmado' AND src.event_date=(now() AT TIME ZONE 'Europe/Madrid')::date),'[]'::jsonb),
 'posts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'bolo_id',p.bolo_id,'visible',p.visible,'city',p.city)) FROM public.ritmo_social_posts p WHERE p.user_id=me),'[]'::jsonb),
 'cheers',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT c.id,c.message,c.created_at,c.seen,c.recipient=me AS incoming,public.ritmo_social_name(CASE WHEN c.recipient=me THEN c.sender ELSE c.recipient END) AS name FROM public.ritmo_cheers c WHERE me IN(c.sender,c.recipient) AND public.ritmo_are_friends(c.sender,c.recipient) ORDER BY c.created_at DESC LIMIT 100)x),'[]'::jsonb),
 'memories',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT r.id,r.event_id,r.user_id,public.ritmo_social_name(r.user_id) AS name,r.message,r.photo_path,r.created_at FROM public.ritmo_shared_memories r WHERE NOT r.hidden AND public.ritmo_event_member(r.event_id,me) AND public.ritmo_social_active(r.user_id) ORDER BY r.created_at DESC LIMIT 100)x),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;

-- Fotos privadas, con enlaces firmados de corta duración para participantes aceptados.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('ritmo-social','ritmo-social',false,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.ritmo_social_photo_access(p_path text,p_write boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE eid uuid; BEGIN
 IF auth.uid() IS NULL OR NOT public.ritmo_social_active(auth.uid()) THEN RETURN false; END IF;
 BEGIN eid:=split_part(p_path,'/',1)::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN false; END;
 IF NOT public.ritmo_event_member(eid,auth.uid()) THEN RETURN false; END IF;
 IF p_write THEN RETURN split_part(p_path,'/',2)=auth.uid()::text; END IF;
 RETURN EXISTS(SELECT 1 FROM public.ritmo_shared_memories WHERE photo_path=p_path AND NOT hidden AND event_id=eid);
END $$;
CREATE POLICY ritmo_social_photo_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='ritmo-social' AND public.ritmo_social_photo_access(name,false));
CREATE POLICY ritmo_social_photo_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='ritmo-social' AND public.ritmo_social_photo_access(name,true));
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('ritmo_social_active','ritmo_social_name','ritmo_are_friends','ritmo_event_member','ritmo_shared_payload','ritmo_sync_shared','ritmo_shared_bolo_guard','ritmo_social','ritmo_social_photo_access') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.ritmo_social(text,jsonb),public.ritmo_social_photo_access(text,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
