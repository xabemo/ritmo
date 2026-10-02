BEGIN;
CREATE TABLE public.ritmo_teams(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES auth.users(id),name text NOT NULL,created_at timestamptz DEFAULT now());
CREATE TABLE public.ritmo_team_members(team_id uuid REFERENCES public.ritmo_teams(id) ON DELETE CASCADE,user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,project_id uuid UNIQUE REFERENCES public.projects(id) ON DELETE SET NULL,state text NOT NULL CHECK(state IN('invited','accepted','left','declined')),share_files boolean NOT NULL DEFAULT false,PRIMARY KEY(team_id,user_id));
CREATE TABLE public.ritmo_team_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),team_id uuid NOT NULL REFERENCES public.ritmo_teams(id),created_by uuid NOT NULL REFERENCES auth.users(id),source_bolo uuid UNIQUE REFERENCES public.bolos(id) ON DELETE SET NULL,payload jsonb NOT NULL,revision int NOT NULL DEFAULT 1,updated_at timestamptz DEFAULT now());
CREATE TABLE public.ritmo_team_links(event_id uuid REFERENCES public.ritmo_team_events(id),user_id uuid REFERENCES auth.users(id),bolo_id uuid UNIQUE REFERENCES public.bolos(id) ON DELETE SET NULL,dismissed boolean NOT NULL DEFAULT false,seen_revision int DEFAULT 0,PRIMARY KEY(event_id,user_id));
CREATE TABLE public.ritmo_team_notes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL REFERENCES public.ritmo_team_events(id),user_id uuid NOT NULL REFERENCES auth.users(id),kind text NOT NULL CHECK(kind IN('note','program')),body text NOT NULL CHECK(length(body)<=2000),hidden boolean NOT NULL DEFAULT false,created_at timestamptz DEFAULT now());
CREATE UNIQUE INDEX ritmo_team_program_unique ON public.ritmo_team_notes(event_id,user_id) WHERE kind='program';
DO $$ DECLARE n text; BEGIN FOREACH n IN ARRAY ARRAY['ritmo_teams','ritmo_team_members','ritmo_team_events','ritmo_team_links','ritmo_team_notes'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n); EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',n); END LOOP; END $$;
CREATE FUNCTION public.ritmo_team_member(t uuid,u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT public.ritmo_social_active(u) AND EXISTS(SELECT 1 FROM public.ritmo_team_members m WHERE m.team_id=t AND m.user_id=u AND m.state='accepted' AND m.project_id IS NOT NULL) $$;
CREATE FUNCTION public.ritmo_team_payload(bid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT jsonb_build_object('date',b.event_date,'status',b.status,'location',b.location,'latitude',b.latitude,'longitude',b.longitude,'passes',coalesce((SELECT jsonb_agg(jsonb_build_object('pass_number',p.pass_number,'start_time',p.start_time,'end_time',p.end_time,'standard_type',p.standard_type) ORDER BY p.pass_number) FROM public.bolo_passes p WHERE p.bolo_id=b.id),'[]'::jsonb)) FROM public.bolos b WHERE b.id=bid $$;
CREATE FUNCTION public.ritmo_team_sync(t uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE src record; member record; ev record; linked record; eventid uuid; bid uuid; fresh jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(t::text,134));
 -- A local, unlinked date matching someone else's event waits for an explicit decision.
 FOR src IN SELECT b.* FROM public.bolos b JOIN public.ritmo_team_members m ON m.project_id=b.project_id AND m.user_id=b.user_id WHERE m.team_id=t AND m.state='accepted' AND public.ritmo_social_active(m.user_id) AND NOT EXISTS(SELECT 1 FROM public.ritmo_team_links l WHERE l.bolo_id=b.id) ORDER BY b.created_at,b.id LOOP
  IF NOT EXISTS(SELECT 1 FROM public.ritmo_team_events e WHERE e.team_id=t AND e.created_by<>src.user_id AND e.payload->>'date'=src.event_date::text AND NOT EXISTS(SELECT 1 FROM public.ritmo_team_links l WHERE l.event_id=e.id AND l.user_id=src.user_id)) THEN
   INSERT INTO public.ritmo_team_events(team_id,created_by,source_bolo,payload) VALUES(t,src.user_id,src.id,public.ritmo_team_payload(src.id)) RETURNING id INTO eventid;
   INSERT INTO public.ritmo_team_links(event_id,user_id,bolo_id,seen_revision) VALUES(eventid,src.user_id,src.id,1);
  END IF;
 END LOOP;
 FOR ev IN SELECT * FROM public.ritmo_team_events WHERE team_id=t ORDER BY id LOOP
  IF ev.source_bolo IS NOT NULL AND public.ritmo_team_member(t,ev.created_by) THEN
   fresh:=public.ritmo_team_payload(ev.source_bolo);
   IF fresh IS NOT NULL AND fresh IS DISTINCT FROM ev.payload THEN UPDATE public.ritmo_team_events SET payload=fresh,revision=revision+1,updated_at=now() WHERE id=ev.id; ev.payload:=fresh; END IF;
  END IF;
  FOR member IN SELECT m.*,p.default_bolo_price FROM public.ritmo_team_members m JOIN public.projects p ON p.id=m.project_id AND p.user_id=m.user_id WHERE m.team_id=t AND m.state='accepted' AND public.ritmo_social_active(m.user_id) LOOP
   IF NOT EXISTS(SELECT 1 FROM public.ritmo_team_links l WHERE l.event_id=ev.id AND l.user_id=member.user_id) AND NOT EXISTS(SELECT 1 FROM public.bolos b WHERE b.project_id=member.project_id AND b.user_id=member.user_id AND b.event_date::text=ev.payload->>'date' AND NOT EXISTS(SELECT 1 FROM public.ritmo_team_links l WHERE l.bolo_id=b.id)) THEN
    INSERT INTO public.bolos(user_id,project_id,event_date,status,location,latitude,longitude,bolo_price,includes_travel,kilometers,returns_home) VALUES(member.user_id,member.project_id,(ev.payload->>'date')::date,(ev.payload->>'status')::public.bolo_status,ev.payload->>'location',(ev.payload->>'latitude')::double precision,(ev.payload->>'longitude')::double precision,member.default_bolo_price,false,0,true) RETURNING id INTO bid;
    INSERT INTO public.ritmo_team_links(event_id,user_id,bolo_id) VALUES(ev.id,member.user_id,bid);
   END IF;
  END LOOP;
  FOR linked IN SELECT l.user_id,b.program_photo_url FROM public.ritmo_team_links l JOIN public.bolos b ON b.id=l.bolo_id JOIN public.ritmo_team_members m ON m.user_id=l.user_id AND m.team_id=t WHERE l.event_id=ev.id AND NOT l.dismissed AND m.state='accepted' AND m.share_files AND public.ritmo_social_active(m.user_id) AND b.program_photo_url IS NOT NULL LOOP
   INSERT INTO public.ritmo_team_notes(event_id,user_id,kind,body) VALUES(ev.id,linked.user_id,'program',linked.program_photo_url) ON CONFLICT(event_id,user_id) WHERE kind='program' DO UPDATE SET body=excluded.body,hidden=false WHERE public.ritmo_team_notes.hidden OR public.ritmo_team_notes.body IS DISTINCT FROM excluded.body;
  END LOOP;
 END LOOP;
END $$;
CREATE FUNCTION public.ritmo_team_deleted() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN UPDATE public.ritmo_team_links SET dismissed=true WHERE bolo_id=OLD.id; RETURN OLD; END $$;
CREATE TRIGGER ritmo_team_personal_delete BEFORE DELETE ON public.bolos FOR EACH ROW EXECUTE FUNCTION public.ritmo_team_deleted();
CREATE FUNCTION public.ritmo_projects(p_action text,p_data jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me uuid:=auth.uid(); t uuid; pid uuid; peer uuid; eid uuid; bid uuid; ev public.ritmo_team_events%ROWTYPE; m public.ritmo_team_members%ROWTYPE; r record; result jsonb; txt text;
BEGIN
 IF me IS NULL OR NOT public.ritmo_social_active(me) THEN RAISE EXCEPTION 'Inicia sesión con una cuenta activa' USING ERRCODE='42501'; END IF;
 IF p_action='create' THEN
  pid:=(p_data->>'project')::uuid; SELECT name INTO txt FROM public.projects WHERE id=pid AND user_id=me;
  IF txt IS NULL OR EXISTS(SELECT 1 FROM public.ritmo_team_members WHERE project_id=pid) THEN RAISE EXCEPTION 'Proyecto no disponible para vincular'; END IF;
  INSERT INTO public.ritmo_teams(owner_id,name) VALUES(me,txt) RETURNING id INTO t;
  INSERT INTO public.ritmo_team_members VALUES(t,me,pid,'accepted',coalesce((p_data->>'files')::boolean,false));
  PERFORM public.ritmo_team_sync(t); RETURN jsonb_build_object('id',t);
 ELSIF p_action IN('invite','accept','decline','leave','files') THEN
  t:=(p_data->>'team')::uuid; PERFORM 1 FROM public.ritmo_teams WHERE id=t FOR UPDATE;
  SELECT * INTO m FROM public.ritmo_team_members WHERE team_id=t AND user_id=me;
  IF p_action='invite' THEN
   peer:=(p_data->>'user')::uuid;
   IF NOT public.ritmo_team_member(t,me) OR NOT EXISTS(SELECT 1 FROM public.ritmo_teams WHERE id=t AND owner_id=me) OR NOT public.ritmo_are_friends(me,peer) THEN RAISE EXCEPTION 'Solo el organizador puede invitar a sus amigos' USING ERRCODE='42501'; END IF;
   INSERT INTO public.ritmo_team_members(team_id,user_id,state) VALUES(t,peer,'invited') ON CONFLICT(team_id,user_id) DO UPDATE SET state='invited' WHERE public.ritmo_team_members.state IN('declined','left');
  ELSIF p_action='accept' THEN
   IF m.state='accepted' THEN RETURN '{}'::jsonb; END IF;
   IF m.state IS DISTINCT FROM 'invited' OR NOT EXISTS(SELECT 1 FROM public.ritmo_teams WHERE id=t AND public.ritmo_are_friends(me,owner_id)) THEN RAISE EXCEPTION 'Invitación no disponible' USING ERRCODE='42501'; END IF;
   pid:=(p_data->>'project')::uuid;
   IF NOT EXISTS(SELECT 1 FROM public.projects WHERE id=pid AND user_id=me) OR EXISTS(SELECT 1 FROM public.ritmo_team_members WHERE project_id=pid AND NOT(team_id=t AND user_id=me)) THEN RAISE EXCEPTION 'Selecciona un proyecto tuyo sin vincular'; END IF;
   UPDATE public.ritmo_team_members SET state='accepted',project_id=pid,share_files=coalesce((p_data->>'files')::boolean,false) WHERE team_id=t AND user_id=me;
   PERFORM public.ritmo_team_sync(t);
  ELSIF p_action='decline' THEN UPDATE public.ritmo_team_members SET state='declined' WHERE team_id=t AND user_id=me AND state='invited';
  ELSE
   IF NOT public.ritmo_team_member(t,me) THEN RAISE EXCEPTION 'No participas en este proyecto' USING ERRCODE='42501'; END IF;
   IF p_action='leave' THEN UPDATE public.ritmo_team_members SET state='left',project_id=NULL,share_files=false WHERE team_id=t AND user_id=me;
   ELSE UPDATE public.ritmo_team_members SET share_files=coalesce((p_data->>'files')::boolean,false) WHERE team_id=t AND user_id=me; UPDATE public.ritmo_team_notes n SET hidden=true FROM public.ritmo_team_events e WHERE n.event_id=e.id AND e.team_id=t AND n.user_id=me AND n.kind='program'; END IF;
  END IF;
 ELSIF p_action IN('resolve','note','seen','apply','hide') THEN
  eid:=(p_data->>'event')::uuid; SELECT * INTO ev FROM public.ritmo_team_events WHERE id=eid; t:=ev.team_id;
  IF t IS NULL OR NOT public.ritmo_team_member(t,me) THEN RAISE EXCEPTION 'No participas en este proyecto' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(t::text,134));
  SELECT * INTO m FROM public.ritmo_team_members WHERE team_id=t AND user_id=me;
  IF p_action='resolve' THEN
   IF EXISTS(SELECT 1 FROM public.ritmo_team_links WHERE event_id=eid AND user_id=me) THEN RAISE EXCEPTION 'Esta fecha ya está resuelta'; END IF;
   bid:=nullif(p_data->>'bolo','')::uuid;
   IF coalesce((p_data->>'skip')::boolean,false) THEN INSERT INTO public.ritmo_team_links(event_id,user_id,dismissed) VALUES(eid,me,true);
   ELSE
    IF bid IS NOT NULL THEN
     IF NOT EXISTS(SELECT 1 FROM public.bolos b WHERE b.id=bid AND b.user_id=me AND b.project_id=m.project_id) OR EXISTS(SELECT 1 FROM public.ritmo_team_links WHERE bolo_id=bid) THEN RAISE EXCEPTION 'Ese bolo no se puede vincular'; END IF;
    ELSE
     INSERT INTO public.bolos(user_id,project_id,event_date,status,location,latitude,longitude,bolo_price,includes_travel,kilometers,returns_home) SELECT me,p.id,(ev.payload->>'date')::date,(ev.payload->>'status')::public.bolo_status,ev.payload->>'location',(ev.payload->>'latitude')::double precision,(ev.payload->>'longitude')::double precision,p.default_bolo_price,false,0,true FROM public.projects p WHERE p.id=m.project_id AND p.user_id=me RETURNING id INTO bid;
    END IF;
    INSERT INTO public.ritmo_team_links(event_id,user_id,bolo_id) VALUES(eid,me,bid);
   END IF;
  ELSIF p_action='note' THEN
   txt:=trim(p_data->>'text'); IF txt IS NULL OR length(txt) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Escribe una nota de hasta 2000 caracteres'; END IF;
   IF (SELECT count(*) FROM public.ritmo_team_notes WHERE user_id=me AND created_at>now()-interval '1 hour')>=30 THEN RAISE EXCEPTION 'Espera antes de añadir más notas'; END IF;
   INSERT INTO public.ritmo_team_notes(event_id,user_id,kind,body) VALUES(eid,me,'note',txt);
  ELSIF p_action='hide' THEN UPDATE public.ritmo_team_notes SET hidden=true WHERE id=(p_data->>'id')::uuid AND event_id=eid AND user_id=me;
  ELSIF p_action='seen' THEN UPDATE public.ritmo_team_links SET seen_revision=ev.revision WHERE event_id=eid AND user_id=me;
  ELSIF p_action='apply' THEN
   SELECT bolo_id INTO bid FROM public.ritmo_team_links WHERE event_id=eid AND user_id=me AND NOT dismissed;
   IF bid IS NULL THEN RAISE EXCEPTION 'Añade primero este bolo a tu agenda'; END IF;
   IF EXISTS(SELECT 1 FROM public.ritmo_shared_members WHERE personal_bolo=bid AND state='accepted') THEN RAISE EXCEPTION 'Este bolo tiene otra vinculación individual; conserva esa ficha y consulta aquí los datos del proyecto'; END IF;
   UPDATE public.bolos SET event_date=(ev.payload->>'date')::date,status=(ev.payload->>'status')::public.bolo_status,location=ev.payload->>'location',latitude=(ev.payload->>'latitude')::double precision,longitude=(ev.payload->>'longitude')::double precision WHERE id=bid AND user_id=me;
   UPDATE public.ritmo_team_links SET seen_revision=ev.revision WHERE event_id=eid AND user_id=me;
  END IF;
 ELSIF p_action<>'state' THEN RAISE EXCEPTION 'Acción desconocida'; END IF;
 FOR r IN SELECT team_id FROM public.ritmo_team_members WHERE user_id=me AND state='accepted' AND project_id IS NOT NULL ORDER BY team_id LOOP PERFORM public.ritmo_team_sync(r.team_id); END LOOP;
 SELECT jsonb_build_object('teams',coalesce((SELECT jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'owner',g.owner_id,'owner_name',public.ritmo_social_name(g.owner_id),'state',tm.state,'project_id',tm.project_id,'files',tm.share_files,'members',CASE WHEN tm.state='accepted' THEN (SELECT jsonb_agg(jsonb_build_object('id',x.user_id,'name',public.ritmo_social_name(x.user_id),'state',x.state)) FROM public.ritmo_team_members x WHERE x.team_id=g.id AND x.state IN('accepted','invited')) ELSE '[]'::jsonb END)) FROM public.ritmo_teams g JOIN public.ritmo_team_members tm ON tm.team_id=g.id WHERE tm.user_id=me AND tm.state IN('accepted','invited')),'[]'::jsonb),
 'events',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'team',e.team_id,'author',public.ritmo_social_name(e.created_by),'author_id',e.created_by,'data',e.payload,'revision',e.revision,'seen',l.seen_revision,'bolo',l.bolo_id,'dismissed',coalesce(l.dismissed,false),'pending',l.event_id IS NULL,'notes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',n.id,'author',public.ritmo_social_name(n.user_id),'author_id',n.user_id,'kind',n.kind,'body',n.body,'at',n.created_at) ORDER BY n.created_at) FROM public.ritmo_team_notes n WHERE n.event_id=e.id AND NOT n.hidden),'[]'::jsonb))) FROM public.ritmo_team_events e LEFT JOIN public.ritmo_team_links l ON l.event_id=e.id AND l.user_id=me WHERE public.ritmo_team_member(e.team_id,me)),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.ritmo_team_member(uuid,uuid),public.ritmo_team_payload(uuid),public.ritmo_team_sync(uuid),public.ritmo_team_deleted(),public.ritmo_projects(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ritmo_projects(text,jsonb) TO authenticated;
COMMIT;
