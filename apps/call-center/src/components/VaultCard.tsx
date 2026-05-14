import { useState } from 'react';
import { VaultClient } from '@/hooks/useVault';
import { CheckCircle2, CornerUpLeft, RefreshCw, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VaultCardProps {
  client: VaultClient;
  onRevertToCollection: (id: string) => void;
  onReactivate: (id: string) => void;
}

export function VaultCard({ client, onRevertToCollection, onReactivate }: VaultCardProps) {
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [confirmReactivate, setConfirmReactivate] = useState(false);

  const isPagado = client.status === 'PAGADO';
  const moveDate = client.board_moved_at ? format(new Date(client.board_moved_at), "d MMM yyyy", { locale: es }) : 'Desconocido';
  const amount = client.metadata?.amount_owed || 0;

  return (
    <div className={`status-card flex items-center gap-4 ${!isPagado ? 'opacity-60 grayscale-[50%]' : ''}`}
         style={{ 
           borderLeftColor: isPagado ? 'var(--color-accent-lavender)' : 'var(--color-text-tertiary)',
           backgroundColor: isPagado ? 'rgba(167,139,250,0.03)' : 'var(--color-bg-surface)'
         }}>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isPagado ? (
            <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0" />
          ) : (
            <XCircle size={18} className="text-[var(--color-text-tertiary)] shrink-0" />
          )}
          <h3 className="font-display text-[16px] font-bold text-[var(--color-text-primary)] truncate">
            {client.name}
          </h3>
          {isPagado && amount > 0 && (
            <span className="font-data text-[14px] font-bold text-[var(--color-accent-lavender)] ml-auto shrink-0">
              ${amount.toLocaleString()}
            </span>
          )}
        </div>
        
        <div className="text-[12px] text-[var(--color-text-secondary)] mt-1 flex items-center gap-2 truncate">
          <span>{isPagado ? 'Pagado' : client.status === 'perdido' ? 'Perdido' : 'Cancelado'}: {moveDate}</span>
          {client.landing_url && (
            <>
              <span>·</span>
              <a href={client.landing_url} target="_blank" rel="noreferrer" className="text-[var(--color-accent-cyan)] hover:underline truncate">
                {client.landing_url.replace(/^https?:\/\//, '')}
              </a>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center">
        {isPagado ? (
          confirmRevert ? (
            <div className="flex items-center gap-2 bg-[var(--color-bg-elevated)] p-1 rounded-md border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-secondary)] px-1">¿Revertir?</span>
              <button className="btn-ghost py-1 px-2 text-[11px]" onClick={() => setConfirmRevert(false)}>No</button>
              <button className="btn-ghost py-1 px-2 text-[11px] text-[var(--color-warning)]" onClick={() => onRevertToCollection(client.id)}>SÍ</button>
            </div>
          ) : (
            <button 
              className="btn-ghost flex items-center gap-1.5 text-[11px] py-1.5 px-3"
              onClick={() => setConfirmRevert(true)}
            >
              <CornerUpLeft size={14} /> Revertir
            </button>
          )
        ) : (
          confirmReactivate ? (
            <div className="flex items-center gap-2 bg-[var(--color-bg-elevated)] p-1 rounded-md border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-secondary)] px-1">¿Reactivar?</span>
              <button className="btn-ghost py-1 px-2 text-[11px]" onClick={() => setConfirmReactivate(false)}>No</button>
              <button className="btn-ghost py-1 px-2 text-[11px] text-[var(--color-success)]" onClick={() => onReactivate(client.id)}>SÍ</button>
            </div>
          ) : (
            <button 
              className="btn-ghost flex items-center gap-1.5 text-[11px] py-1.5 px-3"
              onClick={() => setConfirmReactivate(true)}
            >
              <RefreshCw size={14} /> Reactivar
            </button>
          )
        )}
      </div>
    </div>
  );
}
