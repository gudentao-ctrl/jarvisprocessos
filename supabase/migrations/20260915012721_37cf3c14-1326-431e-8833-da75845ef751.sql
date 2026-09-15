CREATE POLICY "companies_crm_select"
ON public.companies
FOR SELECT
TO authenticated
USING (private.has_any_tool('crm'));

CREATE POLICY "companies_crm_insert"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  private.has_any_tool('crm')
  AND created_by = auth.uid()
  AND is_active = true
);

CREATE OR REPLACE FUNCTION public.convert_crm_lead_to_company(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private
AS $$
DECLARE
  _lead public.crm_leads%ROWTYPE;
  _company_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_any_tool('crm') THEN
    RAISE EXCEPTION 'Acesso ao CRM não autorizado';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_lead_id::text));

  SELECT * INTO _lead
  FROM public.crm_leads
  WHERE id = _lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;
  IF _lead.stage <> 'fechamento' THEN
    RAISE EXCEPTION 'O lead precisa estar em Fechamento';
  END IF;
  IF _lead.converted_company_id IS NOT NULL THEN
    RETURN _lead.converted_company_id;
  END IF;

  SELECT id INTO _company_id
  FROM public.companies
  WHERE is_active = true
    AND lower(btrim(name)) = lower(btrim(_lead.company_name))
  ORDER BY created_at
  LIMIT 1;

  IF _company_id IS NULL THEN
    INSERT INTO public.companies (name, created_by, is_active)
    VALUES (btrim(_lead.company_name), auth.uid(), true)
    RETURNING id INTO _company_id;
  END IF;

  UPDATE public.crm_leads
  SET converted_company_id = _company_id,
      converted_at = now()
  WHERE id = _lead_id;

  RETURN _company_id;
END;
$$;