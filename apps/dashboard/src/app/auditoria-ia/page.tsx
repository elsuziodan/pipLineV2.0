"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePipelineWS } from "@/hooks/usePipelineWS";
import { useChat } from "@/hooks/useChat";
import { ChatContactList } from "@/components/chat/ChatContactList";
import { ChatConversation } from "@/components/chat/ChatConversation";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ContactProfile } from "@/components/chat/ContactProfile";
import { GateIntervention } from "@/components/chat/GateIntervention";
import { Drawer } from "vaul";
import { Bot } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Suspense } from "react";

function ChatDashboardContent() {
  const { state, sendCommand } = usePipelineWS();
  const searchParams = useSearchParams();
  const selectId = searchParams.get('select');

  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [archivedContacts, setArchivedContacts] = useState<any[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [specificClient, setSpecificClient] = useState<any>(null);
  const [loadingSpecific, setLoadingSpecific] = useState(false);

  const lastReadRef = useRef<Map<string, number>>(new Map());

  const { 
    messages, 
    loading: loadingChat, 
    isInitialLoad,
    loadMore, 
    botPaused,
    connected
  } = useChat(selectedContact);

  // Handle deep linking from Kanban
  useEffect(() => {
    if (selectId && archivedContacts.length > 0) {
      const contact = archivedContacts.find(c => c.id.toString() === selectId || c.phone === selectId);
      if (contact) {
        handleSelectContact(contact.id);
        // Clear param to avoid re-triggering on refresh
        window.history.replaceState({}, '', '/auditoria-ia');
      }
    }
  }, [selectId, archivedContacts]);

  // Initial fetch of contacts
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingArchive(true);
      try {
        const res = await fetch('/api/contacts', { 
          cache: 'no-store',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const data = await res.json();
        setArchivedContacts(data || []);
      } catch (e) {
        console.error("[ChatDashboard] Error fetching contacts:", e);
      } finally {
        setLoadingArchive(false);
      }
    };
    fetchContacts();
  }, []);

  // Fetch specific client data if not in archived list
  useEffect(() => {
    const fetchSpecific = async () => {
      if (!selectedContact) return;
      const alreadyInList = archivedContacts.find(c => c.id === selectedContact || c.phone === selectedContact);
      if (alreadyInList) {
        setSpecificClient(null);
        return;
      }

      setLoadingSpecific(true);
      try {
        const res = await fetch(`/api/client/${selectedContact}`, { 
          cache: 'no-store',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          setSpecificClient(data);
        }
      } catch (e) {
        console.error("[ChatDashboard] Error fetching specific client:", e);
      } finally {
        setLoadingSpecific(false);
      }
    };
    fetchSpecific();
  }, [selectedContact, archivedContacts]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedContact) return;
    sendCommand('SEND_MESSAGE', { 
      to: selectedContact, 
      text: messageInput 
    });
    setMessageInput("");
  };

  const handleSelectContact = (id: string) => {
    setSelectedContact(id);
    if (!showMobileChat) {
      window.history.pushState({ chatOpen: true }, '', window.location.href);
    }
    setShowMobileChat(true);
    lastReadRef.current.set(id, Date.now());
  };

  // Interceptar el botón "Atrás" nativo del teléfono
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (showMobileChat) {
        setShowMobileChat(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showMobileChat]);

  // Actualizar el botón "Atrás" de la interfaz para que haga pop en el historial
  const handleUIBack = () => {
    if (window.history.state?.chatOpen) {
      window.history.back(); // Esto disparará popstate y ocultará el chat
    } else {
      setShowMobileChat(false);
    }
  };


  const exportLeadsCSV = useCallback(() => {
    const leads = archivedContacts.filter(c => c.status === 'LEAD' || c.status === 'FINAL_REPLY');
    if (leads.length === 0) return alert("No hay leads para exportar");
    
    const headers = "ID,Nombre,Telefono,Status,Fecha\n";
    const rows = leads.map(c => `${c.id},${c.name},${c.phone},${c.status},${c.created_at}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_7factor_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }, [archivedContacts]);

  const selectedClientData = specificClient || archivedContacts.find(c => c.id === selectedContact || c.phone === selectedContact);

  return (
    <div className="flex h-full bg-[#080808] overflow-hidden select-none font-mono">
      {/* Contact List (Left Sidebar) */}
      <div className={`w-full lg:w-[30%] flex flex-col h-full border-r border-[#1A1B1E] bg-[#080808] ${selectedContact && showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        <ChatContactList 
          contacts={archivedContacts}
          liveMessages={state.bot.messages}
          selectedContact={selectedContact}
          onSelect={handleSelectContact}
          botPaused={state.bot.paused}
          connected={state.connected}
          onCommand={sendCommand}
          onExportLeads={exportLeadsCSV}
          loading={loadingArchive}
          lastReadRef={lastReadRef}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-full relative min-w-0 overflow-hidden ${!selectedContact || !showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            <ChatHeader 
              client={selectedClientData}
              selectedContact={selectedContact}
              onBack={handleUIBack}
              onToggleBot={(id: string, active: boolean) => sendCommand('TOGGLE_BOT', { id, active })}
              onToggleCrm={(id: string, active: boolean) => sendCommand('TOGGLE_CRM', { id, active })}
              onToggleLead={(id: string, active: boolean) => sendCommand('TOGGLE_LEAD', { id, active })}
              onShowProfile={() => setShowProfile(true)}
              isBotActive={!state.bot.paused}
              isLead={selectedClientData?.status === 'LEAD' || selectedClientData?.status === 'FINAL_REPLY'}
            />
            
            <ChatConversation 
              messages={messages}
              onSendMessage={handleSendMessage}
              onLoadMore={loadMore}
              loading={loadingChat}
              isInitialLoad={isInitialLoad}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
            />

            {/* Profile Drawer (Mobile & Desktop) */}
            <Drawer.Root open={showProfile} onOpenChange={setShowProfile}>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" />
                <Drawer.Content className="bg-[#0D0D0D] border-t border-[#1A1B1E] flex flex-col rounded-t-[10px] h-[90%] mt-24 fixed bottom-0 left-0 right-0 z-[70] outline-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                  <div className="mx-auto w-16 h-1.5 flex-shrink-0 rounded-full bg-[#26282B] my-4" />
                  <div className="px-6 mb-2">
                    <Drawer.Title className="font-mono text-[10px] text-[#4A4D54] uppercase tracking-widest font-bold">
                      Data::Client_Profile
                    </Drawer.Title>
                    <Drawer.Description className="sr-only">
                      Detalles completos del cliente y estado del bot.
                    </Drawer.Description>
                  </div>
                  <ContactProfile 
                    client={selectedClientData} 
                  />
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#080808] text-center p-8">
            <div className="w-20 h-20 bg-[#0A0A0A] border border-[#1A1B1E] rounded-xl flex items-center justify-center mb-8 shadow-2xl">
              <Bot size={40} className="text-[#1A1B1E]" />
            </div>
            <h2 className="text-[#E1E2E4] text-xl font-bold uppercase tracking-[0.4em] mb-4">Seven_Factor::Hub</h2>
            <p className="text-[#4A4D54] text-[10px] max-w-xs uppercase tracking-widest leading-relaxed">
              System idling... select a lead from the explorer to begin real-time audit session.
            </p>
          </div>
        )}
      </div>

      {/* Intervention Modal */}
      {state.gate?.pending && (
        <GateIntervention 
          gate={state.gate}
          onReject={() => sendCommand('GATE_REJECT', { gate: state.gate?.id })}
          onApprove={() => sendCommand('GATE_APPROVE', { gate: state.gate?.id })}
        />
      )}
    </div>
  );
}

export default function ChatDashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full bg-[#080808]">
        <div className="text-[#4A4D54] text-[10px] uppercase font-mono tracking-widest animate-pulse">Loading_Stream...</div>
      </div>
    }>
      <ChatDashboardContent />
    </Suspense>
  );
}
