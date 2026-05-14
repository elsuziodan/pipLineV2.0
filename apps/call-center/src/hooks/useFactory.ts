import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/Toaster';

export interface FactoryClient {
  id: string;
  name: string;
  metadata: any;
  landing_url: string | null;
  board_moved_at: string | null;
}

export function useFactory() {
  const [clients, setClients] = useState<FactoryClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, metadata, landing_url, board_moved_at')
      .eq('status', 'FABRICA')
      .order('board_moved_at', { ascending: false });

    if (error) {
      console.error('Error fetching factory clients:', error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();

    // Realtime sync
    const channel = supabase
      .channel('realtime-factory')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `status=eq.FABRICA`,
      }, () => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateFactoryStatus = async (id: string, newStatus: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    const newMetadata = { ...client.metadata, factory_status: newStatus };
    await supabase.from('clients').update({ metadata: newMetadata }).eq('id', id);
    toast.info(`Estado actualizado a ${newStatus}`);
  };

  const updateLandingUrl = async (id: string, url: string) => {
    await supabase.from('clients').update({ landing_url: url }).eq('id', id);
    toast.success('Landing page guardada');
  };

  const deliverToCollection = async (id: string) => {
    await supabase.from('clients').update({
      status: 'LIQUIDADO',
      board_moved_at: new Date().toISOString()
    }).eq('id', id);
    toast.success('Proyecto entregado, movido a Cobranza');
  };

  return {
    clients,
    loading,
    refresh: fetchClients,
    updateFactoryStatus,
    updateLandingUrl,
    deliverToCollection
  };
}
