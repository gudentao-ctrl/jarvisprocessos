ALTER POLICY "Authenticated users can select candidates" ON public.candidates USING (private.granular_row_access('candidates', to_jsonb(candidates), 'read'));
ALTER POLICY "Authenticated users can insert candidates" ON public.candidates WITH CHECK (private.granular_row_access('candidates', to_jsonb(candidates), 'create'));
ALTER POLICY "Authenticated users can update candidates" ON public.candidates USING (private.granular_row_access('candidates', to_jsonb(candidates), 'update')) WITH CHECK (private.granular_row_access('candidates', to_jsonb(candidates), 'update'));
ALTER POLICY "Authenticated users can delete candidates" ON public.candidates USING (private.granular_row_access('candidates', to_jsonb(candidates), 'delete'));
