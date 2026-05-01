-- 1. Crear tabla de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name               TEXT NOT NULL,
    phone              TEXT,
    address            TEXT,
    status             TEXT DEFAULT 'prospecto',
    tags               TEXT[] DEFAULT '{}',
    metadata           JSONB DEFAULT '{}',
    follow_up_date     TIMESTAMP WITH TIME ZONE,
    is_board_suggested BOOLEAN DEFAULT false,
    board_moved_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de Conversaciones (Historial WhatsApp)
CREATE TABLE IF NOT EXISTS public.conversations (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    role         TEXT        NOT NULL CHECK (role IN ('bot', 'user')),
    message      TEXT        NOT NULL,
    stage        TEXT,
    wa_timestamp BIGINT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla de Llamadas
CREATE TABLE IF NOT EXISTS public.calls (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id  UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    notes      TEXT,
    type       TEXT DEFAULT 'call',
    metadata   JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar Realtime para estas tablas
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE calls;

-- 4. Opcional: Políticas de RLS (Para desarrollo habilitamos todo)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anonymous" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for anonymous" ON calls FOR ALL USING (true);
