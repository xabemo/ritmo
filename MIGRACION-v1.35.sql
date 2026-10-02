BEGIN;
ALTER TABLE public.ritmo_feedback ADD COLUMN IF NOT EXISTS replies jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ritmo_feedback ADD COLUMN IF NOT EXISTS reply_seen_at timestamptz;
ALTER TABLE public.ritmo_team_events ADD COLUMN IF NOT EXISTS collaborative boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.ritmo_team_sync(t uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
  IF NOT ev.collaborative AND ev.source_bolo IS NOT NULL AND public.ritmo_team_member(t,ev.created_by) THEN
   fresh:=public.ritmo_team_payload(ev.source_bolo);
   IF fresh IS NOT NULL AND fresh IS DISTINCT FROM ev.payload THEN UPDATE public.ritmo_team_events SET payload=fresh,revision=revision+1,updated_at=now() WHERE id=ev.id; ev.payload:=fresh; END IF;
  END IF;
  FOR member IN SELECT m.*,p.default_bolo_price FROM public.ritmo_team_members m JOIN public.projects p ON p.id=m.project_id AND p.user_id=m.user_id WHERE m.team_id=t AND m.state='accepted' AND public.ritmo_social_active(m.user_id) LOOP
   IF NOT EXISTS(SELECT 1 FROM public.ritmo_team_links l WHERE l.event_id=ev.id AND l.user_id=member.user_id) AND NOT EXISTS(SELECT 1 FROM public.bolos b WHERE b.project_id=member.project_id AND b.user_id=member.user_id AND b.event_date::text=ev.payload->>'date' AND NOT EXISTS(SELECT 1 FROM public.ritmo_team_links l WHERE l.bolo_id=b.id)) THEN
    INSERT INTO public.bolos(user_id,project_id,event_date,status,location,latitude,longitude,bolo_price,includes_travel,kilometers,returns_home) VALUES(member.user_id,member.project_id,(ev.payload->>'date')::date,(ev.payload->>'status')::public.bolo_status,ev.payload->>'location',(ev.payload->>'latitude')::double precision,(ev.payload->>'longitude')::double precision,member.default_bolo_price,false,0,true) RETURNING id INTO bid;
    INSERT INTO public.ritmo_team_links(event_id,user_id,bolo_id) VALUES(ev.id,member.user_id,bid);
   END IF;
  END LOOP;
  FOR linked IN SELECT l.user_id,b.program_photo_url FROM public.ritmo_team_links l JOIN public.bolos b ON b.id=l.bolo_id JOIN public.ritmo_team_members m ON m.user_id=l.user_id AND m.team_id=t WHERE l.event_id=ev.id AND NOT l.dismissed AND m.state='accepted' AND public.ritmo_social_active(m.user_id) AND b.program_photo_url IS NOT NULL LOOP
   INSERT INTO public.ritmo_team_notes(event_id,user_id,kind,body) VALUES(ev.id,linked.user_id,'program',linked.program_photo_url) ON CONFLICT(event_id,user_id) WHERE kind='program' DO UPDATE SET body=excluded.body,hidden=false WHERE public.ritmo_team_notes.hidden OR public.ritmo_team_notes.body IS DISTINCT FROM excluded.body;
  END LOOP;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ritmo_projects(p_action text,p_data jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me uuid:=auth.uid(); t uuid; pid uuid; peer uuid; eid uuid; bid uuid; ev public.ritmo_team_events%ROWTYPE; m public.ritmo_team_members%ROWTYPE; r record; result jsonb; txt text;
BEGIN
 IF me IS NULL OR NOT public.ritmo_social_active(me) THEN RAISE EXCEPTION 'Inicia sesión con una cuenta activa' USING ERRCODE='42501'; END IF;
 IF p_action='create' THEN
  pid:=(p_data->>'project')::uuid; SELECT name INTO txt FROM public.projects WHERE id=pid AND user_id=me;
  IF txt IS NULL OR EXISTS(SELECT 1 FROM public.ritmo_team_members WHERE project_id=pid) THEN RAISE EXCEPTION 'Proyecto no disponible para vincular'; END IF;
  INSERT INTO public.ritmo_teams(owner_id,name) VALUES(me,txt) RETURNING id INTO t;
  INSERT INTO public.ritmo_team_members VALUES(t,me,pid,'accepted',true);
  IF jsonb_typeof(p_data->'friends') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'friends')=0 THEN RAISE EXCEPTION 'Selecciona al menos un amigo'; END IF;
  FOR peer IN SELECT value::uuid FROM jsonb_array_elements_text(p_data->'friends') LOOP
   IF NOT public.ritmo_are_friends(me,peer) THEN RAISE EXCEPTION 'Selecciona amigos aceptados' USING ERRCODE='42501'; END IF;
   INSERT INTO public.ritmo_team_members(team_id,user_id,state) VALUES(t,peer,'invited') ON CONFLICT DO NOTHING;
  END LOOP;
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
   UPDATE public.ritmo_team_members SET state='accepted',project_id=pid,share_files=true WHERE team_id=t AND user_id=me;
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
 'events',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'team',e.team_id,'author',public.ritmo_social_name(e.created_by),'author_id',e.created_by,'data',e.payload,'collaborative',e.collaborative,'revision',e.revision,'seen',l.seen_revision,'bolo',l.bolo_id,'dismissed',coalesce(l.dismissed,false),'pending',l.event_id IS NULL,'notes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',n.id,'author',public.ritmo_social_name(n.user_id),'author_id',n.user_id,'kind',n.kind,'body',n.body,'at',n.created_at) ORDER BY n.created_at) FROM public.ritmo_team_notes n WHERE n.event_id=e.id AND NOT n.hidden),'[]'::jsonb))) FROM public.ritmo_team_events e LEFT JOIN public.ritmo_team_links l ON l.event_id=e.id AND l.user_id=me WHERE public.ritmo_team_member(e.team_id,me)),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.ritmo_feedback_reply(p_id uuid,p_message text,p_key uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f public.ritmo_feedback%ROWTYPE;
BEGIN
 IF NOT public.is_ritmo_admin() OR NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'Sin permisos de administración' USING ERRCODE='42501'; END IF;
 IF p_key IS NULL OR length(trim(p_message)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Escribe una respuesta de hasta 2000 caracteres'; END IF;
 SELECT * INTO f FROM public.ritmo_feedback WHERE id=p_id FOR UPDATE;
 IF f.id IS NULL THEN RAISE EXCEPTION 'Mensaje no encontrado'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(f.replies) r WHERE r->>'id'=p_key::text) THEN RETURN; END IF;
 UPDATE public.ritmo_feedback SET replies=replies||jsonb_build_array(jsonb_build_object('id',p_key,'message',trim(p_message),'author',public.ritmo_social_name(auth.uid()),'at',now())),updated_at=now() WHERE id=p_id;
 INSERT INTO public.ritmo_admin_log(actor_id,target_id,action) VALUES(auth.uid(),f.user_id,'feedback_reply');
END $$;
CREATE OR REPLACE FUNCTION public.ritmo_feedback_read(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.ritmo_account_active() THEN RAISE EXCEPTION 'Sesión no válida' USING ERRCODE='42501'; END IF;
 UPDATE public.ritmo_feedback SET reply_seen_at=now() WHERE id=p_id AND user_id=auth.uid();
END $$;
CREATE OR REPLACE FUNCTION public.ritmo_team_edit(p_event uuid,p_revision int,p_data jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ev public.ritmo_team_events%ROWTYPE; item jsonb; clean jsonb:='[]'::jsonb; n integer; start_at time; end_at time;
BEGIN
 SELECT * INTO ev FROM public.ritmo_team_events WHERE id=p_event;
 IF ev.id IS NULL OR NOT public.ritmo_team_member(ev.team_id,auth.uid()) THEN RAISE EXCEPTION 'No participas en este proyecto' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(ev.team_id::text,134));
 SELECT * INTO ev FROM public.ritmo_team_events WHERE id=p_event FOR UPDATE;
 IF ev.revision<>p_revision THEN RAISE EXCEPTION 'Otra persona ha actualizado el bolo. Cierra y vuelve a abrir para revisar sus cambios.'; END IF;
 IF nullif(p_data->>'date','') IS NULL OR (p_data->>'status') NOT IN('confirmado','reserva','cancelado') OR length(coalesce(p_data->>'location',''))>500 THEN RAISE EXCEPTION 'Revisa fecha, estado y ubicación'; END IF;
 IF jsonb_typeof(p_data->'passes') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'passes')>30 THEN RAISE EXCEPTION 'Revisa los pases'; END IF;
 IF abs((p_data->>'latitude')::double precision)>90 OR abs((p_data->>'longitude')::double precision)>180 THEN RAISE EXCEPTION 'Coordenadas no válidas'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_data->'passes') LOOP
  n:=(item->>'pass_number')::int; start_at:=(item->>'start_time')::time; end_at:=nullif(item->>'end_time','')::time;
  IF n IS NULL OR n<1 OR start_at IS NULL OR length(coalesce(item->>'standard_type',''))>80 OR EXISTS(SELECT 1 FROM jsonb_array_elements(clean) x WHERE (x->>'pass_number')::int=n) THEN RAISE EXCEPTION 'Cada pase necesita número único, hora y tipo válido'; END IF;
  clean:=clean||jsonb_build_array(jsonb_build_object('pass_number',n,'start_time',start_at,'end_time',end_at,'standard_type',coalesce(nullif(item->>'standard_type',''),'Otro')));
 END LOOP;
 UPDATE public.ritmo_team_events SET collaborative=true,payload=jsonb_build_object('date',(p_data->>'date')::date,'status',(p_data->>'status')::public.bolo_status,'location',trim(p_data->>'location'),'latitude',(p_data->>'latitude')::double precision,'longitude',(p_data->>'longitude')::double precision,'passes',clean),revision=revision+1,updated_at=now() WHERE id=p_event;
 -- Update only common columns; economics, distance and departure settings remain untouched.
 UPDATE public.bolos b SET event_date=(p_data->>'date')::date,status=(p_data->>'status')::public.bolo_status,location=trim(p_data->>'location'),latitude=(p_data->>'latitude')::double precision,longitude=(p_data->>'longitude')::double precision
 FROM public.ritmo_team_links l WHERE l.event_id=p_event AND l.bolo_id=b.id AND NOT l.dismissed AND public.ritmo_team_member(ev.team_id,l.user_id)
 AND NOT EXISTS(SELECT 1 FROM public.ritmo_shared_members sm WHERE sm.personal_bolo=b.id AND sm.state='accepted');
 UPDATE public.ritmo_team_links SET seen_revision=ev.revision+1 WHERE event_id=p_event AND user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.ritmo_feedback_reply(uuid,text,uuid),public.ritmo_feedback_read(uuid),public.ritmo_team_edit(uuid,int,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ritmo_feedback_reply(uuid,text,uuid),public.ritmo_feedback_read(uuid),public.ritmo_team_edit(uuid,int,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.ritmo_team_note_changed135() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.ritmo_team_events SET revision=revision+1,updated_at=now() WHERE id=NEW.event_id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.ritmo_team_note_changed135() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS ritmo_team_note_changed135 ON public.ritmo_team_notes;
CREATE TRIGGER ritmo_team_note_changed135 AFTER INSERT OR UPDATE OF body,hidden ON public.ritmo_team_notes FOR EACH ROW EXECUTE FUNCTION public.ritmo_team_note_changed135();

COMMIT;

