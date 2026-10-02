BEGIN;
CREATE TABLE public.ritmo_bolo_requests(user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,request_key uuid,bolo_id uuid REFERENCES public.bolos(id) ON DELETE CASCADE,PRIMARY KEY(user_id,request_key));
ALTER TABLE public.ritmo_bolo_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ritmo_bolo_requests FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.ritmo_create_bolo(p_data jsonb,p_key uuid,p_allow_duplicate boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me uuid:=auth.uid(); p uuid:=(p_data->>'project_id')::uuid; day date:=(p_data->>'event_date')::date; saved public.bolos%ROWTYPE; bid uuid;
BEGIN
 IF me IS NULL OR NOT public.ritmo_social_active(me) THEN RAISE EXCEPTION 'Inicia sesión con una cuenta activa' USING ERRCODE='42501'; END IF;
 IF p_key IS NULL OR day IS NULL OR NOT EXISTS(SELECT 1 FROM public.projects WHERE id=p AND user_id=me) THEN RAISE EXCEPTION 'Proyecto o fecha no válidos'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(me::text,134));
 SELECT b.* INTO saved FROM public.ritmo_bolo_requests r JOIN public.bolos b ON b.id=r.bolo_id WHERE r.user_id=me AND r.request_key=p_key;
 IF saved.id IS NOT NULL THEN RETURN to_jsonb(saved); END IF;
 IF NOT p_allow_duplicate AND EXISTS(SELECT 1 FROM public.bolos b WHERE b.user_id=me AND b.project_id=p AND b.event_date=day AND b.status<>'cancelado' AND lower(trim(coalesce(b.location,'')))=lower(trim(coalesce(p_data->>'location','')))) THEN RAISE EXCEPTION 'Ya existe una actuación con ese proyecto, fecha y ubicación. Revisa tu agenda o indica que es otra actuación distinta.'; END IF;
 INSERT INTO public.bolos(user_id,project_id,event_date,status,location,latitude,longitude,bolo_price,includes_travel,kilometers,returns_home,sleep_location,travel_minutes,observations,readiness_options,program_photo_url)
 VALUES(me,p,day,(p_data->>'status')::public.bolo_status,p_data->>'location',(p_data->>'latitude')::double precision,(p_data->>'longitude')::double precision,coalesce((p_data->>'bolo_price')::numeric,0),coalesce((p_data->>'includes_travel')::boolean,false),coalesce((p_data->>'kilometers')::numeric,0),coalesce((p_data->>'returns_home')::boolean,true),p_data->>'sleep_location',(p_data->>'travel_minutes')::integer,p_data->>'observations',coalesce(p_data->'readiness_options','{}'::jsonb),p_data->>'program_photo_url') RETURNING * INTO saved;
 INSERT INTO public.ritmo_bolo_requests VALUES(me,p_key,saved.id);
 RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.ritmo_create_bolo(jsonb,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ritmo_create_bolo(jsonb,uuid,boolean) TO authenticated;
COMMIT;
