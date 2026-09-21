-- Migration: 20260920220000_audit_work_hour_manager_rpc.sql
-- Permite que gestores e administradores auditem e ajustem lançamentos de horas de consultores com SECURITY DEFINER

ALTER TABLE public.work_hours
  ADD COLUMN IF NOT EXISTS is_remunerated boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS audit_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS adjusted_by_manager boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manager_note text DEFAULT '';

ALTER TABLE public.work_hour_expenses
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'deslocamento';

-- Atualizar política para permitir que gestores atualizem work_hours
DROP POLICY IF EXISTS "work_hours_tool_update" ON public.work_hours;
CREATE POLICY "work_hours_tool_update" ON public.work_hours FOR UPDATE TO authenticated
  USING (
    private.has_tool(company_id, 'horas') AND (
      private.is_superadmin()
      OR user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor')
    )
  )
  WITH CHECK (
    private.has_tool(company_id, 'horas') AND (
      private.is_superadmin()
      OR user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor')
    )
  );

-- RPC com SECURITY DEFINER para auditoria de horas por gestores
CREATE OR REPLACE FUNCTION public.audit_work_hour_by_manager(
  _work_hour_id uuid,
  _hours numeric,
  _is_remunerated boolean,
  _company_id uuid,
  _manager_note text,
  _expenses jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wh record;
  _caller uuid := auth.uid();
  _is_allowed boolean := false;
  _clean_notes text;
  _exp_item jsonb;
  _cat text;
  _desc text;
  _amt numeric;
BEGIN
  IF private.is_superadmin() THEN
    _is_allowed := true;
  ELSIF EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _caller AND member_role = 'gestor'
  ) THEN
    _is_allowed := true;
  END IF;

  IF NOT _is_allowed THEN
    RAISE EXCEPTION 'Acesso negado: apenas gestores ou superadmin podem auditar lançamentos.';
  END IF;

  SELECT * INTO _wh FROM public.work_hours WHERE id = _work_hour_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento de horas não encontrado.';
  END IF;

  _clean_notes := regexp_replace(coalesce(_wh.notes, ''), '\[NAO_REMUNERADA\]', '', 'g');
  _clean_notes := regexp_replace(_clean_notes, '\[AJUSTADO_GESTAO:[^\]]+\]', '', 'g');
  _clean_notes := trim(_clean_notes);

  IF NOT _is_remunerated THEN
    _clean_notes := CASE WHEN _clean_notes = '' THEN '[NAO_REMUNERADA]' ELSE _clean_notes || ' [NAO_REMUNERADA]' END;
  END IF;

  IF coalesce(_manager_note, '') <> '' THEN
    _clean_notes := CASE WHEN _clean_notes = '' THEN '[AJUSTADO_GESTAO: ' || _manager_note || ']' ELSE _clean_notes || ' [AJUSTADO_GESTAO: ' || _manager_note || ']' END;
  END IF;

  UPDATE public.work_hours
  SET
    hours = _hours,
    company_id = _company_id,
    notes = _clean_notes,
    updated_at = now()
  WHERE id = _work_hour_id;

  BEGIN
    UPDATE public.work_hours
    SET
      adjusted_by_manager = true,
      manager_note = _manager_note,
      is_remunerated = _is_remunerated
    WHERE id = _work_hour_id;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  DELETE FROM public.work_hour_expenses WHERE work_hour_id = _work_hour_id;

  IF _expenses IS NOT NULL AND jsonb_array_length(_expenses) > 0 THEN
    FOR _exp_item IN SELECT * FROM jsonb_array_elements(_expenses)
    LOOP
      _cat := coalesce(_exp_item->>'category', 'deslocamento');
      _desc := coalesce(_exp_item->>'description', '');
      _amt := coalesce((_exp_item->>'amount')::numeric, 0);

      IF _amt > 0 OR _desc <> '' THEN
        BEGIN
          INSERT INTO public.work_hour_expenses (
            work_hour_id, company_id, project_id, category, description, amount, created_by
          ) VALUES (
            _work_hour_id, _company_id, _wh.project_id, _cat,
            CASE WHEN _desc <> '' THEN '[' || _cat || '] ' || _desc ELSE '[' || _cat || ']' END,
            _amt, _caller
          );
        EXCEPTION WHEN undefined_column THEN
          INSERT INTO public.work_hour_expenses (
            work_hour_id, company_id, project_id, description, amount, created_by
          ) VALUES (
            _work_hour_id, _company_id, _wh.project_id,
            CASE WHEN _desc <> '' THEN '[' || _cat || '] ' || _desc ELSE '[' || _cat || ']' END,
            _amt, _caller
          );
        END;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', _work_hour_id, 'manager_note', _manager_note);
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_work_hour_by_manager TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
