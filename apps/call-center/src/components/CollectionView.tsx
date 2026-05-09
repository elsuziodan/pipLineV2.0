import { Banknote } from 'lucide-react';
import { useCollection } from '@/hooks/useCollection';
import { CollectionCard } from './CollectionCard';

export function CollectionView() {
  const { clients, loading, addCollectionEntry, updateAmount, markAsPaid, returnToFactory } = useCollection();

  // Calculate total amount owed across all collection clients
  const totalAmount = clients.reduce((acc, client) => {
    return acc + (client.metadata?.amount_owed || 0);
  }, 0);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-8 animate-fadeIn overflow-y-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(255,184,0,0.1)] flex items-center justify-center text-[var(--color-warning)]">
            <Banknote size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Cobranza
            </h1>
            <p className="text-[13px] text-[var(--color-text-tertiary)]">
              Por cobrar: <span className="text-[var(--color-accent-orange)] font-semibold">${totalAmount.toLocaleString()}</span>
            </p>
          </div>
        </div>
        <div className="text-[14px] font-medium text-[var(--color-text-secondary)]">
          {clients.length} pendientes
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-[var(--color-text-tertiary)]">
          Cargando cobranza...
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center opacity-50">
          <Banknote size={48} className="mb-4 text-[var(--color-text-tertiary)]" />
          <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-2">
            No hay cobranza pendiente
          </h3>
          <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-sm">
            Los proyectos entregados aparecerán aquí para su seguimiento de pago.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clients.map(client => (
            <CollectionCard 
              key={client.id} 
              client={client} 
              onAddEntry={addCollectionEntry}
              onUpdateAmount={updateAmount}
              onMarkAsPaid={markAsPaid}
              onReturnToFactory={returnToFactory}
            />
          ))}
        </div>
      )}
    </div>
  );
}
