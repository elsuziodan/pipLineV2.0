import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { differenceInDays, startOfDay } from 'date-fns';
import { toast } from '@/components/Toaster';

export interface CollectionEntry {
  date: string;
  result: 'answered' | 'no_answer' | 'promise';
  note?: string;
}

export interface CollectionClient {
  id: string;
  name: string;
  metadata: {
    collection_log?: CollectionEntry[];
    amount_owed?: number;
    [key: string]: any;
  };
  landing_url: string | null;
  board_moved_at: string | null;
}

export function useCollection() {
  const [clients, setClients] = useState<CollectionClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, metadata, landing_url, board_moved_at')
      .eq('status', 'LIQUIDADO')
      .order('board_moved_at', { ascending: false });

    if (error) {
      console.error('Error fetching collection clients:', error);
    } else {
      // Sort by urgency (days since last contact descending)
      const sorted = (data || []).sort((a, b) => {
        const daysA = getDaysSinceLastContact(a.metadata?.collection_log);
        const daysB = getDaysSinceLastContact(b.metadata?.collection_log);
        return daysB - daysA;
      });
      setClients(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();

    const channel = supabase
      .channel('realtime-collection')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `status=eq.LIQUIDADO`,
      }, () => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addCollectionEntry = async (id: string, result: 'answered' | 'no_answer' | 'promise', note?: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    const currentLog = client.metadata?.collection_log || [];
    const today = new Date().toISOString();
    const newEntry: CollectionEntry = { date: today, result, note };
    
    // Add to beginning of array
    const newLog = [newEntry, ...currentLog];
    const newMetadata = { ...client.metadata, collection_log: newLog };

    await supabase.from('clients').update({ metadata: newMetadata }).eq('id', id);
    toast.success('Intento registrado');
  };

  const updateAmount = async (id: string, amount: number) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    const newMetadata = { ...client.metadata, amount_owed: amount };
    await supabase.from('clients').update({ metadata: newMetadata }).eq('id', id);
    toast.info('Monto actualizado');
  };

  const markAsPaid = async (id: string) => {
    await supabase.from('clients').update({
      status: 'PAGADO',
      board_moved_at: new Date().toISOString(),
      archived_at: new Date().toISOString()
    }).eq('id', id);
    toast.success('¡PAGADO! Archivado en bóveda');
  };

  const returnToFactory = async (id: string) => {
    await supabase.from('clients').update({
      status: 'FABRICA',
      board_moved_at: new Date().toISOString()
    }).eq('id', id);
    toast.warning('↩ Regresado a Fábrica');
  };

  return {
    clients,
    loading,
    refresh: fetchClients,
    addCollectionEntry,
    updateAmount,
    markAsPaid,
    returnToFactory
  };
}

// Utility to calculate streak days
export function getDaysSinceLastContact(log?: CollectionEntry[]): number {
  if (!log || log.length === 0) return 999; // Represents 'SIN CONTACTO'
  
  const lastContact = new Date(log[0].date);
  const today = new Date();
  
  // Use startOfDay to compare just the dates, regardless of time
  return differenceInDays(startOfDay(today), startOfDay(lastContact));
}
