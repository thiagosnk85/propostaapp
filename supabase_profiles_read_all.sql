-- Permite que usuarios autenticados visualizem todos os perfis
-- sem liberar edicao do cadastro de outros usuarios.

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
