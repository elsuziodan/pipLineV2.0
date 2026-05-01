"use client";

import { usePipelineWS } from "@/hooks/usePipelineWS";
import { useState, useEffect, useRef } from "react";
import { 
  RadioTower, 
  Database, 
  Bot, 
  Pause, 
  Play, 
  Smile,
  Paperclip,
  Send,
  MoreVertical,
  Check,
  CheckCheck,
  ArrowLeft,
  Activity,
  Star,
  MessageSquare,
} from "lucide-react";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'ahora';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dayNames[new Date(timestamp).getDay()];
  }
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export default function Dashboard() {
  const { state, sendCommand } = usePipelineWS();
  const [mounted, setMounted] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  const [archivedContacts, setArchivedContacts] = useState<any[]>([]);
  const [archivedHistory, setArchivedHistory] = useState<any[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [metrics, setMetrics] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showContactProfile, setShowContactProfile] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'stats' | 'database'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastReadRef = useRef<Map<string, number>>(new Map());
  const lastFetchRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.bot.messages, archivedHistory, selectedContact]);

  useEffect(() => {
    if (!selectedContact) return;
    const now = Date.now();
    if (now - lastFetchRef.current < 5000) return;
    const timer = setTimeout(() => {
      fetchHistory(selectedContact);
      lastFetchRef.current = Date.now();
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.bot.messages, selectedContact]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (activeView !== 'chat') setActiveView('chat');
      else if (showMobileChat) {
        setShowMobileChat(false);
        setSelectedContact(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeView, showMobileChat]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics', { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const data = await res.json();
        setMetrics(data);
      } catch (e) {}
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const openMobileChat = (contactId: string) => {
    lastReadRef.current.set(contactId, Date.now());
    setShowContactProfile(false);
    setSelectedContact(contactId);
    if (window.innerWidth < 1024) {
      window.history.pushState({ modal: 'chat' }, '');
      setShowMobileChat(true);
    }
  };

  const closeMobileChat = () => {
    if (window.innerWidth < 1024) window.history.back();
    else { setShowMobileChat(false); setSelectedContact(null); }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['bg-[#005c4b]', 'bg-[#FF6B00]', 'bg-[#3B82F6]', 'bg-[#8b5cf6]', 'bg-[#ec4899]', 'bg-[#eab308]', 'bg-[#10b981]'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedContact) return;
    sendCommand('SEND_MESSAGE', { to: selectedContact, text: messageInput });
    setMessageInput("");
  };

  const loadArchivedContacts = async () => {
    if (archivedContacts.length === 0) setLoadingArchive(true);
    try {
      const res = await fetch('/api/contacts', { 
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setArchivedContacts(data);
    } catch (e) { 
      console.warn('⚠️ [Dashboard] Fetch failed:', e); 
    } finally { 
      setLoadingArchive(false); 
    }
  };

  const fetchHistory = async (contactId: string) => {
    try {
      const normPhone = normalizePhone(contactId);
      const client = archivedContacts.find(c => c.id === contactId || normalizePhone(c.phone || '') === normPhone);
      const clientId = client?.id || contactId;
      const res = await fetch(`/api/history/${clientId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      const data = await res.json();
      setArchivedHistory(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    setMounted(true);
    loadArchivedContacts();
    const contactsInterval = setInterval(() => { loadArchivedContacts(); }, 15000);
    return () => clearInterval(contactsInterval);
  }, []);

  const exportLeadsCSV = () => {
    const leads = archivedContacts.filter(c => c.status === 'FINAL_REPLY' || c.metadata?.bot_status === 'HANDOVER_CLIMAX' || (c.tags && c.tags.includes('lead')));
    if (leads.length === 0) { alert('No hay leads para exportar.'); return; }
    const header = 'Nombre,Teléfono,Estado,Bot Status,Fecha\n';
    const rows = leads.map(l => {
      const name = (l.name || '').replace(/,/g, ' ');
      const phone = l.phone || '';
      const status = l.status || '';
      const botStatus = l.metadata?.bot_status || '';
      const date = l.metadata?.last_activity || l.created_at || '';
      return `"${name}","${phone}","${status}","${botStatus}","${date}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 flex w-full bg-[#111b21] overflow-hidden selection:bg-orange-500/30">
      <div className={`flex w-full h-full ${activeView !== 'chat' ? 'hidden lg:flex' : ''}`}>
        <div className={`w-full lg:w-[30%] flex-col h-full border-r border-[#222d34] bg-[#111b21] pb-14 lg:pb-0 ${selectedContact && showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
          <div className="h-14 bg-[#202c33] px-2 sm:px-3 flex items-center justify-between flex-shrink-0 border-b border-[#222d34] w-full">
            <div className="flex-1 min-w-0">
              <input type="text" placeholder="Buscar conversaciones..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] outline-none text-xs sm:text-sm px-2" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-1 sm:ml-2">
              <div className="flex bg-[#111b21] rounded-full p-0.5 border border-[#222d34] items-center">
                <button onClick={() => sendCommand('STOP_BOT')} className={`px-2 py-1 rounded-full transition-all ${state.bot.paused ? 'bg-amber-500/20 text-amber-400' : 'text-[#8696a0] hover:text-amber-400'}`} title={state.bot.paused ? "Bot Pausado" : "Pausar Bot"}><Pause size={12}/></button>
                <button onClick={() => sendCommand('RESUME_BOT')} className={`px-2 py-1 rounded-full transition-all ${!state.bot.paused && state.status !== 'STOPPED' ? 'bg-green-500/20 text-green-400' : 'text-[#8696a0] hover:text-green-400'}`} title={!state.bot.paused ? "Bot Activo" : "Reanudar Bot"}><Play size={12}/></button>
                <button onClick={() => sendCommand('STOP_ALL')} className={`px-2 py-1 rounded-full flex items-center justify-center transition-all ${state.status === 'STOPPED' ? 'bg-red-500/30' : 'hover:bg-red-500/20'}`} title="Detener Todo"><div className={`w-2.5 h-2.5 rounded-sm ${state.status === 'STOPPED' ? 'bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-red-500'}`} /></button>
                <div className={`w-1.5 h-1.5 rounded-full ml-1 ${state.connected ? 'bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]' : 'bg-red-400 animate-pulse'}`} title={state.connected ? 'Conectado' : 'Desconectado'} />
              </div>
              <button onClick={exportLeadsCSV} className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-1" title="Exportar Leads CSV"><Database size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#374045] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-[#222d34] flex-shrink-0">
              {['Todos', 'Leads', 'Activos', 'Pendientes', 'Rechazados'].map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-all ${activeFilter === f ? 'bg-[#005c4b] text-white' : 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]'}`}>{f}</button>
              ))}
            </div>

            {loadingArchive && <div className="p-4 text-center text-xs text-[#8696a0] animate-pulse">Cargando...</div>}
            
            {(() => {
              const contactMap = new Map<string, { id: string; dbId: string; name: string; status: string; isLead: boolean; timestamp: number }>();
              archivedContacts.forEach(c => {
                const rawPhone = c.phone || '';
                const norm = normalizePhone(rawPhone);
                if (!norm) return;
                const wsId = rawPhone.length === 10 ? `521${rawPhone}` : rawPhone;
                contactMap.set(norm, {
                  id: wsId, dbId: c.id, name: c.name || rawPhone || 'Unknown', status: c.status || c.metadata?.bot_status || 'Archived', isLead: c.status === 'FINAL_REPLY' || c.metadata?.bot_status === 'FINAL_REPLY',
                  timestamp: c.metadata?.last_activity ? new Date(c.metadata.last_activity).getTime() : new Date(c.created_at || 0).getTime(),
                });
              });
              const livePhones = Array.from(new Set(state.bot.messages.map(m => m.phone).filter(Boolean)));
              livePhones.forEach(phone => {
                const norm = normalizePhone(phone);
                if (contactMap.has(norm)) {
                  const existing = contactMap.get(norm)!;
                  const latestMsg = state.bot.messages.find(m => normalizePhone(m.phone) === norm);
                  if (latestMsg) {
                    const msgTime = new Date(latestMsg.timestamp).getTime();
                    if (msgTime > existing.timestamp) existing.timestamp = msgTime;
                    if (existing.name === existing.id || existing.name === 'Unknown') existing.name = latestMsg.name || existing.name;
                  }
                } else {
                  const msg = state.bot.messages.find(m => m.phone === phone);
                  contactMap.set(norm, { id: phone, dbId: phone, name: msg?.name || phone, status: 'Active', isLead: false, timestamp: new Date(msg?.timestamp || 0).getTime() });
                }
              });
              const rawContacts = Array.from(contactMap.values()).sort((a, b) => b.timestamp - a.timestamp);
              const filteredContacts = rawContacts.filter(c => 
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                c.id.includes(searchQuery)
              ).filter(c => {
                if (activeFilter === 'Todos') return true;
                if (activeFilter === 'Leads') return c.isLead;
                if (activeFilter === 'Activos') return ['SENT_GREETING', 'SENT_PROPOSAL', 'SENT_CLIMAX'].includes(archivedContacts.find(ac => ac.id === c.dbId)?.metadata?.bot_status);
                if (activeFilter === 'Pendientes') return (archivedContacts.find(ac => ac.id === c.dbId)?.tags || []).includes('pendiente');
                if (activeFilter === 'Rechazados') return archivedContacts.find(ac => ac.id === c.dbId)?.metadata?.bot_status === 'REJECTED';
                return true;
              });
              if (filteredContacts.length === 0 && !loadingArchive) return <div className="p-6 text-xs text-[#8696a0] text-center">No hay chats</div>;
              return filteredContacts.map(c => {
                const isSelected = selectedContact === c.id;
                const initial = c.name ? c.name.charAt(0).toUpperCase() : '?';
                return (
                  <div key={c.id} onClick={() => { openMobileChat(c.id); fetchHistory(c.id); }} className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all border-b border-[#222d34] relative overflow-hidden ${isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}>
                    {c.isLead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-red-600 shadow-[0_0_15px_rgba(255,107,0,0.8)]" />}
                    <div className={`w-12 h-12 rounded-full ${getAvatarColor(c.name)} flex items-center justify-center flex-shrink-0 text-white font-bold text-lg shadow-sm relative ${c.isLead ? 'ml-1' : ''}`}>
                      {initial}
                      {(() => {
                        const lastRead = lastReadRef.current.get(c.id) || 0;
                        const unread = state.bot.messages.filter(m => m.direction === 'IN' && normalizePhone(m.phone) === normalizePhone(c.id) && new Date(m.timestamp).getTime() > lastRead).length;
                        return unread > 0 ? <span className="absolute -top-0.5 -right-0.5 bg-[#00a884] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{unread > 9 ? '9+' : unread}</span> : null;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-[15px] text-[#e9edef] truncate">{c.name}</span>
                        <span className="text-[11px] text-[#8696a0] ml-2 flex-shrink-0">{formatRelativeTime(c.timestamp)}</span>
                      </div>
                      <span className="text-[13px] text-[#8696a0] truncate block">
                        {(() => {
                          const lastLive = [...state.bot.messages].reverse().find(m => normalizePhone(m.phone) === normalizePhone(c.id));
                          return lastLive ? `${lastLive.direction === 'OUT' ? '✓ ' : ''}${lastLive.text.substring(0, 45)}` : c.status;
                        })()}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className={`w-full lg:w-[70%] flex-col h-full bg-[#0b141a] relative pb-14 lg:pb-0 ${!showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
          {!selectedContact ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#222d34] text-center p-8">
              <Bot size={64} className="text-[#8696a0] mb-6 opacity-30" />
              <h2 className="text-[#e9edef] text-3xl font-light mb-4">WatchTower Web</h2>
              <p className="text-[#8696a0] text-sm max-w-md">Envía y recibe mensajes sin necesidad de mantener tu teléfono conectado al servidor local.</p>
              <p className="text-[#8696a0] text-sm mt-8 flex items-center gap-2"><Check size={16}/> Cifrado de extremo a extremo simulado</p>
            </div>
          ) : (
            <>
              <div className="h-16 bg-[#202c33] px-4 flex items-center justify-between z-10 flex-shrink-0">
                {(() => {
                  const normSelected = normalizePhone(selectedContact);
                  const client = archivedContacts.find(c => c.id === selectedContact || normalizePhone(c.phone || '') === normSelected);
                  const displayName = client?.name || state.bot.messages.find(m => normalizePhone(m.phone) === normSelected)?.name || selectedContact || 'Desconocido';
                  const isCurrentLead = client?.status === 'FINAL_REPLY' || client?.metadata?.bot_status === 'FINAL_REPLY';
                  const botStatus = client?.metadata?.bot_status;
                  const isBotActive = botStatus === 'SENT_GREETING' || botStatus === 'SENT_PROPOSAL' || botStatus === 'SENT_CLIMAX';
                  const actualId = client?.id || selectedContact;
                  return (
                    <>
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowContactProfile(!showContactProfile)}>
                        <ArrowLeft size={20} className="text-[#8696a0] lg:hidden mr-1" onClick={(e) => { e.stopPropagation(); closeMobileChat(); }} />
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor(displayName)} flex items-center justify-center text-white font-bold shadow-sm`}>{displayName.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0 mr-2">
                          <span className="text-[#e9edef] font-medium block truncate">{displayName}</span>
                          {client && <span className="text-[#8696a0] text-[11px] block truncate">{isCurrentLead ? 'Lead Activo' : 'Archivo histórico'}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-[#8696a0] flex-shrink-0">
                        {/* Toggle 1: Bot IA (existente) — estilo iOS switch */}
                        <div className="flex items-center gap-1.5" title={isBotActive ? "IA Activa — click para pausar" : "IA Pausada — click para activar"}>
                          <Bot size={14} className={isBotActive ? 'text-sky-400' : 'text-[#8696a0]'} />
                          <button
                            onClick={() => sendCommand('TOGGLE_BOT_STATUS', { contactId: actualId, enable: !isBotActive })}
                            className={`relative w-[42px] h-[24px] rounded-full transition-all duration-300 ease-in-out cursor-pointer ${isBotActive ? 'bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.4)]' : 'bg-[#39454d]'}`}
                          >
                            <span className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${isBotActive ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Separador visual */}
                        <div className="w-px h-5 bg-[#374045]" />

                        {/* Toggle 2: Telegram CRM Bridge (NUEVO) — estilo iOS switch */}
                        {(() => {
                          const hasTelegramBridge = !!(client?.metadata?.telegram_thread_id);
                          return (
                            <div className="flex items-center gap-1.5" title={hasTelegramBridge ? "Telegram CRM activo — click para desactivar" : "Telegram CRM inactivo — click para activar puente"}>
                              <MessageSquare size={14} className={hasTelegramBridge ? 'text-green-400' : 'text-[#8696a0]'} />
                              <button
                                onClick={() => sendCommand('TOGGLE_TELEGRAM_CRM', { contactId: actualId, enable: !hasTelegramBridge })}
                                className={`relative w-[42px] h-[24px] rounded-full transition-all duration-300 ease-in-out cursor-pointer ${hasTelegramBridge ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-[#39454d]'}`}
                              >
                                <span className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${hasTelegramBridge ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                              </button>
                            </div>
                          );
                        })()}

                        {/* Separador visual */}
                        <div className="w-px h-5 bg-[#374045]" />

                        {/* Botón Lead Star (sin cambios) */}
                        <button onClick={() => sendCommand(isCurrentLead ? 'UNMARK_LEAD' : 'MARK_LEAD', { contactId: actualId })} className={`cursor-pointer transition-all p-1 ${isCurrentLead ? 'text-orange-500 hover:text-orange-400' : 'text-[#8696a0] hover:text-[#e9edef]'}`} title={isCurrentLead ? "Quitar de Leads" : "Marcar como Lead"}>{isCurrentLead ? <Star fill="currentColor" size={20} /> : <Star size={20} />}</button>
                        <MoreVertical size={20} className="cursor-pointer ml-0.5" />
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-1.5 z-0 bg-doodle bg-[#0b141a] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#374045] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {(() => {
                  let allMessages = archivedHistory.map(m => ({ isOut: m.role === 'bot', text: m.message, time: new Date(m.created_at || (m.wa_timestamp ? m.wa_timestamp * 1000 : Date.now())) }));
                  const normSelected = normalizePhone(selectedContact);
                  const liveMsgs = state.bot.messages.filter(m => normalizePhone(m.phone) === normSelected).map(m => ({ isOut: m.direction === 'OUT', text: m.text, time: new Date(m.timestamp) }));
                  const combined = [...allMessages];
                  liveMsgs.forEach(lm => { if (!combined.some(cm => cm.isOut === lm.isOut && cm.text === lm.text && Math.abs(cm.time.getTime() - lm.time.getTime()) < 120000)) combined.push(lm); });
                  combined.sort((a, b) => a.time.getTime() - b.time.getTime());
                  return combined.map((m, i, arr) => {
                    const showTail = i === 0 || arr[i - 1].isOut !== m.isOut;
                    return (
                      <div key={i} className={`flex ${m.isOut ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-2.5 py-1.5 text-[14.2px] leading-[1.4] text-[#e9edef] shadow-sm ${m.isOut ? 'bg-[#005c4b] rounded-lg' : 'bg-[#202c33] rounded-lg'} ${showTail && m.isOut ? 'msg-tail-out rounded-tr-none' : ''} ${showTail && !m.isOut ? 'msg-tail-in rounded-tl-none' : ''}`}>
                          <span className="mr-14 whitespace-pre-wrap">{m.text}</span>
                          <div className="float-right ml-3 mt-1.5 flex items-center gap-1 text-[11px] text-[#8696a0]">
                            <span>{m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {m.isOut && <CheckCheck size={14} className="text-[#53bdeb]" />}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              <div className="h-[62px] bg-[#202c33] flex items-center px-4 gap-4 z-10 flex-shrink-0">
                <Smile size={24} className="text-[#8696a0] cursor-pointer" />
                <Paperclip size={24} className="text-[#8696a0] cursor-pointer" />
                <div className="flex-1">
                  <input type="text" placeholder="Escribe un mensaje" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }} className="w-full bg-[#2a3942] rounded-lg px-4 py-2.5 text-[15px] text-[#e9edef] outline-none placeholder-[#8696a0]" />
                </div>
                {messageInput.trim() ? <Send size={24} className="text-[#8696a0] cursor-pointer" onClick={handleSendMessage} /> : <Bot size={24} className="text-[#8696a0] cursor-pointer" />}
              </div>
            </>
          )}
        </div>

        {showContactProfile && (() => {
          const normSel = selectedContact ? normalizePhone(selectedContact) : '';
          const profileClient = archivedContacts.find(c => c.id === selectedContact || normalizePhone(c.phone || '') === normSel);
          if (!profileClient) return null;
          const pBotStatus = profileClient.metadata?.bot_status || 'N/A';
          const pTags: string[] = Array.isArray(profileClient.tags) ? (profileClient.tags as string[]) : [];
          const pCreated = profileClient.created_at ? new Date(profileClient.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
          const pLastActivity = profileClient.metadata?.last_activity ? new Date(profileClient.metadata.last_activity).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A';

          return (
            <div className="absolute inset-0 bg-[#111b21] z-[60] flex flex-col animate-slide-up overflow-y-auto">
              <div className="bg-[#202c33] p-6 flex flex-col items-center gap-3 border-b border-[#222d34]">
                <button onClick={() => setShowContactProfile(false)} className="self-start text-[#8696a0] hover:text-white mb-2"><ArrowLeft size={20} /></button>
                <div className={`w-20 h-20 rounded-full ${getAvatarColor(profileClient.name)} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>{(profileClient.name || '?').charAt(0).toUpperCase()}</div>
                <h3 className="text-[#e9edef] text-lg font-semibold">{profileClient.name}</h3>
                <p className="text-[#8696a0] text-sm font-mono select-all">+{profileClient.phone?.length === 10 ? `52${profileClient.phone}` : profileClient.phone}</p>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-[#202c33] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center"><span className="text-[#8696a0] text-xs uppercase tracking-wider">Estado Pipeline</span><span className="text-[#e9edef] text-sm font-medium">{profileClient.status}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[#8696a0] text-xs uppercase tracking-wider">Bot Status</span><span className={`text-sm font-medium ${pBotStatus === 'HANDOVER_CLIMAX' ? 'text-green-400' : pBotStatus === 'REJECTED' ? 'text-red-400' : 'text-[#e9edef]'}`}>{pBotStatus}</span></div>
                  <div className="flex justify-between items-center border-t border-[#222d34] pt-2"><span className="text-[#8696a0] text-xs uppercase tracking-wider">Categoría</span><span className="text-[#e9edef] text-sm truncate max-w-[60%]">{profileClient.metadata?.google_category || 'N/A'}</span></div>
                </div>

                {(profileClient.metadata?.rating || profileClient.metadata?.review_count) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#202c33] rounded-xl p-3 text-center border border-[#222d34]"><p className="text-orange-400 text-lg font-black">{profileClient.metadata?.rating || '0'}</p><p className="text-[#8696a0] text-[9px] font-bold uppercase tracking-widest mt-0.5">Rating</p></div>
                    <div className="bg-[#202c33] rounded-xl p-3 text-center border border-[#222d34]"><p className="text-[#e9edef] text-lg font-bold">{profileClient.metadata?.review_count || '0'}</p><p className="text-[#8696a0] text-[9px] font-bold uppercase tracking-widest mt-0.5">Reviews</p></div>
                  </div>
                )}

                <div className="space-y-2">
                  {profileClient.metadata?.listing_url && (
                    <a href={profileClient.metadata.listing_url} target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-[#005c4b] hover:bg-[#00a884] text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg"><Database size={14} />Ver en Google Maps</a>
                  )}
                  {profileClient.metadata?.website_url && (
                    <a href={profileClient.metadata.website_url.startsWith('http') ? profileClient.metadata.website_url : `https://${profileClient.metadata.website_url}`} target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-[#222d34]"><Activity size={14} />Visitar Sitio Web</a>
                  )}
                </div>

                <div className="bg-[#202c33] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center"><span className="text-[#8696a0] text-xs uppercase tracking-wider">Creado</span><span className="text-[#e9edef] text-sm">{pCreated}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[#8696a0] text-xs uppercase tracking-wider">Última Actividad</span><span className="text-[#e9edef] text-sm">{pLastActivity}</span></div>
                  {profileClient.address && <div className="flex justify-between items-center"><span className="text-[#8696a0] text-xs uppercase tracking-wider">Dirección</span><span className="text-[#e9edef] text-[11px] text-right max-w-[60%] leading-tight">{profileClient.address}</span></div>}
                </div>

                {pTags.length > 0 && (
                  <div className="bg-[#202c33] rounded-xl p-4">
                    <p className="text-[#8696a0] text-xs uppercase tracking-wider mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">{pTags.map(t => <span key={t} className="px-2.5 py-1 rounded-full text-[11px] bg-[#005c4b]/30 text-[#00a884] border border-[#005c4b]/50">{t}</span>)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {state.gate?.pending && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-xl">
            <div className="bento-card w-full max-w-2xl overflow-hidden border-orange-500/30 shadow-[0_0_50px_rgba(255,107,0,0.15)]">
              <div className="p-8 bg-gradient-to-r from-orange-500/10 to-transparent border-b border-orange-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div><h2 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight">Intervention Required</h2><p className="text-orange-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">Gate Protocol {state.gate.id} • AI Confidence Audit</p></div>
                <div className="w-16 h-16 rounded-2xl bg-orange-500 flex flex-col items-center justify-center text-white flex-shrink-0 shadow-[0_0_20px_rgba(255,107,0,0.4)]"><span className="text-2xl font-black font-heading">{state.gate.report?.score}</span><span className="text-[8px] font-bold uppercase tracking-widest">Score</span></div>
              </div>
              <div className="p-8 space-y-8 bg-[#020617]/50">
                <div className="space-y-4"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Bot size={16} className="text-orange-500" /> AI Reasoning</h4><div className="p-5 bg-slate-900/50 rounded-2xl border border-white/5"><p className="text-sm font-medium text-slate-300 leading-relaxed">{state.gate.report?.recommendation}</p></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <button onClick={() => sendCommand('GATE_REJECT', { gate: state.gate?.id })} className="py-4 bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl font-bold uppercase tracking-widest text-xs transition-all border border-slate-800 hover:border-red-500/30">Reject & Exit</button>
                  <button onClick={() => sendCommand('GATE_APPROVE', { gate: state.gate?.id })} className="py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:shadow-[0_0_30px_rgba(255,107,0,0.5)]">Approve Protocol</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#202c33] border-t border-[#222d34] flex items-center justify-around z-50 lg:hidden safe-area-bottom">
        <button onClick={() => setActiveView('chat')} className={`flex flex-col items-center gap-0.5 px-6 py-1 transition-all ${activeView === 'chat' ? 'text-[#00a884]' : 'text-[#8696a0]'}`}><RadioTower size={20} /><span className="text-[10px] font-medium">Chat</span></button>
        <button onClick={() => setActiveView('stats')} className={`flex flex-col items-center gap-0.5 px-6 py-1 transition-all ${activeView === 'stats' ? 'text-[#00a884]' : 'text-[#8696a0]'}`}><Activity size={20} /><span className="text-[10px] font-medium">Stats</span></button>
        <button onClick={() => setActiveView('database')} className={`flex flex-col items-center gap-0.5 px-6 py-1 transition-all ${activeView === 'database' ? 'text-[#00a884]' : 'text-[#8696a0]'}`}><Database size={20} /><span className="text-[10px] font-medium">Datos</span></button>
      </div>
    </div>
  );
}
