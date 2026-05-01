# Skill: Auditoría de Conversaciones (Centinela)

Esta skill permite detectar automáticamente leads que se han quedado "atrapados" o que Sebastian ha clasificado incorrectamente.

## Instrucciones de Ejecución

1.  **Escaneo de Base de Datos:**
    *   Revisar los últimos 100 mensajes en la tabla `conversations`.
    *   Cruzar con el `bot_status` de la tabla `clients`.

2.  **Criterios de Alerta:**
    *   **Bot Silencioso:** Cliente respondió hace >5 minutos y no hay respuesta del bot.
    *   **Handover Falso Positivo:** Bot escaló a Daniel, pero el mensaje del cliente es corto/amigable (ej. "hola", "dígame").
    *   **Rechazo Sospechoso:** Bot marcó como REJECTED pero el cliente mostró interés.

3.  **Notificación Automática:**
    *   Enviar una alerta a Telegram por cada lead detectado.
    *   Escribir el resultado en el archivo `scratch/LATEST_AUDIT.log`.

4.  **Auto-Corrección (Opcional):**
    *   Si el error es evidente (saludo confirmado), disparar `Automator.proceedToStep2()`.

## Implementación en Segundo Plano
La skill se implementa mediante el script `src/services/background_auditor.ts` y debe ser ejecutada mediante `npm run auditor`.
