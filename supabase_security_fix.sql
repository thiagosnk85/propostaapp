-- Ajustes de seguranca e compatibilidade para bases ja criadas

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT uuid_generate_v4();

UPDATE proposals
SET public_token = uuid_generate_v4()
WHERE public_token IS NULL;

ALTER TABLE proposals
  ALTER COLUMN public_token SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_public_token_key'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_public_token_key UNIQUE (public_token);
  END IF;
END $$;

DROP POLICY IF EXISTS "profiles_self" ON profiles;
DROP POLICY IF EXISTS "profiles_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "items_all" ON proposal_items;
DROP POLICY IF EXISTS "events_all" ON proposal_events;
DROP POLICY IF EXISTS "company_write" ON company_config;
DROP POLICY IF EXISTS "bdi_write" ON bdi_config;
DROP POLICY IF EXISTS "templates_write" ON condition_templates;
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_role = 'admin', false);
END;
$$;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "items_all" ON proposal_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM proposals p
      WHERE p.id = proposal_items.proposal_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM proposals p
      WHERE p.id = proposal_items.proposal_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "events_all" ON proposal_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM proposals p
      WHERE p.id = proposal_events.proposal_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM proposals p
      WHERE p.id = proposal_events.proposal_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "company_write" ON company_config
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "bdi_write" ON bdi_config
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "templates_write" ON condition_templates
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
