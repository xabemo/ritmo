BEGIN;

ALTER TABLE public.ritmo_social_posts
  ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS share_location boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_passes boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ritmo_social_publish_v139(
  p_bolo uuid, p_visible boolean, p_message text DEFAULT '',
  p_share_location boolean DEFAULT false, p_share_passes boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE me uuid:=auth.uid(); place text; city text;
BEGIN
  IF me IS NULL OR NOT public.ritmo_social_active(me) THEN
    RAISE EXCEPTION 'Acceso no permitido' USING ERRCODE='42501';
  END IF;
  SELECT b.location INTO place FROM public.bolos b WHERE b.id=p_bolo AND b.user_id=me;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bolo no disponible' USING ERRCODE='42501'; END IF;
  city:=btrim(coalesce((string_to_array(place,','))[array_length(string_to_array(place,','),1)],''));
  IF coalesce(p_visible,false) AND city='' THEN
    RAISE EXCEPTION 'Añade una localidad en la ficha del bolo antes de compartirlo';
  END IF;
  IF length(trim(coalesce(p_message,'')))>280 THEN
    RAISE EXCEPTION 'El mensaje puede tener hasta 280 caracteres';
  END IF;
  INSERT INTO public.ritmo_social_posts(user_id,bolo_id,city,visible,message,share_location,share_passes)
  VALUES(me,p_bolo,coalesce(nullif(city,''),'Sin localidad'),coalesce(p_visible,false),trim(coalesce(p_message,'')),coalesce(p_share_location,false),coalesce(p_share_passes,false))
  ON CONFLICT(bolo_id) DO UPDATE SET
    city=excluded.city,visible=excluded.visible,message=excluded.message,
    share_location=excluded.share_location,share_passes=excluded.share_passes;
END $$;

CREATE OR REPLACE FUNCTION public.ritmo_social_feed_v139() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE me uuid:=auth.uid(); result jsonb;
BEGIN
  IF me IS NULL OR NOT public.ritmo_social_active(me) THEN
    RAISE EXCEPTION 'Acceso no permitido' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'feed',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',p.id,'user_id',p.user_id,'name',public.ritmo_social_name(p.user_id),
        'project',pr.name,'city',btrim(coalesce((string_to_array(src.location,','))[array_length(string_to_array(src.location,','),1)],'')),
        'date',src.event_date,'message',p.message,
        'location',CASE WHEN p.share_location THEN src.location ELSE NULL END,
        'passes',CASE WHEN p.share_passes THEN coalesce((
          SELECT jsonb_agg(jsonb_build_object('number',bp.pass_number,'start',bp.start_time,'end',bp.end_time,'type',coalesce(pt.name,bp.standard_type::text,'Pase')) ORDER BY bp.pass_number)
          FROM public.bolo_passes bp LEFT JOIN public.pass_types pt ON pt.id=bp.pass_type_id WHERE bp.bolo_id=src.id
        ),'[]'::jsonb) ELSE '[]'::jsonb END
      ) ORDER BY p.id)
      FROM public.ritmo_social_posts p
      JOIN public.bolos src ON src.id=p.bolo_id
      JOIN public.projects pr ON pr.id=src.project_id
      WHERE p.visible AND public.ritmo_are_friends(me,p.user_id)
        AND src.status::text='confirmado'
        AND src.event_date=(now() AT TIME ZONE 'Europe/Madrid')::date
    ),'[]'::jsonb),
    'posts',coalesce((
      SELECT jsonb_agg(jsonb_build_object('id',p.id,'bolo_id',p.bolo_id,
        'visible',p.visible,'message',p.message,'share_location',p.share_location,'share_passes',p.share_passes))
      FROM public.ritmo_social_posts p WHERE p.user_id=me
    ),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.ritmo_social_publish_v139(uuid,boolean,text,boolean,boolean),public.ritmo_social_feed_v139() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ritmo_social_publish_v139(uuid,boolean,text,boolean,boolean),public.ritmo_social_feed_v139() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
