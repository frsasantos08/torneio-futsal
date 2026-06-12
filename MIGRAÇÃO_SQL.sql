-- ============================================
-- MIGRAÇÃO: Sistema de Torneios Multi-Admin
-- Colar no SQL Editor do Supabase e executar
-- ============================================

-- 1. TORNEIOS
CREATE TABLE IF NOT EXISTS public.torneios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  logo_url TEXT,
  organizador TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  formato INTEGER NOT NULL CHECK (formato IN (8, 10, 12)),
  num_grupos INTEGER NOT NULL,
  equipas_por_grupo INTEGER NOT NULL,
  -- Configuração do calendário
  dia1_inicio TIME NOT NULL DEFAULT '09:00',
  dia1_fim TIME NOT NULL DEFAULT '21:00',
  dia2_inicio TIME NOT NULL DEFAULT '09:00',
  dia2_fim TIME NOT NULL DEFAULT '21:00',
  duracao_jogo INTEGER NOT NULL DEFAULT 60,
  intervalo_jogos INTEGER NOT NULL DEFAULT 15,
  pausas_dia2 JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativo', 'finalizado')),
  criado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TORNEIO_ADMINS (M2M)
CREATE TABLE IF NOT EXISTS public.torneio_admins (
  torneio_id UUID REFERENCES public.torneios(id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL,
  PRIMARY KEY (torneio_id, admin_id)
);

-- 3. EQUIPAS (adicionar colunas)
ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS torneio_id UUID REFERENCES public.torneios(id);
ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS slot TEXT;       -- "A1", "B3", etc.
ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS grupo TEXT;
ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS confirmada BOOLEAN DEFAULT FALSE;

-- 4. TROFEUS
CREATE TABLE IF NOT EXISTS public.trofeus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneio_id UUID REFERENCES public.torneios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('melhor_ataque','melhor_defesa','disciplina','copofonia','1lugar','2lugar','3lugar')),
  equipa_id UUID,
  equipa_nome TEXT,
  confirmado BOOLEAN DEFAULT FALSE,
  confirmado_por TEXT,
  confirmado_em TIMESTAMPTZ,
  notas TEXT,
  visivel_tv BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(torneio_id, tipo)
);

-- 5. JOGOS (adicionar colunas)
ALTER TABLE public.jogos ADD COLUMN IF NOT EXISTS torneio_id UUID REFERENCES public.torneios(id);
ALTER TABLE public.jogos ADD COLUMN IF NOT EXISTS vermelho_direto_a INTEGER DEFAULT 0;
ALTER TABLE public.jogos ADD COLUMN IF NOT EXISTS vermelho_direto_b INTEGER DEFAULT 0;
ALTER TABLE public.jogos ADD COLUMN IF NOT EXISTS vermelho_acumulacao_a INTEGER DEFAULT 0;
ALTER TABLE public.jogos ADD COLUMN IF NOT EXISTS vermelho_acumulacao_b INTEGER DEFAULT 0;

-- 6. CLASSIFICACAO_GRUPOS (adicionar colunas)
ALTER TABLE public.classificacao_grupos ADD COLUMN IF NOT EXISTS torneio_id UUID REFERENCES public.torneios(id);
ALTER TABLE public.classificacao_grupos ADD COLUMN IF NOT EXISTS pontos_disciplina INTEGER DEFAULT 0;
ALTER TABLE public.classificacao_grupos ADD COLUMN IF NOT EXISTS vermelho_direto INTEGER DEFAULT 0;
ALTER TABLE public.classificacao_grupos ADD COLUMN IF NOT EXISTS vermelho_acumulacao INTEGER DEFAULT 0;

-- 7. RLS POLICIES (service role bypassa tudo, mas por segurança)
ALTER TABLE public.torneios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_torneios" ON public.torneios;
CREATE POLICY "service_role_torneios" ON public.torneios USING (true) WITH CHECK (true);

ALTER TABLE public.torneio_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_torneio_admins" ON public.torneio_admins;
CREATE POLICY "service_role_torneio_admins" ON public.torneio_admins USING (true) WITH CHECK (true);

ALTER TABLE public.trofeus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_trofeus" ON public.trofeus;
CREATE POLICY "service_role_trofeus" ON public.trofeus USING (true) WITH CHECK (true);

-- 8. NOTA: Criar bucket de Storage manualmente:
--    Supabase Dashboard → Storage → New Bucket
--    Nome: "torneio-logos"  |  Public: SIM
