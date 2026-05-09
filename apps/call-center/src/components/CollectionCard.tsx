import { useState } from 'react';
import { CollectionClient, getDaysSinceLastContact } from '@/hooks/useCollection';
import { PhoneOutgoing, MessageCircle, CheckCircle2, ChevronDown, ChevronUp, DollarSign, CornerUpLeft } from 'lucide-react';
import { CollectionPopover } from './CollectionPopover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CollectionCardProps {
  client: CollectionClient;
  onAddEntry: (id: string, result: 'answered' | 'no_answer' | 'promise', note: string) => void;
  onUpdateAmount: (id: string, amount: number) => void;
  onMarkAsPaid: (id: string) => void;
  onReturnToFactory: (id: string) => void;
}

const WA_COLLECTION = `Hola, buenas tardes 👋\nLe escribo para dar seguimiento al pago de su página web.\n¿Me podría confirmar si ya realizó la transferencia? Muchas gracias.`;

export function CollectionCard({ client, onAddEntry, onUpdateAmount, onMarkAsPaid, onReturnToFactory }: CollectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState(client.metadata?.amount_owed?.toString() || '');
  const [confirmPaid, setConfirmPaid] = useState(false);

  const log = client.metadata?.collection_log || [];
  const daysSince = getDaysSinceLastContact(log);
  
  // Streak logic
  let streakClass = 'streak-cold';
  let streakText = `HACE ${daysSince} DÍAS`;
  
  if (daysSince === 0) {
    streakClass = 'streak-today';
    streakText = 'HOY';
  } else if (daysSince === 1) {
    streakClass = 'streak-warm';
    streakText = 'AYER';
  } else if (daysSince === 999) {
    streakText = 'SIN CONTACTO';
  }

  // Last 5 attempts (most recent first in array, but we want to display older to newer left to right)
  // Actually the plan says right to left: "se leen de derecha a izquierda (el más reciente a la derecha)"
  // So we take first 5, reverse them for display.
  const last5 = log.slice(0, 5).reverse();
  const emptyDotsCount = Math.max(0, 5 - last5.length);
  const emptyDots = Array(emptyDotsCount).fill('empty');

  const handleSaveAttempt = (result: 'answered' | 'no_answer' | 'promise', note: string) => {
    onAddEntry(client.id, result, note);
    setShowPopover(false);
  };

  const handleSaveAmount = () => {
    const num = parseInt(tempAmount.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) {
      onUpdateAmount(client.id, num);
    }
    setEditingAmount(false);
  };

  const deliveryDate = client.board_moved_at ? format(new Date(client.board_moved_at), "d MMM", { locale: es }) : 'N/A';

  return (
    <div className={`status-card flex flex-col relative transition-all ${expanded ? 'shadow-xl border-[var(--color-border-active)]' : ''}`}>
      {/* Left indicator based on streak */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg transition-colors" 
        style={{ 
          backgroundColor: daysSince === 0 ? 'var(--color-success)' : daysSince < 3 ? 'var(--color-warning)' : 'var(--color-danger)',
        }}
      />
      
      {/* Top Section (Always visible) */}
      <div 
        className="flex flex-col gap-3 cursor-pointer"
        onClick={(e) => {
          // Prevent expansion if clicking buttons inside
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
          setExpanded(!expanded);
        }}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-[17px] font-bold text-[var(--color-text-primary)] truncate">
              {client.name}
            </h3>
            <div className="text-[12px] text-[var(--color-text-secondary)] mt-1 truncate">
              {client.metadata?.google_category || 'Negocio'} · {client.metadata?.city || ''}
            </div>
          </div>
          
          <div className="text-right shrink-0">
            {editingAmount ? (
              <div className="flex items-center gap-1">
                <span className="text-[var(--color-accent-orange)]">$</span>
                <input 
                  type="text" 
                  className="input-field py-1 px-2 w-20 text-[14px] text-right font-data text-[var(--color-accent-orange)]"
                  value={tempAmount}
                  onChange={(e) => setTempAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveAmount()}
                  autoFocus
                />
              </div>
            ) : (
              <div 
                className="font-data text-[17px] font-bold text-[var(--color-accent-orange)]"
                onClick={(e) => { e.stopPropagation(); setEditingAmount(true); }}
              >
                ${client.metadata?.amount_owed?.toLocaleString() || '---'}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 relative">
          <div className="flex items-center gap-4">
            <div className={`streak-badge ${streakClass}`}>
              <ClockIcon size={12} /> {streakText}
            </div>

            <div className="flex gap-[3px]">
              {emptyDots.map((_, i) => (
                <div key={`empty-${i}`} className="attempt-dot attempt-empty" />
              ))}
              {last5.map((entry, i) => (
                <div 
                  key={i} 
                  className={`attempt-dot attempt-${entry.result}`} 
                  title={`${format(new Date(entry.date), 'dd/MM')} - ${entry.result}`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 relative">
            <button 
              className="btn-call flex items-center gap-2 px-3 py-1.5"
              onClick={() => setShowPopover(!showPopover)}
            >
              <PhoneOutgoing size={14} /> <span className="hidden sm:inline">MARCAR</span>
            </button>
            <a 
              href={`https://wa.me/52${client.phone?.replace(/\D/g,'')}?text=${encodeURIComponent(WA_COLLECTION)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-whatsapp flex items-center justify-center w-8 h-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle size={16} />
            </a>

            {showPopover && (
              <CollectionPopover 
                onSave={handleSaveAttempt} 
                onClose={() => setShowPopover(false)} 
              />
            )}
          </div>
        </div>

        {log[0]?.note && (
          <div className="text-[12px] text-[var(--color-text-tertiary)] italic truncate border-l-2 border-[var(--color-border)] pl-2">
            "{log[0].note}"
          </div>
        )}
        
        <div className="text-[11px] text-[var(--color-text-tertiary)] flex justify-between">
          <span>Entregado: {deliveryDate}</span>
          {client.landing_url && (
            <a href={client.landing_url} target="_blank" rel="noreferrer" className="text-[var(--color-accent-cyan)] hover:underline truncate max-w-[150px]" onClick={e => e.stopPropagation()}>
              {client.landing_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>

      {/* Expanded Section */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)] animate-fadeIn">
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[var(--color-text-tertiary)] tracking-wider uppercase mb-2">
              Historial de Cobro
            </div>
            
            {log.length === 0 ? (
              <div className="text-[12px] text-[var(--color-text-secondary)] py-2 text-center opacity-50">
                Sin intentos registrados
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {log.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-[12px]">
                    <div className="w-12 shrink-0 text-[var(--color-text-tertiary)] font-data">
                      {format(new Date(entry.date), "d MMM", { locale: es })}
                    </div>
                    <div className="mt-1">
                      <div className={`attempt-dot attempt-${entry.result}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={
                        entry.result === 'answered' ? 'text-[var(--color-success)]' :
                        entry.result === 'promise' ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'
                      }>
                        {entry.result === 'answered' ? 'Contestó' : entry.result === 'promise' ? 'Promesa' : 'No contestó'}
                      </span>
                      {entry.note && (
                        <div className="text-[var(--color-text-secondary)] mt-0.5 break-words">
                          {entry.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button 
              className="btn-ghost flex items-center gap-1.5 text-[12px]"
              onClick={(e) => { e.stopPropagation(); setEditingAmount(true); }}
            >
              <DollarSign size={14} /> Editar Monto
            </button>
            
            <button 
              className="btn-ghost flex items-center gap-1.5 text-[12px]"
              onClick={(e) => { e.stopPropagation(); onReturnToFactory(client.id); }}
            >
              <CornerUpLeft size={14} /> Regresar a Fábrica
            </button>

            <div className="flex-1" />

            {confirmPaid ? (
              <div className="flex items-center gap-2 animate-fadeIn bg-[rgba(0,255,136,0.1)] p-1 rounded-md border border-[rgba(0,255,136,0.2)]">
                <span className="text-[12px] text-[var(--color-success)] font-medium px-2">¿Confirmar pago?</span>
                <button className="btn-ghost text-[12px] py-1 px-2" onClick={(e) => { e.stopPropagation(); setConfirmPaid(false); }}>No</button>
                <button className="btn-call bg-[var(--color-success)] text-black font-bold py-1 px-3 shadow-[var(--shadow-glow-success)]" onClick={(e) => { e.stopPropagation(); onMarkAsPaid(client.id); }}>
                  SÍ, PAGÓ
                </button>
              </div>
            ) : (
              <button 
                className="btn-call flex items-center gap-2 bg-[var(--color-bg-surface)] text-[var(--color-success)] border border-[var(--color-success)] shadow-[var(--shadow-glow-success)] hover:bg-[rgba(0,255,136,0.1)]"
                onClick={(e) => { e.stopPropagation(); setConfirmPaid(true); }}
              >
                <CheckCircle2 size={16} /> PAGÓ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple clock icon SVG to avoid adding another lucide import if not needed, or just use lucide
const ClockIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
