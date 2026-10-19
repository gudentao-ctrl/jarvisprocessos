CREATE TABLE public.legacy_file_company_bindings (
 bucket_id text NOT NULL,
 object_path text NOT NULL,
 company_id uuid NOT NULL,
 PRIMARY KEY (bucket_id,object_path,company_id)
);
GRANT SELECT ON public.legacy_file_company_bindings TO authenticated;
GRANT ALL ON public.legacy_file_company_bindings TO service_role;
ALTER TABLE public.legacy_file_company_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bindings_admin_read ON public.legacy_file_company_bindings FOR SELECT TO authenticated USING (private.is_superadmin());
INSERT INTO public.legacy_file_company_bindings(bucket_id,object_path,company_id)
SELECT 'interview-audio', path, company_id FROM public.interviews CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(to_jsonb(audio_parts),'[]'::jsonb)||jsonb_build_array(audio_path)) path WHERE company_id IS NOT NULL AND path IS NOT NULL AND path<>''
UNION SELECT 'pop-sources',source_path,company_id FROM public.pops WHERE company_id IS NOT NULL AND source_path IS NOT NULL AND source_path<>''
UNION SELECT 'portal-logos',public_company_logo_url,id FROM public.companies WHERE public_company_logo_url IS NOT NULL AND public_company_logo_url<>'' AND public_company_logo_url NOT LIKE 'http%'
UNION SELECT 'portal-logos',public_consultancy_logo_url,id FROM public.companies WHERE public_consultancy_logo_url IS NOT NULL AND public_consultancy_logo_url<>'' AND public_consultancy_logo_url NOT LIKE 'http%'
ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.can_access_company_file(_bucket text,_path text,_action text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE cid uuid; prefix text; tools text[]; tool text; candidate uuid;
BEGIN
IF auth.uid() IS NULL OR _bucket NOT IN ('interview-audio','portal-logos','pop-sources') OR _action NOT IN ('read','create','update','delete') THEN RETURN false; END IF;
IF private.is_superadmin() THEN RETURN true; END IF;
IF _path LIKE '/%' OR _path LIKE '%..%' OR position(chr(92) in _path)>0 THEN RETURN false; END IF;
IF _bucket='interview-audio' THEN tools:=ARRAY['entrevistas'];
ELSIF _bucket='pop-sources' THEN tools:=CASE WHEN _action='read' THEN ARRAY['pop_leitura','pop_edicao'] ELSE ARRAY['pop_edicao'] END;
ELSE tools:=CASE WHEN _action='read' THEN ARRAY['empresas','portal_empresa','portal_resultados','mapa_estrategico','relatorio_executivo','relatorio_mensal','relatorio_acompanhamento','impacto','relatorios_faturamento'] ELSE ARRAY['empresas'] END; END IF;
prefix:=split_part(_path,'/',1);
IF prefix ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
 SELECT id INTO cid FROM public.companies WHERE id=prefix::uuid;
END IF;
IF cid IS NOT NULL THEN
 FOREACH tool IN ARRAY tools LOOP
 IF public.has_company_permission(cid,tool,_action) OR (_action='create' AND public.has_company_permission(cid,tool,'update')) THEN RETURN true; END IF;
 END LOOP;
 RETURN false;
END IF;
FOR candidate IN SELECT company_id FROM public.legacy_file_company_bindings WHERE bucket_id=_bucket AND (object_path=_path OR (_bucket='interview-audio' AND split_part(object_path,'/',1)=prefix)) LOOP
 FOREACH tool IN ARRAY tools LOOP
 IF public.has_company_permission(candidate,tool,_action) OR (_action='create' AND public.has_company_permission(candidate,tool,'update')) THEN RETURN true; END IF;
 END LOOP;
END LOOP;
RETURN false;
END $fn$;
REVOKE ALL ON FUNCTION public.can_access_company_file(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_access_company_file(text,text,text) TO authenticated,service_role;
DROP POLICY IF EXISTS "team manages interview audio" ON storage.objects;
DROP POLICY IF EXISTS "team manages portal logos" ON storage.objects;
DROP POLICY IF EXISTS "team manages pop sources" ON storage.objects;
CREATE POLICY company_files_read ON storage.objects FOR SELECT TO authenticated USING (public.can_access_company_file(bucket_id,name,'read'));
CREATE POLICY company_files_create ON storage.objects FOR INSERT TO authenticated WITH CHECK (public.can_access_company_file(bucket_id,name,'create'));
CREATE POLICY company_files_update ON storage.objects FOR UPDATE TO authenticated USING (public.can_access_company_file(bucket_id,name,'update')) WITH CHECK (public.can_access_company_file(bucket_id,name,'update'));
CREATE POLICY company_files_delete ON storage.objects FOR DELETE TO authenticated USING (public.can_access_company_file(bucket_id,name,'delete'));