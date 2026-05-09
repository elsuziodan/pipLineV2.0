import { useState } from 'react';
import { Vault, Search } from 'lucide-react';
import { useVault } from '@/hooks/useVault';
import { VaultCard } from './VaultCard';

export function VaultView() {
  const { clients, loading, revertToCollection, reactivateLead } = useVault();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pagado' | 'cancelado'>('pagado');

  const filteredClients = clients.filter(c => {
    const matchesTab = c.status.toLowerCase() === activeTab;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pagados = clients.filter(c => c.status === 'PAGADO');
  const cancelados = clients.filter(c => c.status === 'CANCELADO');

  const totalAmount = pagados.reduce((acc, c) => acc + (c.metadata?.amount_owed || 0), 0);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 md:p-8 animate-fadeIn overflow-y-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(167,139,250,0.1)] flex items-center justify-center text-[var(--color-accent-lavender)]">
            <Vault size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
              Bóveda
            </h1>
            <p className="text-[13px] text-[var(--color-text-tertiary)]">
              Total acumulado: <span className="text-[var(--color-accent-lavender)] font-semibold">${totalAmount.toLocaleString()}</span>
            </p>
          </div>
        </div>
        <div className="text-[14px] font-medium text-[var(--color-text-secondary)]">
          {pagados.length} clientes
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 vault-search">
        <div className="flex bg-[var(--color-bg-surface)] p-1 rounded-lg border border-[var(--color-border)]">
          <button 
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${activeTab === 'pagado' ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            onClick={() => setActiveTab('pagado')}
          >
            Pagados ({pagados.length})
          </button>
          <button 
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${activeTab === 'cancelado' ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            onClick={() => setActiveTab('cancelado')}
          >
            Cancelados ({cancelados.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-sm ml-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-tertiary)]">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="input-field pl-9 py-2"
            placeholder="Buscar cliente archivado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-[var(--color-text-tertiary)]">
          Cargando bóveda...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center opacity-50">
          <Vault size={48} className="mb-4 text-[var(--color-text-tertiary)]" />
          <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-2">
            No hay clientes aquí
          </h3>
          <p className="text-[14px] text-[var(--color-text-tertiary)] max-w-sm">
            {searchTerm ? 'No se encontraron clientes con esa búsqueda.' : 'Los clientes liquidados o cancelados aparecerán en esta sección.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredClients.map(client => (
            <VaultCard 
              key={client.id} 
              client={client} 
              onRevertToCollection={revertToCollection}
              onReactivate={reactivateLead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
