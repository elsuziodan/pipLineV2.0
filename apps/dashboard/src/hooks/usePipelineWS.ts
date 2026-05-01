"use client";
import { useState, useEffect, useCallback, useRef } from 'react';

export type PipelineState = {
  status: string;
  connected: boolean;
  block: string | null;
  scraper: any | null;
  loader: any | null;
  bot: { messages: any[], activeConversations: any[], paused: boolean };
  gate: { id: string, report: any, pending: boolean } | null;
  stopReason: string | null;
};

export function usePipelineWS() {
  const [state, setState] = useState<PipelineState>({
    status: 'IDLE',
    connected: false,
    block: null,
    scraper: null,
    loader: null,
    bot: { messages: [], activeConversations: [], paused: false },
    gate: null,
    stopReason: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);

  const handleEvent = useCallback((event: string, data: any) => {
    setState(s => {
      const ns = { ...s };
      switch (event) {
        case 'pipeline:status':
          ns.status = data?.status || ns.status;
          ns.block = data?.block || ns.block;
          break;
        case 'pipeline:stop':
          ns.status = 'STOPPED';
          ns.block = 'STOPPED';
          ns.stopReason = data?.reason;
          break;
        case 'scraper:progress':
          ns.scraper = data;
          break;
        case 'scraper:complete':
          ns.scraper = null;
          break;
        case 'loader:progress':
          ns.loader = data;
          break;
        case 'loader:complete':
          ns.loader = null;
          break;
        case 'bot:message':
          ns.bot = {
             ...ns.bot,
             messages: [data, ...ns.bot.messages].slice(0, 50)
          };
          // Sonido de notificación para mensajes entrantes
          if (data.direction === 'IN') {
            try {
              const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
              if (AudioCtx) {
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain).connect(ctx.destination);
                osc.frequency.value = 800;
                gain.gain.value = 0.08;
                osc.start();
                osc.stop(ctx.currentTime + 0.12);
              }
            } catch (e) { /* silencioso en caso de restricción del navegador */ }

            // Notificación push del navegador
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                if (document.hidden) {
                  new Notification(`📩 ${data.name || 'Cliente'}`, {
                    body: data.text?.substring(0, 100) || 'Nuevo mensaje',
                    icon: '/icon-192.png',
                    tag: `msg-${data.phone}-${Date.now()}`,
                    requireInteraction: data.botStatus === 'SENT_CLIMAX' || data.botStatus === 'HANDOVER_CLIMAX',
                  });
                }
              } catch (e) { /* silencioso */ }
            }
          }
          break;
        case 'bot:pause':
          ns.bot.paused = true;
          break;
        case 'bot:resume':
          ns.bot.paused = false;
          break;
        case 'bot:status':
          if (data) {
            const existing = ns.bot.activeConversations.findIndex((c: any) => c.phone === data.phone);
            const newConvs = [...ns.bot.activeConversations];
            if (existing >= 0) {
                newConvs[existing] = data;
            } else {
                newConvs.push(data);
            }
            ns.bot.activeConversations = newConvs;
          }
          break;
        case 'gate:pending':
          ns.gate = { id: data?.gate, report: data?.auditReport, pending: true };
          break;
        case 'gate:decision':
          ns.gate = null;
          break;
      }
      return ns;
    });
  }, []);

  const handleEventRef = useRef(handleEvent);
  handleEventRef.current = handleEvent;

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.hostname}:3000`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setState(s => ({ ...s, connected: true }));
      };
      
      ws.onclose = () => {
        setState(s => ({ ...s, connected: false }));
        timeout = setTimeout(connect, 3000); // Auto reconnect
      };
      
      ws.onmessage = (eventMsg) => {
        try {
          const parsed = JSON.parse(eventMsg.data);
          handleEventRef.current(parsed.event, parsed.data);
        } catch(e) {
            console.error('Failed to parse WS message', e);
        }
      };
      
      wsRef.current = ws;
    };
    
    connect();

    // Solicitar permiso para notificaciones
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    return () => {
      clearTimeout(timeout);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect loop on unmount
        wsRef.current.close();
      }
    };
  }, []);

  const sendCommand = useCallback((type: string, payload?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  return { state, sendCommand };
}
