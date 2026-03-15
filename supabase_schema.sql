-- ============================================================
-- SOMAX · Gerador de Propostas
-- Supabase Schema — Execute no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (dados extras do usuário autenticado)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: cria profile automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- COMPANY CONFIG (configuração da empresa — 1 registro global)
-- ============================================================
CREATE TABLE company_config (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome         TEXT NOT NULL DEFAULT 'SOMAX Sistemas de Ventilação',
  cnpj         TEXT,
  endereco     TEXT,
  telefone     TEXT,
  email        TEXT,
  logo_url     TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO company_config (nome) VALUES ('SOMAX Sistemas de Ventilação');

-- ============================================================
-- BDI CONFIG (multiplicadores por categoria)
-- ============================================================
CREATE TABLE bdi_config (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria    TEXT NOT NULL CHECK (categoria IN ('vent','motor','serv')),
  royalties    NUMERIC DEFAULT 5,
  frete        NUMERIC DEFAULT 1,
  documentacao NUMERIC DEFAULT 1,
  impostos     NUMERIC DEFAULT 6.73,
  comissao     NUMERIC DEFAULT 7,
  ct           NUMERIC DEFAULT 0,
  icms         NUMERIC DEFAULT 12,
  margem       NUMERIC DEFAULT 25,
  over         NUMERIC DEFAULT 10,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO bdi_config (categoria, royalties, frete, documentacao, impostos, comissao, ct, icms, margem, over) VALUES
  ('vent',  5,    1, 1, 6.73, 7, 0, 12, 25, 10),
  ('motor', 0,    1, 1, 6.73, 7, 0, 12, 25, 10),
  ('serv',  0,    0, 1, 14,   7, 0,  0, 25, 10);

-- ============================================================
-- PROPOSALS
-- ============================================================
CREATE TABLE proposals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_token  UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Identificação
  prop_number   TEXT NOT NULL,           -- ex: 2025-001
  n_controle    TEXT,
  revisao       TEXT DEFAULT '0',
  status        TEXT NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente','enviada','aprovada','cancelada','perdida')),
  
  -- Cliente
  cliente       TEXT NOT NULL,
  attn          TEXT,
  cnpj_cliente  TEXT,
  endereco      TEXT,
  telefone      TEXT,
  email         TEXT,
  whatsapp      TEXT,
  ref_cliente   TEXT,
  cooperacao    TEXT,
  
  -- Valores
  subtotal      NUMERIC DEFAULT 0,
  bdi_mult      NUMERIC DEFAULT 1,
  total         NUMERIC DEFAULT 0,
  
  -- Condições comerciais
  prazo_entrega       TEXT,
  cond_pagamento      TEXT,
  impostos            TEXT,
  local_entrega       TEXT,
  validade_proposta   TEXT DEFAULT '30 dias corridos da data de emissão',
  cond_gerais         TEXT,
  observacoes         TEXT,
  
  -- Controle
  sent_email_at   TIMESTAMPTZ,
  sent_wa_at      TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPOSAL ITEMS
-- ============================================================
CREATE TABLE proposal_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id   UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'item' CHECK (tipo IN ('item','alternativa')),
  ordem         INTEGER NOT NULL DEFAULT 0,
  tag           TEXT,
  descricao     TEXT,
  quantidade    NUMERIC NOT NULL DEFAULT 1,
  preco_unit    NUMERIC NOT NULL DEFAULT 0,
  preco_total   NUMERIC GENERATED ALWAYS AS (quantidade * preco_unit) STORED
);

-- ============================================================
-- PROPOSAL EVENTS LOG (histórico de ações)
-- ============================================================
CREATE TABLE proposal_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id   UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL,  -- 'created','sent_email','sent_wa','approved','cancelled','viewed'
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONDITION TEMPLATES (templates de condições padrão)
-- ============================================================
CREATE TABLE condition_templates (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo       TEXT NOT NULL CHECK (tipo IN ('prazo','pagamento','impostos','local','validade','cond_gerais')),
  titulo     TEXT NOT NULL,
  conteudo   TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates padrão SOMAX
INSERT INTO condition_templates (tipo, titulo, conteudo, is_default) VALUES
('prazo',      'Padrão 90 dias',        '90 dias corridos após aprovação técnica e recebimento do pedido de compra com 50% de antecipação.', TRUE),
('pagamento',  '50/50',                 '50% na emissão do pedido e 50% contra fatura antes do embarque.', TRUE),
('pagamento',  '30/40/30',              '30% na emissão do pedido, 40% na aprovação técnica e 30% contra fatura antes do embarque.', FALSE),
('impostos',   'Padrão ICMS 12%',       'ICMS 12%, IPI conforme NCM do produto. PIS e COFINS inclusos no preço.', TRUE),
('local',      'CIF Rio de Janeiro',    'CIF – Rio de Janeiro / RJ', TRUE),
('validade',   '30 dias',               '30 dias corridos da data de emissão.', TRUE),
('cond_gerais','Garantia 12 meses',     'Garantia de 12 meses contra defeitos de fabricação, a partir da data de entrega. Não estão cobertos danos causados por uso inadequado, instalação incorreta ou manutenção indevida.', TRUE);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_proposals_status      ON proposals(status);
CREATE INDEX idx_proposals_created_by  ON proposals(created_by);
CREATE INDEX idx_proposals_created_at  ON proposals(created_at DESC);
CREATE INDEX idx_proposals_cliente     ON proposals(cliente);
CREATE INDEX idx_proposal_items_pid    ON proposal_items(proposal_id);
CREATE INDEX idx_events_pid            ON proposal_events(proposal_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bdi_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_templates ENABLE ROW LEVEL SECURITY;

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

-- Profiles: todos autenticados podem listar; update só no próprio ou admin
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Proposals: todos autenticados veem, editam as próprias; admin vê tudo
CREATE POLICY "proposals_select" ON proposals FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "proposals_insert" ON proposals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "proposals_update" ON proposals FOR UPDATE
  USING (created_by = auth.uid() OR
         public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());
CREATE POLICY "proposals_delete" ON proposals FOR DELETE
  USING (public.is_admin());

-- Items: herdam permissão da proposal
CREATE POLICY "items_all" ON proposal_items FOR ALL
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

-- Events: todos podem inserir, todos veem
CREATE POLICY "events_all" ON proposal_events FOR ALL
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

-- Company/BDI/Templates: todos leem, só admin escreve
CREATE POLICY "company_read"    ON company_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "company_write"   ON company_config FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "bdi_read"        ON bdi_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bdi_write"       ON bdi_config FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "templates_read"  ON condition_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "templates_write" ON condition_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proposals_updated   BEFORE UPDATE ON proposals        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bdi_updated         BEFORE UPDATE ON bdi_config        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_company_updated     BEFORE UPDATE ON company_config     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
