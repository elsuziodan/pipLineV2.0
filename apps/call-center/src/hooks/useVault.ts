import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/Toaster';

export interface VaultClient {
  id: string;
  name: string;
  status: 'PAGADO' | 'CANCELADO';
  metadata: any;
  landing_url: string | null;
  board_moved_at: string | null;
}

export function useVault() {
  const [clients, setClients] = useState<VaultClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, status, metadata, landing_url, board_moved_at')
      .in('status', ['PAGADO', 'CANCELADO'])
      .order('board_moved_at', { ascending: false });

    if (error) {
      console.error('Error fetching vault clients:', error);
    } else {
      setClients(data as VaultClient[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();

    const channel = supabase
      .channel('realtime-vault')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `status=in.(PAGADO,CANCELADO)`,
      }, () => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const revertToCollection = async (id: string) => {
    await supabase.from('clients').update({
      status: 'LIQUIDADO',
      board_moved_at: new Date().toISOString(),
      archived_at: null
    }).eq('id', id);
    toast.warning('↩ Revertido a Cobranza');
  };

  const reactivateLead = async (id: string) => {
    await supabase.from('clients').update({
      status: 'prospecto',
      board_moved_at: null,
      archived_at: null
    }).eq('id', id);
    toast.success('♻ Lead reactivado');
  };

  return {
    clients,
    loading,
    refresh: fetchClients,
    revertToCollection,
    reactivateLead
  };
}
