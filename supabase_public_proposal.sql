-- Funcoes publicas para visualizar e responder propostas sem login

DROP FUNCTION IF EXISTS public.get_public_proposal(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_public_proposal(uuid);
DROP FUNCTION IF EXISTS public.respond_to_proposal(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.respond_to_proposal(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.get_public_proposal(p_id uuid, p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'proposal', to_jsonb(p),
    'items', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(pi) ORDER BY pi.ordem)
        FROM proposal_items pi
        WHERE pi.proposal_id = p.id
      ),
      '[]'::jsonb
    ),
    'company', (
      SELECT to_jsonb(c)
      FROM company_config c
      ORDER BY c.updated_at DESC NULLS LAST
      LIMIT 1
    )
  )
  INTO v_result
  FROM proposals p
  WHERE p.id = p_id
    AND p.public_token = p_token;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_proposal(
  p_id uuid,
  p_token uuid,
  p_action text,
  p_name text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_note text;
BEGIN
  IF p_action NOT IN ('approve', 'cancel') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Acao invalida.');
  END IF;

  SELECT status
  INTO v_status
  FROM proposals
  WHERE id = p_id
    AND public_token = p_token;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Proposta nao encontrada.');
  END IF;

  IF v_status IN ('aprovada', 'cancelada') THEN
    RETURN jsonb_build_object('success', true, 'message', 'Proposta ja respondida.', 'status', v_status);
  END IF;

  IF p_action = 'approve' THEN
    UPDATE proposals
    SET status = 'aprovada',
        approved_at = NOW()
    WHERE id = p_id
      AND public_token = p_token;

    v_note := COALESCE(NULLIF(TRIM(p_name), ''), 'Cliente') || ' aprovou a proposta.'
      || CASE WHEN COALESCE(NULLIF(TRIM(p_note), ''), '') <> '' THEN ' ' || TRIM(p_note) ELSE '' END;

    INSERT INTO proposal_events (proposal_id, user_id, event_type, note)
    VALUES (p_id, NULL, 'client_approve', v_note);

    RETURN jsonb_build_object('success', true, 'message', 'Proposta aprovada com sucesso.', 'status', 'aprovada');
  END IF;

  UPDATE proposals
  SET status = 'cancelada',
      cancelled_at = NOW()
  WHERE id = p_id
    AND public_token = p_token;

  v_note := COALESCE(NULLIF(TRIM(p_note), ''), 'Cliente recusou a proposta.');

  INSERT INTO proposal_events (proposal_id, user_id, event_type, note)
  VALUES (p_id, NULL, 'client_cancel', v_note);

  RETURN jsonb_build_object('success', true, 'message', 'Proposta recusada com sucesso.', 'status', 'cancelada');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_proposal(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_proposal(uuid, uuid, text, text, text) TO anon, authenticated;
