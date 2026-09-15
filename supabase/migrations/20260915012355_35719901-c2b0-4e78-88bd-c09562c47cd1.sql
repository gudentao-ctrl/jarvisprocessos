CREATE OR REPLACE FUNCTION public.work_hours_billing_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF private.is_superadmin() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.billing_status = 'faturado' THEN
      RAISE EXCEPTION 'Lançamento já faturado não pode ser excluído';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.billing_status = 'faturado' AND NEW.billing_status = 'faturado' THEN
    IF NEW.hours IS DISTINCT FROM OLD.hours
       OR NEW.work_date IS DISTINCT FROM OLD.work_date
       OR NEW.start_time IS DISTINCT FROM OLD.start_time
       OR NEW.end_time IS DISTINCT FROM OLD.end_time
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Lançamento já faturado não pode ser alterado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.work_hours_billing_lock() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.superadmin_delete_invoice(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
BEGIN
  IF NOT private.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso restrito ao SuperAdmin';
  END IF;

  SELECT company_id INTO _company_id
  FROM public.invoices
  WHERE id = _invoice_id;

  IF _company_id IS NULL THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  UPDATE public.work_hours
  SET billing_status = 'aberto',
      invoice_id = NULL,
      invoiced_at = NULL,
      invoiced_by = NULL
  WHERE invoice_id = _invoice_id;

  DELETE FROM public.invoice_items WHERE invoice_id = _invoice_id;
  DELETE FROM public.invoices WHERE id = _invoice_id;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, company_id, details)
  VALUES (auth.uid(), 'invoice_delete', 'invoices', _invoice_id, _company_id, jsonb_build_object('hours_reopened', true));
END;
$$;
REVOKE ALL ON FUNCTION public.superadmin_delete_invoice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.superadmin_delete_invoice(uuid) TO authenticated, service_role;