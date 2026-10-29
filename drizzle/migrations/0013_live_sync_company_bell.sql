-- Data-free "doorbell" broadcasts so open screens on other devices refresh instantly.
CREATE OR REPLACE FUNCTION public.ring_company_bell()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row jsonb;
  _mode text := coalesce(TG_ARGV[0], 'company_id');
  _company text;
  _topic text;
  _guc text;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN _row := to_jsonb(OLD); ELSE _row := to_jsonb(NEW); END IF;
    IF _mode = 'app' THEN
      _topic := 'app-bell';
    ELSE
      IF _mode = 'parent' THEN
        IF _row->>TG_ARGV[2] IS NULL THEN RETURN NULL; END IF;
        EXECUTE format('SELECT (%I)::text FROM public.%I WHERE id = $1::uuid', TG_ARGV[3], TG_ARGV[1])
          INTO _company USING _row->>TG_ARGV[2];
      ELSE
        _company := _row->>_mode;
      END IF;
      IF _company IS NULL THEN RETURN NULL; END IF;
      _topic := 'company-bell:' || _company;
    END IF;
    -- One broadcast per topic per transaction keeps bulk saves cheap.
    _guc := 'jarvis.bell_' || md5(_topic);
    IF coalesce(current_setting(_guc, true), '') <> txid_current()::text THEN
      PERFORM set_config(_guc, txid_current()::text, true);
      PERFORM realtime.send(jsonb_build_object('t', TG_TABLE_NAME), 'changed', _topic, true);
    END IF;
  EXCEPTION WHEN others THEN
    -- Never block a save because of a notification failure.
    NULL;
  END;
  RETURN NULL;
END
$$;

REVOKE ALL ON FUNCTION public.ring_company_bell() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_receive_bell(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF NOT (private.is_superadmin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
  )) THEN
    RETURN false;
  END IF;
  IF _topic = 'app-bell' THEN RETURN true; END IF;
  IF _topic LIKE 'company-bell:%' THEN
    BEGIN
      _cid := substr(_topic, 14)::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN private.is_superadmin() OR EXISTS (
      SELECT 1 FROM public.user_company_permissions WHERE user_id = auth.uid() AND company_id = _cid
    );
  END IF;
  RETURN false;
END
$$;

REVOKE ALL ON FUNCTION public.can_receive_bell(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_receive_bell(text) TO authenticated;

DROP POLICY IF EXISTS "jarvis_bell_receive" ON realtime.messages;
CREATE POLICY "jarvis_bell_receive"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND public.can_receive_bell(realtime.topic())
);

DO $$
DECLARE
  t text;
  spec text[];
  specs text[][] := ARRAY[
    ['action_plans','company_id','',''],
    ['calendar_events','company_id','',''],
    ['candidates','company_id','',''],
    ['company_members','company_id','',''],
    ['cronoanalysis_sessions','company_id','',''],
    ['document_templates','company_id','',''],
    ['executive_diagnostics','company_id','',''],
    ['fives_configuracoes','company_id','',''],
    ['fives_cronograma_projeto','company_id','',''],
    ['fives_eventos','company_id','',''],
    ['fives_mural_fotos','company_id','',''],
    ['fives_perguntas_customizadas','company_id','',''],
    ['fives_setores','company_id','',''],
    ['improvement_opportunities','company_id','',''],
    ['indicators','company_id','',''],
    ['interviews','company_id','',''],
    ['invoice_items','company_id','',''],
    ['invoices','company_id','',''],
    ['mentorias','company_id','',''],
    ['pain_points','company_id','',''],
    ['payments','company_id','',''],
    ['pops','company_id','',''],
    ['prioritization_criteria','company_id','',''],
    ['processes','company_id','',''],
    ['projects','company_id','',''],
    ['roadmap_items','company_id','',''],
    ['root_cause_analyses','company_id','',''],
    ['sectors','company_id','',''],
    ['user_company_permissions','company_id','',''],
    ['work_hour_expenses','company_id','',''],
    ['work_hour_tools','company_id','',''],
    ['work_hours','company_id','',''],
    ['pesquisas','empresa_id','',''],
    ['vagas','empresa_id','',''],
    ['recrutamento_candidatos','empresa_id','',''],
    ['companies','id','',''],
    ['pesquisa_respostas','parent','pesquisas','pesquisa_id'],
    ['process_activities','parent','processes','process_id'],
    ['process_edges','parent','processes','process_id'],
    ['process_versions','parent','processes','process_id'],
    ['activity_connections','parent','processes','process_id'],
    ['indicator_collections','parent','indicators','indicator_id'],
    ['mentoria_sessoes','parent','mentorias','mentoria_id'],
    ['fives_auditorias','parent','fives_setores','setor_id'],
    ['fives_instrucoes_trabalho','parent','fives_setores','setor_id'],
    ['fives_descartes_cartao_vermelho','parent','fives_setores','setor_id'],
    ['interview_analysis','parent','interviews','interview_id'],
    ['transcripts','parent','interviews','interview_id'],
    ['candidaturas_funil','parent','vagas','vaga_id'],
    ['action_plan_history','parent','action_plans','plan_id'],
    ['crm_leads','app','',''],
    ['crm_activities','app','',''],
    ['tickets','app','','']
  ];
  parent_col text;
BEGIN
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    t := spec[1];
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS jarvis_live_bell ON public.%I', t);
    IF spec[2] = 'parent' THEN
      parent_col := CASE WHEN spec[3] IN ('pesquisas','vagas') THEN 'empresa_id' ELSE 'company_id' END;
      EXECUTE format(
        'CREATE TRIGGER jarvis_live_bell AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ring_company_bell(%L, %L, %L, %L)',
        t, 'parent', spec[3], spec[4], parent_col);
    ELSE
      EXECUTE format(
        'CREATE TRIGGER jarvis_live_bell AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ring_company_bell(%L)',
        t, spec[2]);
    END IF;
  END LOOP;
END
$$;