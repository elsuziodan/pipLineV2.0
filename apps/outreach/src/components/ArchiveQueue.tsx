"use client";

import { useState, useEffect, useCallback } from "react";
import ContactCard from "./ContactCard";
import { supabase } from "../lib/supabase";
import { Lead } from "../lib/types";

export default function ArchiveQueue() {
  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]);
  const [trashedLeads, setTrashedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrash, setShowTrash] = useState(false);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [trashCount, setTrashCount] = useState<number | null>(null);

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'archived')
        .order('archived_at', { ascending: false, nullsFirst: false }); // Will use created_at as fallback below

      if (error) throw error;
      
      // Fallback to created_at if archived_at is null
      const sorted = (data as Lead[]).sort((a, b) => {
        const dateA = new Date(a.archived_at || a.created_at).getTime();
        const dateB = new Date(b.archived_at || b.created_at).getTime();
        return dateB - dateA;
      });
      
      setArchivedLeads(sorted);
      
      // Also get trash count
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trash');
        
      setTrashCount(count);
    } catch (err) {
      console.error('Error fetching archived leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrash = useCallback(async () => {
    setLoadingTrash(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'trash')
        .order('trashed_at', { ascending: false });

      if (error) throw error;
      setTrashedLeads(data as Lead[]);
    } catch (err) {
      console.error('Error fetching trashed leads:', err);
    } finally {
      setLoadingTrash(false);
    }
  }, []);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  useEffect(() => {
    if (showTrash) {
      fetchTrash();
    }
  }, [showTrash, fetchTrash]);

  const handleUnarchive = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'uncontacted', archived_at: null })
        .eq('id', leadId);

      if (error) throw error;
      fetchArchived();
    } catch (err) {
      console.error('Error unarchiving lead:', err);
    }
  };

  const handleMoveToTrash = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'trash', trashed_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
      fetchArchived();
      if (showTrash) fetchTrash();
    } catch (err) {
      console.error('Error moving lead to trash:', err);
    }
  };

  const handleRecoverFromTrash = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'archived', trashed_at: null, archived_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
      fetchArchived();
      if (showTrash) fetchTrash();
    } catch (err) {
      console.error('Error recovering lead from trash:', err);
    }
  };
  
  const handleEmptyTrash = async () => {
    if (!window.confirm("¿Estás seguro de vaciar la papelera? Esto es irreversible.")) return;
    
    try {
      // In Supabase, you'll want to actually delete these records
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('status', 'trash');
        
      if (error) throw error;
      setTrashedLeads([]);
      setTrashCount(0);
    } catch (err) {
      console.error('Error emptying trash:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 14px', textAlign: 'center', color: 'var(--ink-muted)' }}>
        <span className="font-body" style={{ fontSize: 'var(--t-detail)', fontWeight: 300 }}>Cargando...</span>
      </div>
    );
  }

  const getDaysLeft = (trashedAtStr: string) => {
    if (!trashedAtStr) return 7;
    const trashedAt = new Date(trashedAtStr).getTime();
    const now = Date.now();
    const diffDays = Math.floor((now - trashedAt) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - diffDays);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '16px 0 60px' }}>
      
      {/* Archived Section */}
      <div>
        <div style={{ padding: '0 14px', marginBottom: '16px' }}>
          <h3 className="font-display" style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--ink)',
            margin: 0,
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px'
          }}>
            Archivados
            <span className="font-body" style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: 400 }}>
              {archivedLeads.length}
            </span>
          </h3>
        </div>

        {archivedLeads.length === 0 ? (
          <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--ink-muted)' }}>
            <span className="font-body" style={{ fontSize: 'var(--t-detail)', fontWeight: 300 }}>No hay clientes archivados</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {archivedLeads.map(lead => (
              <div key={lead.id} style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <ContactCard lead={lead} isActive={false} onClick={() => {}} index={0} />
                <div style={{ display: 'flex', gap: '12px', paddingLeft: '14px' }}>
                  <button
                    onClick={() => handleUnarchive(lead.id)}
                    className="font-body"
                    style={{
                      background: 'none',
                      border: '1px solid var(--ink-muted)',
                      borderRadius: '20px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: 'var(--t-micro)',
                      fontWeight: 500,
                      color: 'var(--ink-soft)',
                      transition: 'background-color 0.2s, color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--ink-accent-soft)';
                      e.currentTarget.style.color = 'var(--ink-accent)';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--ink-soft)';
                      e.currentTarget.style.borderColor = 'var(--ink-muted)';
                    }}
                  >
                    Recuperar
                  </button>
                  <button
                    onClick={() => handleMoveToTrash(lead.id)}
                    className="font-body"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: 'var(--t-micro)',
                      fontWeight: 400,
                      color: 'var(--ink-muted)',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--ink)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--ink-muted)';
                    }}
                  >
                    Papelera ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trash Section */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '24px' }}>
        <div 
          style={{ 
            padding: '0 14px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--ink-soft)',
            transition: 'color 0.2s'
          }}
          onClick={() => setShowTrash(!showTrash)}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-soft)'}
        >
          <span style={{ 
            display: 'inline-block', 
            transition: 'transform 0.2s',
            transform: showTrash ? 'rotate(90deg)' : 'rotate(0deg)'
          }}>
            ▸
          </span>
          <h3 className="font-display" style={{
            fontSize: '16px',
            fontWeight: 700,
            margin: 0,
          }}>
            Papelera
          </h3>
          <span className="font-body" style={{ fontSize: '12px', opacity: 0.6 }}>
            ({trashCount !== null ? trashCount : '...'})
          </span>
        </div>

        {showTrash && (
          <div className="animate-fade-in" style={{ marginTop: '16px' }}>
            {loadingTrash ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                <span className="font-body" style={{ fontSize: 'var(--t-detail)', fontWeight: 300 }}>Cargando papelera...</span>
              </div>
            ) : trashedLeads.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                <span className="font-body" style={{ fontSize: 'var(--t-detail)', fontWeight: 300 }}>La papelera está vacía</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '0 14px', color: 'var(--ink-muted)', fontSize: '11px', textAlign: 'center' }}>
                  Los elementos en la papelera se auto-eliminan a los 7 días.
                </div>
                
                {trashedLeads.map(lead => (
                  <div key={lead.id} style={{ 
                    padding: '12px 14px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.02)' 
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="font-display" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
                        {lead.name}
                      </span>
                      <span className="font-body" style={{ fontSize: '11px', color: 'var(--ink-accent)', fontWeight: 500 }}>
                        {getDaysLeft(lead.trashed_at || '')} días restantes
                      </span>
                    </div>
                    <button
                      onClick={() => handleRecoverFromTrash(lead.id)}
                      className="font-body"
                      style={{
                        background: 'none',
                        border: '1px solid var(--ink-muted)',
                        borderRadius: '20px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: 500,
                        color: 'var(--ink-soft)',
                      }}
                    >
                      Recuperar
                    </button>
                  </div>
                ))}
                
                {trashedLeads.length > 0 && (
                  <button
                    onClick={handleEmptyTrash}
                    className="font-body"
                    style={{
                      margin: '16px 14px 0',
                      background: 'none',
                      border: 'none',
                      padding: '12px',
                      cursor: 'pointer',
                      fontSize: 'var(--t-detail)',
                      fontWeight: 500,
                      color: 'var(--ink-accent)',
                      textDecoration: 'underline',
                      textDecorationColor: 'var(--ink-accent-soft)',
                      textUnderlineOffset: '4px'
                    }}
                  >
                    Vaciar papelera
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
