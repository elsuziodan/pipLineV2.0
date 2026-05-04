import { useState, useEffect, useCallback, useRef } from "react";
import { usePipelineWS } from "@/hooks/usePipelineWS";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function useChat(selectedContact: string | null) {
  const { state, sendCommand } = usePipelineWS();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchHistory = useCallback(async (clientId: string) => {
    setLoading(true);
    setIsInitialLoad(true);
    try {
      const res = await fetch(`/api/history/${clientId}/paginated?limit=50`, { 
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();
      setMessages(data.messages || []);
      setNextCursor(data.nextCursor);
    } catch (e) {
      console.error("[useChat] Error fetching history:", e);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!selectedContact || !nextCursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/history/${selectedContact}/paginated?cursor=${nextCursor}&limit=50`, { 
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();
      // Prepend older messages
      setMessages(prev => [...(data.messages || []), ...prev]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      console.error("[useChat] Error loading more messages:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedContact, nextCursor, loading]);

  useEffect(() => {
    if (selectedContact) {
      setMessages([]); // Limpiar inmediatamente para evitar "fantasmas" del chat anterior
      fetchHistory(selectedContact);
    } else {
      setMessages([]);
      setNextCursor(null);
    }
  }, [selectedContact, fetchHistory]);

  // Sync live messages from WebSocket state
  useEffect(() => {
    if (!selectedContact) return;
    
    const normSelected = normalizePhone(selectedContact);
    const liveMsgs = state.bot.messages.filter(m => {
      // Prioridad 1: Comparar por UUID (clientId) si existe
      if (m.clientId && m.clientId === selectedContact) return true;
      
      // Prioridad 2: Fallback a teléfono (para compatibilidad o si no hay UUID)
      return normalizePhone(m.phone || '') === normSelected;
    });

    if (liveMsgs.length === 0) return;

    setMessages(prev => {
      // Deduplicate live messages against current messages in state
      const newMsgs = liveMsgs.filter(lm => {
          const lmTime = Math.floor(new Date(lm.timestamp).getTime() / 1000);
          return !prev.some(pm => 
            pm.role === (lm.direction === 'OUT' ? 'bot' : 'user') && 
            pm.message === lm.text &&
            Math.abs((pm.wa_timestamp || Math.floor(new Date(pm.created_at).getTime()/1000)) - lmTime) < 10
          );
      });

      if (newMsgs.length === 0) return prev;

      const formatted = newMsgs.map(m => ({
        role: m.direction === 'OUT' ? 'bot' : 'user',
        message: m.text,
        created_at: m.timestamp,
        wa_timestamp: Math.floor(new Date(m.timestamp).getTime() / 1000),
        media_url: m.media_url,
        media_type: m.media_type
      }));

      // Append live messages (they are newer)
      return [...prev, ...formatted].sort((a, b) => 
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
    });
  }, [state.bot.messages, selectedContact]);

  return { 
    messages, 
    loading, 
    isInitialLoad, 
    loadMore, 
    sendCommand,
    botPaused: state.bot.paused,
    connected: state.connected,
    gate: state.gate
  };
}
