# SKILL: Safe Preview Mode (Arranque sin envío de mensajes)

Este documento define el procedimiento para arrancar el Dashboard en **modo auditoría** — puedes ver la UI, probar cambios y navegar datos históricos sin riesgo de que se envíe ningún mensaje a clientes reales.

## ¿Cuándo usar esto?

- Pruebas de UI a horas no laborales (madrugada, domingos)
- Validar cambios de código antes de ir a producción
- Demos internas o capturas de pantalla
- Cualquier momento donde quieras ver el Dashboard sin consecuencias

## ¿Por qué es seguro?

Hay 3 caminos por los que el sistema puede enviar mensajes a clientes:

| Vector | Cómo se neutraliza en preview |
|---|---|
| **Outreach** (bot contacta prospectos nuevos) | Ya tiene protección nativa: `isWithinBusinessHours()` bloquea fuera de 8am-7pm. Además, sin Ngrok el loop no se auto-alimenta. |
| **Respuestas automáticas** (cliente escribe → Sebastian responde) | **Sin Ngrok, Meta no puede entregar webhooks.** El mensaje del cliente nunca llega al servidor. |
| **CRM Bridge** (operador responde desde Telegram) | Sin Ngrok, el bridge no recibe triggers. Y el operador no debería estar en Telegram a las 4 AM. |

**Regla:** Sin Ngrok = Sin túnel público = Meta no tiene URL = Imposible recibir o enviar.

## Arranque Rápido

```bash
./start_preview.sh
```

Esto inicia solo Backend (API) + Dashboard. **No inicia Ngrok.**

## Arranque Manual (si prefieres hacerlo paso a paso)

```bash
# 1. Limpiar puertos
fuser -k 3000/tcp 3001/tcp 2>/dev/null

# 2. Backend (provee datos al Dashboard)
cd apps/call-track && npm run start &

# 3. Dashboard
cd apps/dashboard && PORT=3001 npm run dev &
```

## Verificar que estás en modo seguro

```bash
curl -s http://localhost:4040/api/tunnels 2>/dev/null || echo "✅ Ngrok NO activo. Modo preview confirmado."
```

## Qué funciona y qué no

| Funcionalidad | ¿Disponible? |
|---|---|
| Ver lista de contactos | ✅ |
| Ver historial de chat completo | ✅ |
| Navegar el Kanban | ✅ |
| Mover cards entre columnas | ✅ |
| Ver perfil de contacto | ✅ |
| Exportar CSV de leads | ✅ |
| Mensajes en tiempo real | ❌ |
| Enviar mensajes | ❌ |
| Notificaciones push | ❌ |

## Volver a producción

```bash
# Apagar preview
tmux kill-session -t preview 2>/dev/null
fuser -k 3000/tcp 3001/tcp 2>/dev/null

# Arrancar modo completo (CON Ngrok)
./start_pipeline.sh
```

## ⚠️ Lo que NUNCA debes hacer en modo preview

1. **NO ejecutar `./start_pipeline.sh`** mientras estés en preview — ese enciende Ngrok.
2. **NO ejecutar `./bin/ngrok http 3000`** manualmente — abre el túnel.
3. **NO responder desde el bot de Telegram** — el backend sí está activo y podría intentar reenviar.

---
*Creado el 2 de mayo, 2026 — Project Native Feel.*
