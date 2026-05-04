import { CheckCheck, FileIcon, ImageIcon, Music, AlertTriangle, Video } from "lucide-react";

export function ChatBubble({ message }: any) {
  const isOut = message.role === 'bot';
  const time = new Date(message.created_at || (message.wa_timestamp * 1000) || Date.now());
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const msgText = message.message || '';
  const isAudio = message.media_type === 'audio' || msgText.includes('[MEDIA:AUDIO]') || msgText.includes('[MULTIMEDIA: AUDIO]');
  const isImage = message.media_type === 'image' || msgText.includes('[MEDIA:IMAGE]') || msgText.includes('[MULTIMEDIA: IMAGE]');
  const isVideo = message.media_type === 'video' || msgText.includes('[MEDIA:VIDEO]') || msgText.includes('[MULTIMEDIA: VIDEO]');

  const renderContent = () => {
    try {
      if (isAudio) {
        const url = message.media_url || msgText.match(/https?:\/\/[^\s\]]+/)?.[0];
        return (
          <div className={`flex flex-col gap-2 mt-1 border p-3 rounded-sm font-mono ${isOut ? 'bg-[#00FF41]/5 border-[#00FF41]/20' : 'bg-[#79C0FF]/5 border-[#79C0FF]/20'}`}>
            <div className="flex items-center gap-2 text-[10px] text-[#4A4D54] mb-1">
              <Music size={12} />
              <span className="uppercase tracking-widest font-bold">FILE::VOICE_NOTE.ogg</span>
            </div>
            {url ? (
              <audio controls src={url} className="w-full h-8 invert opacity-50 hover:opacity-80 transition-opacity" preload="none" />
            ) : (
              <div className="text-[10px] text-red-500/50 italic py-2 border border-red-500/10 px-2 rounded-sm bg-red-500/5">
                &lt; ERROR: MEDIA_STREAM_UNAVAILABLE &gt;
              </div>
            )}
          </div>
        );
      }

      if (isImage) {
        const url = message.media_url || msgText.match(/https?:\/\/[^\s\]]+/)?.[0];
        return (
          <div className={`flex flex-col gap-2 mt-1 border p-2 rounded-sm font-mono max-w-sm ${isOut ? 'bg-[#00FF41]/5 border-[#00FF41]/20' : 'bg-[#79C0FF]/5 border-[#79C0FF]/20'}`}>
            <div className="flex items-center gap-2 text-[10px] text-[#4A4D54] mb-2">
              <ImageIcon size={12} />
              <span className="uppercase tracking-widest font-bold">FILE::IMAGE_DATA.jpg</span>
            </div>
            {url ? (
              <img 
                src={url} 
                alt="Log Media" 
                className="rounded-sm w-full object-cover cursor-pointer hover:opacity-90 transition-opacity border border-[#1A1B1E]" 
                onClick={() => window.open(url, '_blank')}
              />
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center border border-red-500/10 rounded-sm bg-red-500/5 text-red-500/50">
                <ImageIcon size={24} className="mb-2 opacity-20" />
                <span className="text-[8px] uppercase tracking-widest font-bold">&lt; ERROR: UPLOAD_FAILED_ON_SOURCE &gt;</span>
              </div>
            )}
          </div>
        );
      }

      if (isVideo) {
        const url = message.media_url || msgText.match(/https?:\/\/[^\s\]]+/)?.[0];
        return (
          <div className={`flex flex-col gap-2 mt-1 border p-2 rounded-sm font-mono max-w-sm ${isOut ? 'bg-[#00FF41]/5 border-[#00FF41]/20' : 'bg-[#79C0FF]/5 border-[#79C0FF]/20'}`}>
            <div className="flex items-center gap-2 text-[10px] text-[#4A4D54] mb-2">
              <Video size={12} />
              <span className="uppercase tracking-widest font-bold">FILE::VIDEO_DATA.mp4</span>
            </div>
            {url ? (
              <video 
                src={url} 
                controls
                className="rounded-sm w-full object-cover cursor-pointer border border-[#1A1B1E]" 
              />
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center border border-red-500/10 rounded-sm bg-red-500/5 text-red-500/50">
                <Video size={24} className="mb-2 opacity-20" />
                <span className="text-[8px] uppercase tracking-widest font-bold">&lt; ERROR: UPLOAD_FAILED_ON_SOURCE &gt;</span>
              </div>
            )}
          </div>
        );
      }

      return (
        <div className={`mt-1 p-2.5 rounded-sm border ${isOut ? 'bg-[#00FF41]/5 border-[#00FF41]/20' : 'bg-[#79C0FF]/5 border-[#79C0FF]/20'}`}>
          <span className="text-[13px] leading-[1.6] whitespace-pre-wrap break-words">
            {msgText}
          </span>
        </div>
      );
    } catch (err) {
      // Fallback: nunca crashear toda la conversación por una burbuja
      return (
        <div className="mt-1 p-2.5 rounded-sm border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-500/50 text-[10px]">
            <AlertTriangle size={12} />
            <span className="uppercase tracking-widest font-bold">RENDER_ERROR</span>
          </div>
          <span className="text-[11px] text-[#4A4D54] break-words">{msgText}</span>
        </div>
      );
    }
  };

  return (
    <div className="group flex flex-col mb-4 px-4 font-mono">
      <div className="flex items-start gap-2">
        {/* Timestamp */}
        <span className="text-[#4A4D54] text-[11px] mt-0.5 shrink-0">
          [{timeStr}]
        </span>

        {/* Identity & Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold tracking-tighter ${isOut ? 'text-[#00FF41]' : 'text-[#79C0FF]'}`}>
              {isOut ? 'BOT::SEBASTIAN' : 'USR::CLIENT'}
            </span>
            <span className="text-[#4A4D54] text-[11px]">{isOut ? '→' : '←'}</span>
            {isOut && <CheckCheck size={12} className="text-[#00FF41] opacity-50" />}
          </div>
          
          <div className={`mt-0 text-[#E1E2E4] relative ${isOut ? 'opacity-90' : 'opacity-100'}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
