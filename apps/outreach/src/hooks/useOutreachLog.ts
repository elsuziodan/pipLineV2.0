"use client";

import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { OutreachStatus } from "../lib/types";

export function useOutreachLog() {
  const logInteraction = useCallback(async (clientId: string, status: OutreachStatus, speech?: string, notes?: string) => {
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log("Mock log interaction:", { clientId, status, speech, notes });
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from("outreach_messages")
        .insert({
          client_id: clientId,
          status,
          speech_used: speech,
          notes,
          sent_at: new Date().toISOString()
        });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error logging interaction:", err);
      return { success: false, error: err };
    }
  }, []);

  return { logInteraction };
}
