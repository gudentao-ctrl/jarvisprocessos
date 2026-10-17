CREATE OR REPLACE FUNCTION public.delete_survey(_id uuid) RETURNS boolean LANGUAGE plpgsql SET search_path=public AS $$
DECLARE cid uuid;
BEGIN
SELECT empresa_id INTO cid FROM public.pesquisas WHERE id=_id FOR UPDATE;
IF auth.uid() IS NULL OR cid IS NULL OR NOT public.has_company_permission(cid,'nps_enps','delete') THEN RAISE EXCEPTION 'Pesquisa sem acesso para exclusão'; END IF;
DELETE FROM public.pesquisa_respostas_itens WHERE resposta_id IN (SELECT id FROM public.pesquisa_respostas WHERE pesquisa_id=_id);
DELETE FROM public.pesquisa_respostas WHERE pesquisa_id=_id;
DELETE FROM public.pesquisa_perguntas WHERE pesquisa_id=_id;
DELETE FROM public.pesquisas WHERE id=_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Pesquisa não excluída'; END IF;
RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.delete_survey(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_survey(uuid) TO authenticated;