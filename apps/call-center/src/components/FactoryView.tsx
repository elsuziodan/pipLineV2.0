import { Hammer } from 'lucide-react';
import { useFactory } from '@/hooks/useFactory';
import { FactoryCard } from './FactoryCard';

export function FactoryView() {
  const { clients, loading, updateFactoryStatus, updateLandingUrl, deliverToCollection } = useFactory();

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-8 animate-fadeIn overflow-y-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[var(--color-text-secondary)]">
            <Hammer size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Fábrica
            </h1>
            <p className="text-[13px] text-[var(--color-text-tertiary)]">
              Proyectos en construcción
            </p>
          </div>
        </div>
        <div className="text-[14px] font-medium text-[var(--color-text-secondary)]">
          {clients.length} proyectos
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-[var(--color-text-tertiary)]">
          Cargando proyectos...
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center opacity-50">
          <Hammer size={48} className="mb-4 text-[var(--color-text-tertiary)]" />
          <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-2">
            No hay páginas en construcción
          </h3>
          <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-sm">
            Los clientes que acepten en la fase de prospección aparecerán aquí para que construyas su página.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map(client => (
            <FactoryCard 
              key={client.id} 
              client={client} 
              onUpdateStatus={updateFactoryStatus}
              onUpdateLanding={updateLandingUrl}
              onDeliver={deliverToCollection}
            />
          ))}
        </div>
      )}
    </div>
  );
}
