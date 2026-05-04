import { useRef, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import { Terminal, Send, Bot, TerminalSquare } from "lucide-react";
import { ChatBubble } from "./ChatBubble";

export function ChatConversation({ 
  messages, 
  onSendMessage, 
  onLoadMore,
  loading,
  isInitialLoad,
  messageInput,
  setMessageInput
}: any) {
  const virtuosoRef = useRef<any>(null);

  useEffect(() => {
    if (virtuosoRef.current && !loading) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        behavior: "auto",
      });
    }
  }, [isInitialLoad, messages.length, loading]);

  if (!messages || messages.length === 0) {
    if (loading && isInitialLoad) {
        return <div className="flex-1 flex items-center justify-center bg-[#080808] text-[#4A4D54] font-mono">Initializing_Auditor_Stream...</div>;
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#080808] text-center p-8 font-mono border-l border-[#1A1B1E]">
        <TerminalSquare size={64} className="text-[#1A1B1E] mb-6" />
        <h2 className="text-[#4A4D54] text-xl font-bold uppercase tracking-widest mb-4">No_Data_Stream</h2>
        <p className="text-[#4A4D54] text-[11px] max-w-md uppercase tracking-tighter">Waiting for incoming WhatsApp signals to populate buffer.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#080808] overflow-hidden relative border-l border-[#1A1B1E]">
      <div className="flex-1 overflow-hidden">
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          initialTopMostItemIndex={messages.length - 1}
          startReached={onLoadMore}
          increaseViewportBy={200}
          itemContent={(index, msg) => <ChatBubble key={index} message={msg} />}
          className="h-full pt-4 pb-2 custom-scrollbar"
          followOutput="smooth"
        />
      </div>

      {/* Terminal Input Area */}
      <div className="bg-[#0A0A0A] border-t border-[#1A1B1E] px-4 py-3 pb-20 md:pb-3 z-10 flex-shrink-0 font-mono">
        <div className="flex items-center gap-3 bg-[#080808] border border-[#1A1B1E] rounded px-4 py-2.5 focus-within:border-[#00FF41]/50 focus-within:shadow-[0_0_15px_rgba(0,255,65,0.1)] transition-all">
          <span className="text-[#00FF41] font-bold text-sm select-none drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]">&gt;</span>
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="inject_message..." 
              value={messageInput} 
              onChange={(e) => setMessageInput(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') onSendMessage(); }} 
              className="w-full bg-transparent text-[14px] text-[#E1E2E4] outline-none placeholder-[#4A4D54]" 
            />
            {!messageInput && (
              <span className="absolute left-0 top-0 text-[#4A4D54] pointer-events-none animate-pulse">_</span>
            )}
          </div>
          <button 
            onClick={onSendMessage}
            disabled={!messageInput.trim()}
            className={`transition-all ${messageInput.trim() ? 'text-[#00FF41] opacity-100' : 'text-[#4A4D54] opacity-50'}`}
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-1.5 flex justify-between px-1">
           <span className="text-[8px] text-[#4A4D54] uppercase tracking-widest font-bold">Enc_RSA_AES_256</span>
           <span className="text-[8px] text-[#4A4D54] uppercase tracking-widest font-bold">Stream::Active</span>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1A1B1E;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
