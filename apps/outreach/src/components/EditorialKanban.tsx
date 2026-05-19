"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Lead } from "../lib/types";

export default function EditorialKanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFactoryLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'FABRICA')
        .order('board_moved_at', { ascending: false });

      if (error) throw error;
      setLeads(data as Lead[]);
    } catch (err) {
      console.error('Error fetching factory leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFactoryLeads();
  }, [fetchFactoryLeads]);

  if (loading) {
    return (
      <div style={{ padding: '60px 14px', textAlign: 'center', color: 'var(--ink-muted)' }}>
        <span className="font-body" style={{ fontSize: 'var(--t-detail)', fontWeight: 300 }}>Cargando Fábrica...</span>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div style={{ padding: '60px 14px', textAlign: 'center', color: 'var(--ink-muted)' }}>
        <span className="font-body" style={{ fontSize: 'var(--t-detail)', fontWeight: 300 }}>No hay proyectos en construcción</span>
      </div>
    );
  }

  const columns = [
    { id: 'pending', label: 'Sin Empezar' },
    { id: 'building', label: 'En Construcción' },
    { id: 'ready', label: 'Listos' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '16px 14px 40px' }}>
      {columns.map(col => {
        const colLeads = leads.filter(l => (l.metadata?.factory_status || 'pending') === col.id);
        
        if (colLeads.length === 0) return null;

        return (
          <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Column Header */}
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              paddingBottom: '4px',
            }}>
              <h3 className="font-display" style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
              }}>
                {col.label}
              </h3>
              <span className="font-body" style={{
                fontSize: '10px',
                color: 'var(--ink-muted)',
              }}>
                {colLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {colLeads.map(lead => (
                <div key={lead.id} style={{
                  padding: '12px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <h4 className="font-display-italic" style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    margin: 0,
                  }}>
                    {lead.name}
                  </h4>
                  <span className="font-body" style={{
                    fontSize: '11px',
                    color: 'var(--ink-soft)',
                    fontWeight: 300,
                  }}>
                    {lead.city || 'Sin ciudad'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
