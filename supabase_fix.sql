-- Corrige policies RLS e evita falhas de insert/update no app SOMAX

-- Remover policies antigas com FOR ALL/USING que bloqueiam inserts
DROP POLICY IF EXISTS "items_all" ON proposal_items;
DROP POLICY IF EXISTS "events_all" ON proposal_events;
DROP POLICY IF EXISTS "company_write" ON company_config;
DROP POLICY IF EXISTS "bdi_write" ON bdi_config;
DROP POLICY IF EXISTS "templates_write" ON condition_templates;
DROP POLICY IF EXISTS "items_select" ON proposal_items;
DROP POLICY IF EXISTS "items_insert" ON proposal_items;
DROP POLICY IF EXISTS "items_update" ON proposal_items;
DROP POLICY IF EXISTS "items_delete" ON proposal_items;
DROP POLICY IF EXISTS "events_select" ON proposal_events;
DROP POLICY IF EXISTS "events_insert" ON proposal_events;
DROP POLICY IF EXISTS "company_insert" ON company_config;
DROP POLICY IF EXISTS "company_update" ON company_config;
DROP POLICY IF EXISTS "company_delete" ON company_config;
DROP POLICY IF EXISTS "bdi_insert" ON bdi_config;
DROP POLICY IF EXISTS "bdi_update" ON bdi_config;
DROP POLICY IF EXISTS "bdi_delete" ON bdi_config;
DROP POLICY IF EXISTS "templates_insert" ON condition_templates;
DROP POLICY IF EXISTS "templates_update" ON condition_templates;
DROP POLICY IF EXISTS "templates_delete" ON condition_templates;

-- proposal_items
CREATE POLICY "items_select" ON proposal_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_insert" ON proposal_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "items_update" ON proposal_items
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "items_delete" ON proposal_items
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- proposal_events
CREATE POLICY "events_select" ON proposal_events
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "events_insert" ON proposal_events
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- company_config
CREATE POLICY "company_insert" ON company_config
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "company_update" ON company_config
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "company_delete" ON company_config
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- bdi_config
CREATE POLICY "bdi_insert" ON bdi_config
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "bdi_update" ON bdi_config
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "bdi_delete" ON bdi_config
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- condition_templates
CREATE POLICY "templates_insert" ON condition_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "templates_update" ON condition_templates
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "templates_delete" ON condition_templates
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
