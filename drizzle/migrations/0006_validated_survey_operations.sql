CREATE OR REPLACE FUNCTION public.get_public_survey(_token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT jsonb_build_object('id',p.id,'titulo',p.titulo,'descricao',p.descricao,'tipo',p.tipo,'status',p.status,'url_hash',p.url_hash,'config_visual',p.config_visual,'created_at',p.created_at,'perguntas',coalesce((SELECT jsonb_agg(jsonb_build_object('id',q.id,'ordem',q.ordem,'titulo_pergunta',q.titulo_pergunta,'tipo_resposta',q.tipo_resposta,'obrigatorio',q.obrigatorio,'placeholder',q.placeholder,'opcoes_lista',q.opcoes_lista) ORDER BY q.ordem) FROM public.pesquisa_perguntas q WHERE q.pesquisa_id=p.id),'[]'::jsonb)) FROM public.pesquisas p WHERE p.url_hash=_token AND p.status='ativa' AND length(_token) BETWEEN 20 AND 200;
$$;
REVOKE ALL ON FUNCTION public.get_public_survey(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_survey(text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.submit_public_survey(_token text,_session_id uuid,_items jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE survey public.pesquisas; q public.pesquisa_perguntas; item jsonb; rid uuid; n integer;
BEGIN
SELECT * INTO survey FROM public.pesquisas WHERE url_hash=_token AND status='ativa' AND length(_token) BETWEEN 20 AND 200 FOR SHARE;
IF NOT FOUND THEN RAISE EXCEPTION 'Pesquisa indisponível'; END IF;
IF jsonb_typeof(_items)<>'array' OR jsonb_array_length(_items)>100 THEN RAISE EXCEPTION 'Respostas inválidas'; END IF;
IF EXISTS(SELECT 1 FROM jsonb_array_elements(_items) x GROUP BY x->>'pergunta_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Pergunta duplicada'; END IF;
FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
SELECT * INTO q FROM public.pesquisa_perguntas WHERE id=(item->>'pergunta_id')::uuid AND pesquisa_id=survey.id;
IF NOT FOUND THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
IF length(coalesce(item->>'valor_texto',''))>5000 THEN RAISE EXCEPTION 'Texto excede limite'; END IF;
IF q.tipo_resposta IN ('rating','nps_score') THEN
 n:=(item->>'valor_nota')::integer;
 IF n IS NULL OR n<(CASE WHEN q.tipo_resposta='rating' THEN 1 ELSE 0 END) OR n>(CASE WHEN q.tipo_resposta='rating' THEN 5 ELSE 10 END) THEN RAISE EXCEPTION 'Nota inválida'; END IF;
ELSIF q.tipo_resposta='selecao_lista' AND NOT (item->>'valor_texto'=ANY(q.opcoes_lista)) THEN RAISE EXCEPTION 'Opção inválida';
END IF;
END LOOP;
FOR q IN SELECT * FROM public.pesquisa_perguntas WHERE pesquisa_id=survey.id AND obrigatorio LOOP
IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(_items) x WHERE x->>'pergunta_id'=q.id::text AND (nullif(btrim(x->>'valor_texto'),'') IS NOT NULL OR x->>'valor_nota' IS NOT NULL)) THEN RAISE EXCEPTION 'Responda todas as perguntas obrigatórias'; END IF;
END LOOP;
INSERT INTO public.pesquisa_respostas(pesquisa_id,session_id,created_by) VALUES(survey.id,_session_id::text,NULL) RETURNING id INTO rid;
INSERT INTO public.pesquisa_respostas_itens(resposta_id,pergunta_id,valor_nota,valor_texto,created_by) SELECT rid,(x->>'pergunta_id')::uuid,(x->>'valor_nota')::integer,x->>'valor_texto',NULL FROM jsonb_array_elements(_items) x;
RETURN true;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Resposta já registrada nesta sessão';
END $$;
REVOKE ALL ON FUNCTION public.submit_public_survey(text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_survey(text,uuid,jsonb) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.save_survey_definition(_survey jsonb) RETURNS uuid LANGUAGE plpgsql SET search_path=public AS $$
DECLARE sid uuid; cid uuid; q jsonb; qid uuid;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
cid:=(_survey->>'empresa_id')::uuid;
sid:=coalesce(nullif(_survey->>'id','')::uuid,gen_random_uuid());
IF EXISTS(SELECT 1 FROM public.pesquisas WHERE id=sid) THEN
 IF NOT public.has_company_permission(cid,'nps_enps','update') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 UPDATE public.pesquisas SET titulo=_survey->>'titulo',descricao=_survey->>'descricao',tipo=_survey->>'tipo',status=_survey->>'status',config_visual=_survey->'config_visual',updated_at=now() WHERE id=sid;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pesquisa sem acesso'; END IF;
ELSE
 IF NOT public.has_company_permission(cid,'nps_enps','create') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 INSERT INTO public.pesquisas(id,empresa_id,titulo,descricao,tipo,status,config_visual) VALUES(sid,cid,_survey->>'titulo',_survey->>'descricao',_survey->>'tipo',_survey->>'status',_survey->'config_visual');
END IF;
IF jsonb_array_length(_survey->'perguntas')>100 THEN RAISE EXCEPTION 'Limite de perguntas'; END IF;
FOR q IN SELECT * FROM jsonb_array_elements(_survey->'perguntas') LOOP
 qid:=(q->>'id')::uuid;
 INSERT INTO public.pesquisa_perguntas(id,pesquisa_id,ordem,titulo_pergunta,tipo_resposta,obrigatorio,placeholder,opcoes_lista) VALUES(qid,sid,(q->>'ordem')::integer,q->>'titulo_pergunta',q->>'tipo_resposta',(q->>'obrigatorio')::boolean,q->>'placeholder',ARRAY(SELECT jsonb_array_elements_text(coalesce(q->'opcoes_lista','[]')))) ON CONFLICT(id) DO UPDATE SET ordem=EXCLUDED.ordem,titulo_pergunta=EXCLUDED.titulo_pergunta,tipo_resposta=EXCLUDED.tipo_resposta,obrigatorio=EXCLUDED.obrigatorio,placeholder=EXCLUDED.placeholder,opcoes_lista=EXCLUDED.opcoes_lista WHERE public.pesquisa_perguntas.pesquisa_id=sid;
END LOOP;
DELETE FROM public.pesquisa_perguntas WHERE pesquisa_id=sid AND id NOT IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(_survey->'perguntas') x);
RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.save_survey_definition(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_survey_definition(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.create_recruitment_candidate(_candidate jsonb,_vaga_id uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE cid uuid; candidate_row public.recrutamento_candidatos; application_row public.candidaturas_funil;
BEGIN
SELECT empresa_id INTO cid FROM public.vagas WHERE id=_vaga_id;
IF auth.uid() IS NULL OR cid IS NULL OR NOT public.has_company_permission(cid,'recrutamento','create') THEN RAISE EXCEPTION 'Vaga sem acesso'; END IF;
INSERT INTO public.recrutamento_candidatos(empresa_id,nome,cpf,data_nascimento,email,telefone,formacao,experiencias,ultimos_salarios,pretensao_salarial,ferramentas,curriculo_nome,curriculo_texto,curriculo_url)
VALUES(cid,_candidate->>'nome',_candidate->>'cpf',nullif(_candidate->>'data_nascimento','')::date,_candidate->>'email',_candidate->>'telefone',_candidate->>'formacao',_candidate->>'experiencias',_candidate->>'ultimos_salarios',coalesce((_candidate->>'pretensao_salarial')::numeric,0),ARRAY(SELECT jsonb_array_elements_text(coalesce(_candidate->'ferramentas','[]'))),_candidate->>'curriculo_nome',_candidate->>'curriculo_texto',_candidate->>'curriculo_url') RETURNING * INTO candidate_row;
INSERT INTO public.candidaturas_funil(vaga_id,candidato_id,historico_etapas) VALUES(_vaga_id,candidate_row.id,jsonb_build_array(jsonb_build_object('etapa','TRIAGEM','data',now(),'responsavel',auth.uid(),'observacao','Cadastro inicial'))) RETURNING * INTO application_row;
RETURN jsonb_build_object('candidato',to_jsonb(candidate_row),'candidatura',to_jsonb(application_row));
END $$;
REVOKE ALL ON FUNCTION public.create_recruitment_candidate(jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_recruitment_candidate(jsonb,uuid) TO authenticated;