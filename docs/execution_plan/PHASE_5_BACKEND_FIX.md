# Phase 5: Backend Bug Fix (Telegram CRM Bridge)

**Goal:** Fix the topic naming issue in the Telegram CRM bridge to ensure UI parity.

## 1. Problem Identification
Currently, `apps/call-track/src/services/telegram_crm_bridge.ts` uses the WhatsApp push name to create the Telegram topic. We need it to use the `name` (or `nombre_negocio`) from the Supabase `clients` table.

## 2. Code Modification
*   **File:** `apps/call-track/src/services/telegram_crm_bridge.ts`
*   **Action:** Locate the function responsible for creating a new topic (`createForumTopic` or similar).
*   **Code Changes to Inject:**
    *   Before creating the topic, query Supabase:
        ```typescript
        const { data: client } = await supabase
            .from('clients')
            .select('name') // or 'nombre_negocio' depending on schema
            .eq('id', clientId)
            .single();
        ```
    *   Extract the name, fallback to phone number if null.
    *   ```typescript
        const topicName = client?.name ? client.name.substring(0, 64) : `+${clientId}`;
        // Call Telegram API with topicName
        ```

## 3. Verification
*   Restart the Call-Track backend (`npm run start`).
*   Trigger a handover and verify in Telegram that the new topic uses the Database Name, not the WhatsApp Push Name.
