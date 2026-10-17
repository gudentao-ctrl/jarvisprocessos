CREATE OR REPLACE FUNCTION public.validate_survey_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE sid uuid; q public.pesquisa_perguntas;
BEGIN
IF TG_TABLE_NAME='pesquisa_respostas' THEN
 IF NEW.session_id IS NULL OR btrim(NEW.session_id)='' THEN RAISE EXCEPTION 'Sessão obrigatória'; END IF;
ELSIF TG_TABLE_NAME='pesquisa_respostas_itens' THEN
 SELECT pesquisa_id INTO sid FROM public.pesquisa_respostas WHERE id=NEW.resposta_id;
 SELECT * INTO q FROM public.pesquisa_perguntas WHERE id=NEW.pergunta_id;
 IF sid IS NULL OR q.pesquisa_id IS DISTINCT FROM sid THEN RAISE EXCEPTION 'Pergunta e resposta devem pertencer à mesma pesquisa'; END IF;
 IF q.tipo_resposta IN ('nps_score','rating') AND (NEW.valor_nota IS NULL OR NEW.valor_nota < (CASE WHEN q.tipo_resposta='rating' THEN 1 ELSE 0 END) OR NEW.valor_nota > (CASE WHEN q.tipo_resposta='rating' THEN 5 ELSE 10 END)) THEN RAISE EXCEPTION 'Nota inválida'; END IF;
 IF q.tipo_resposta='selecao_lista' AND (NEW.valor_texto IS NULL OR NOT (NEW.valor_texto=ANY(q.opcoes_lista))) THEN RAISE EXCEPTION 'Opção inválida'; END IF;
 IF length(coalesce(NEW.valor_texto,''))>5000 THEN RAISE EXCEPTION 'Texto excede limite'; END IF;
ELSIF TG_TABLE_NAME='pesquisa_perguntas' THEN
 IF TG_OP='UPDATE' AND NEW.pesquisa_id IS DISTINCT FROM OLD.pesquisa_id THEN RAISE EXCEPTION 'A pergunta não pode mudar de pesquisa'; END IF;
 IF EXISTS(SELECT 1 FROM public.pesquisa_respostas_itens WHERE pergunta_id=OLD.id) AND EXISTS(SELECT 1 FROM public.pesquisas WHERE id=OLD.pesquisa_id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Perguntas respondidas não podem ser removidas; crie outra pesquisa'; END IF;
  IF NEW.titulo_pergunta IS DISTINCT FROM OLD.titulo_pergunta OR NEW.tipo_resposta IS DISTINCT FROM OLD.tipo_resposta OR NEW.opcoes_lista IS DISTINCT FROM OLD.opcoes_lista THEN RAISE EXCEPTION 'Perguntas respondidas não podem mudar de significado; crie outra pesquisa'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_survey_integrity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_survey_session BEFORE INSERT OR UPDATE ON public.pesquisa_respostas FOR EACH ROW EXECUTE FUNCTION public.validate_survey_integrity();
CREATE TRIGGER validate_survey_answer_relation BEFORE INSERT OR UPDATE ON public.pesquisa_respostas_itens FOR EACH ROW EXECUTE FUNCTION public.validate_survey_integrity();
CREATE TRIGGER preserve_answered_survey_questions BEFORE UPDATE OR DELETE ON public.pesquisa_perguntas FOR EACH ROW EXECUTE FUNCTION public.validate_survey_integrity();