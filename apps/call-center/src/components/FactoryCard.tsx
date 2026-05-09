import { useState } from 'react';
import { FactoryClient } from '@/hooks/useFactory';
import { Hammer, CheckCircle2, Link, FileText, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface FactoryCardProps {
  client: FactoryClient;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onUpdateLanding: (id: string, url: string) => void;
  onDeliver: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string, color: string, next: string }> = {
  pending: { label: 'Sin empezar', color: 'var(--color-text-tertiary)', next: 'building' },
  building: { label: 'En construcción', color: 'var(--color-accent-aqua)', next: 'ready' },
  ready: { label: 'Lista para entregar', color: 'var(--color-success)', next: 'pending' }
};

export function FactoryCard({ client, onUpdateStatus, onUpdateLanding, onDeliver }: FactoryCardProps) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(client.landing_url || '');
  const [confirmDelivery, setConfirmDelivery] = useState(false);

  const status = client.metadata?.factory_status || 'pending';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const hasIntake = !!client.metadata?.intake_form;
  
  const createdTime = client.board_moved_at 
    ? formatDistanceToNow(new Date(client.board_moved_at), { addSuffix: true, locale: es })
    : 'hace poco';

  const handleStatusClick = () => {
    onUpdateStatus(client.id, config.next);
  };

  const handleSaveUrl = () => {
    onUpdateLanding(client.id, tempUrl);
    setEditingUrl(false);
  };

  return (
    <div className="status-card flex flex-col gap-3 relative">
      {/* Indicator border left is handled by a class, let's just use inline style for dynamic color */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg transition-colors" 
        style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}40` }}
      />
      
      <div>
        <h3 className="font-display text-[18px] font-bold text-[var(--color-text-primary)]">
          {client.name}
        </h3>
        <div className="text-[12px] text-[var(--color-text-secondary)] mt-1">
          {client.metadata?.google_category || 'Negocio'} · {client.metadata?.city || 'Sin ubicación'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[13px] my-2">
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={handleStatusClick}>
          <span className="text-[var(--color-text-tertiary)]">Estado:</span>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color, boxShadow: `0 0 6px ${config.color}60` }} />
          <span style={{ color: config.color }}>{config.label}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-tertiary)]">Intake:</span>
          {hasIntake ? (
            <span className="text-[var(--color-success)] flex items-center gap-1">
              <CheckCircle2 size={14} /> Completo
            </span>
          ) : (
            <span className="text-[var(--color-warning)]">Falta</span>
          )}
        </div>

        <div className="flex items-center gap-2 col-span-2">
          <span className="text-[var(--color-text-tertiary)]">Landing:</span>
          {editingUrl ? (
            <div className="flex gap-2 w-full">
              <input
                type="text"
                className="input-field py-1 px-2 text-[12px]"
                value={tempUrl}
                onChange={e => setTempUrl(e.target.value)}
                placeholder="https://..."
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveUrl()}
              />
              <button onClick={handleSaveUrl} className="btn-ghost py-1 px-2 text-[12px]">✓</button>
            </div>
          ) : (
            client.landing_url ? (
              <a href={client.landing_url} target="_blank" rel="noreferrer" className="text-[var(--color-accent-aqua)] hover:underline truncate max-w-[200px]">
                {client.landing_url}
              </a>
            ) : (
              <span className="text-[var(--color-text-tertiary)]">—</span>
            )
          )}
        </div>
      </div>

      <div className="text-[11px] text-[var(--color-text-tertiary)]">
        Creado {createdTime}
      </div>

      <div className="actions flex flex-wrap gap-2 mt-2 pt-3 border-t border-[var(--color-border)]">
        <button 
          className="btn-ghost flex items-center gap-2"
          onClick={() => window.open(`/intake/${client.id}`, '_blank')}
        >
          <FileText size={16} /> Ver Intake
        </button>
        
        <button className="btn-ghost flex items-center gap-2" onClick={() => setEditingUrl(!editingUrl)}>
          <Link size={16} /> {client.landing_url ? 'Editar Link' : 'Agregar Link'}
        </button>
        
        <div className="flex-1" />
        
        {confirmDelivery ? (
          <div className="flex items-center gap-2 animate-fadeIn bg-[rgba(255,68,102,0.1)] p-1 rounded-md border border-[rgba(255,68,102,0.2)]">
            <span className="text-[12px] text-[var(--color-danger)] font-medium px-2">¿Seguro?</span>
            <button className="btn-ghost text-[12px] py-1 px-2" onClick={() => setConfirmDelivery(false)}>No</button>
            <button className="btn-call bg-[var(--color-success)] text-black font-bold py-1 px-3 shadow-[var(--shadow-glow-success)]" onClick={() => onDeliver(client.id)}>
              SÍ, ENTREGAR
            </button>
          </div>
        ) : (
          <button 
            className="btn-call flex items-center gap-2 bg-[var(--color-bg-surface)] text-[var(--color-success)] border border-[var(--color-success)] shadow-[var(--shadow-glow-success)] hover:bg-[rgba(0,255,136,0.1)]"
            onClick={() => setConfirmDelivery(true)}
          >
            <CheckCircle2 size={16} /> ENTREGAR
          </button>
        )}
      </div>
    </div>
  );
}
