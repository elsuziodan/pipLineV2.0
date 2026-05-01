-- ==============================================================================
-- MASTER DATABASE SCHEMA: Seven Factor Pipeline V2.0
-- ==============================================================================
-- Este archivo contiene la definición completa de las tablas necesarias
-- para el funcionamiento del Dashboard de Producción, el Puente de Telegram
-- y el motor de IA Sebastian.
-- ==============================================================================

-- 1. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA: clients (Maestro de clientes y talleres)
-- Contiene el estado del bot, metadatos de Telegram y estado en Kanban.
CREATE TABLE IF NOT EXISTS public.clients (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name               TEXT NOT NULL, -- Nombre del Negocio / Taller
    phone              TEXT,          -- Formato internacional sin '+'
    address            TEXT,
    status             TEXT DEFAULT 'prospecto', -- prospecto, FABRICA, COBRANZA, LIQUIDADO, CANCELADO
    tags               TEXT[] DEFAULT '{}',
    metadata           JSONB DEFAULT '{}', -- telegram_thread_id, bot_status, etc.
    follow_up_date     TIMESTAMP WITH TIME ZONE,
    is_board_suggested BOOLEAN DEFAULT false, -- Indica si aparece en la bandeja de entrada del dashboard
    board_moved_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Para cronómetros de Kanban
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: conversations (Historial completo de WhatsApp)
-- Respaldo proporcionado por el usuario que funciona correctamente.
DROP TABLE IF EXISTS public.conversations;
CREATE TABLE public.conversations (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    role         TEXT        NOT NULL CHECK (role IN ('bot', 'user')),
    message      TEXT        NOT NULL,
    stage        TEXT,       -- Estado del bot en el momento del mensaje
    wa_timestamp BIGINT,     -- Timestamp enviado por la API de Meta
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: calls (Registro de interacciones adicionales)
CREATE TABLE IF NOT EXISTS public.calls (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id  UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    notes      TEXT,
    type       TEXT DEFAULT 'call',
    metadata   JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. REALTIME Y POLÍTICAS (Configuración para Supabase)
-- Habilitar Realtime para actualización instantánea del Dashboard.
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Habilitar RLS (Habilitado por defecto para seguridad, ajustado para desarrollo)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anonymous" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for anonymous" ON conversations FOR ALL USING (true);

-- ==============================================================================
-- NOTAS DE MIGRACIÓN PARA EL USUARIO:
-- Si ya tienes las tablas creadas, solo necesitas agregar las nuevas columnas:
-- ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_board_suggested BOOLEAN DEFAULT false;
-- ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS board_moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- ==============================================================================
