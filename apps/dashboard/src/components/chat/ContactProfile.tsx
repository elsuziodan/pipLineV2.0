import { 
  ArrowLeft, 
  Database, 
  Activity, 
  Terminal,
  Code2,
  Box
} from "lucide-react";

export function ContactProfile({ client, onClose }: any) {
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-40 bg-[#080808] font-mono text-[10px] text-[#4A4D54] uppercase tracking-widest animate-pulse">
        <Database size={20} className="mb-4 opacity-20" />
        Sincronizando_Datos...
      </div>
    );
  }

  const pBotStatus = client.metadata?.bot_status || 'NULL';
  const pTags: string[] = Array.isArray(client.tags) ? client.tags : [];
  const pCreated = client.created_at ? new Date(client.created_at).toISOString() : 'NULL';
  const pLastActivity = client.metadata?.last_activity ? new Date(client.metadata.last_activity).toISOString() : 'NULL';
  const shortId = client.id?.toString().slice(-8) || '00000000';

  return (
    <div className="flex flex-col h-full bg-[#080808] font-mono select-text overflow-y-auto pb-10">
      {/* Header Inspector */}
      <div className="bg-[#0D0D0D] p-6 border-b border-[#1A1B1E] shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Box size={14} className="text-[#4A4D54]" />
            <span className="text-[10px] text-[#4A4D54] uppercase tracking-widest font-bold">inspect::client_data.json</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
             <span className="text-amber-500 text-sm">const</span>
             <span className="text-[#79C0FF] text-sm">CLIENT_NAME</span>
             <span className="text-white text-sm">=</span>
             <span className="text-[#A5D6FF] text-sm">&quot;{client.name}&quot;;</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#4A4D54]">
             <span className="opacity-50">uuid::</span>
             <span>{client.id}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Action Macros (PRIORITY ALPHA) */}
        <section className="space-y-3">
          <h4 className="text-[10px] text-[#4A4D54] uppercase tracking-[0.3em] font-bold mb-4">Quick_Actions</h4>
          {client.metadata?.listing_url && (
            <a 
              href={client.metadata.listing_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full py-3 bg-transparent border border-[#1A1B1E] hover:border-amber-500/50 hover:text-amber-500 text-[#E1E2E4] rounded-sm font-bold uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-3"
            >
              <Box size={12} className="text-amber-500" /> EXEC::OPEN_GOOGLE_MAPS
            </a>
          )}
          {client.metadata?.website_url && (
            <a 
              href={client.metadata.website_url.startsWith('http') ? client.metadata.website_url : `https://${client.metadata.website_url}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`w-full py-3 bg-transparent border border-[#1A1B1E] hover:border-sky-500/50 hover:text-sky-400 text-[#E1E2E4] rounded-sm font-bold uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-3 ${!client.metadata?.website_url ? 'opacity-30 grayscale pointer-events-none' : ''}`}
            >
              <Code2 size={12} className="text-sky-400" /> EXEC::BROWSE_WEBSITE
            </a>
          )}
        </section>

        {/* Properties Block */}
        <section>
          <h4 className="text-[10px] text-[#4A4D54] uppercase tracking-[0.3em] font-bold mb-4">Properties</h4>
          <div className="bg-[#0D0D0D] border border-[#1A1B1E] rounded-sm p-4 space-y-2 text-[12px]">
            <div className="flex gap-2">
              <span className="text-orange-400">&quot;status&quot;:</span>
              <span className="text-[#A5D6FF]">&quot;{client.status}&quot;</span>
              <span className="text-[#4A4D54]">,</span>
            </div>
            <div className="flex gap-2">
              <span className="text-orange-400">&quot;phone&quot;:</span>
              <span className="text-[#A5D6FF]">&quot;+{client.phone}&quot;</span>
              <span className="text-[#4A4D54]">,</span>
            </div>
            <div className="flex gap-2">
              <span className="text-orange-400">&quot;bot_engine&quot;:</span>
              <span className={`${pBotStatus === 'HANDOVER_CLIMAX' ? 'text-[#00FF41]' : 'text-sky-400'}`}>&quot;{pBotStatus}&quot;</span>
              <span className="text-[#4A4D54]">,</span>
            </div>
            <div className="flex gap-2">
              <span className="text-orange-400">&quot;category&quot;:</span>
              <span className="text-[#A5D6FF]">&quot;{client.metadata?.google_category || 'UNKNOWN'}&quot;</span>
            </div>
          </div>
        </section>

        {/* Intelligence / Rating */}
        {(client.metadata?.rating || client.metadata?.review_count) && (
          <section>
            <h4 className="text-[10px] text-[#4A4D54] uppercase tracking-[0.3em] font-bold mb-4">Intelligence::Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0D0D0D] border border-[#1A1B1E] p-4 rounded-sm">
                <div className="text-amber-500 text-xl font-bold">{client.metadata?.rating || '0'}</div>
                <div className="text-[8px] text-[#4A4D54] uppercase font-bold tracking-widest mt-1">confidence_rating</div>
              </div>
              <div className="bg-[#0D0D0D] border border-[#1A1B1E] p-4 rounded-sm">
                <div className="text-[#E1E2E4] text-xl font-bold">{client.metadata?.review_count || '0'}</div>
                <div className="text-[8px] text-[#4A4D54] uppercase font-bold tracking-widest mt-1">data_points</div>
              </div>
            </div>
          </section>
        )}

        {/* Address / Comments */}
        {client.address && (
          <section>
             <h4 className="text-[10px] text-[#4A4D54] uppercase tracking-[0.3em] font-bold mb-4">Comments</h4>
             <div className="text-[#4A4D54] text-[11px] leading-relaxed italic border-l-2 border-[#1A1B1E] pl-4">
               /*<br />
               &nbsp;* LOCATION_DATA: {client.address}<br />
               &nbsp;*/
             </div>
          </section>
        )}

        {/* Meta Metadata */}
        <section className="bg-[#0D0D0D] border border-[#1A1B1E] p-4 rounded-sm space-y-3 opacity-60">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#4A4D54]">CREATED_AT</span>
            <span className="text-[#E1E2E4]">{pCreated}</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-[#4A4D54]">LAST_PATCH</span>
            <span className="text-[#E1E2E4]">{pLastActivity}</span>
          </div>
        </section>

        {/* Tags Array */}
        {pTags.length > 0 && (
          <section>
            <p className="text-[10px] text-[#4A4D54] uppercase tracking-[0.3em] font-bold mb-4">Tags</p>
            <div className="flex flex-wrap gap-2">
              {pTags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-sm text-[9px] bg-[#1A1B1E] border border-[#26282B] text-[#8A8F98]">
                  &quot;{t}&quot;
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
