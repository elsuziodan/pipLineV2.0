"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import ContactCard from "./ContactCard";
import ActiveLead from "./ActiveLead";
import { useOutreachQueue } from "../hooks/useOutreachQueue";
import { supabase } from "../lib/supabase";

export default function ContactQueue() {
  const { leads, loading, refresh } = useOutreachQueue();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<Element | null>(null);


  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load contacted state from DB on mount
  useEffect(() => {
    if (leads.length === 0) return;
    const ids = new Set<string>();
    leads.forEach(l => {
      if (l.contacted_at) ids.add(l.id);
    });
    setContactedIds(ids);
  }, [leads]);

  // Cache scroll container ref
  useEffect(() => {
    if (listRef.current) {
      scrollContainerRef.current = listRef.current.closest('main') || null;
    }
  }, [listRef.current]);

  // Smooth Scroll Effect (Cover Flow)
  useEffect(() => {
    const container = listRef.current?.closest('main') || window;
    
    let rafId: number;
    const handleScroll = () => {
      rafId = requestAnimationFrame(() => {
        if (!listRef.current) return;
        
        const viewportHeight = window.innerHeight;
        const targetCenterY = viewportHeight * 0.45; 
        
        const children = Array.from(listRef.current.children) as HTMLElement[];
        
        children.forEach((child) => {
          if (!child.classList.contains('scroll-item')) return;
          
          const rect = child.getBoundingClientRect();
          const childCenter = rect.top + rect.height / 2;
          const distance = Math.abs(targetCenterY - childCenter);
          
          const maxDistance = viewportHeight * 0.6;
          const ratio = Math.min(distance / maxDistance, 1);
          
          const easeRatio = ratio * ratio * (3 - 2 * ratio); 
          
          const scale = 1 - (easeRatio * 0.12);
          const opacity = 1 - (easeRatio * 0.75);
          
          child.style.transform = `scale(${scale})`;
          child.style.opacity = opacity.toString();
          child.style.transition = activeId ? 'transform 0.3s ease, opacity 0.3s ease' : 'none';
        });
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    setTimeout(handleScroll, 100);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [leads.length, activeId]);

  // History API for back button
  useEffect(() => {
    if (!activeId) return;

    window.history.pushState({ panel: 'lead', id: activeId }, '');

    const handlePopState = () => {
      closePanel();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeId]);

  const openPanel = useCallback((id: string) => {
    setIsClosing(false);
    setActiveId(id);
  }, []);

  const closePanel = useCallback(() => {
    if (!activeId) return;
    if (isMobile) {
      setIsClosing(true);
      setTimeout(() => {
        setActiveId(null);
        setIsClosing(false);
      }, 300); // Increased slightly for spring animation
    } else {
      setActiveId(null);
    }
  }, [activeId, isMobile]);

  const handleCardClick = useCallback((id: string) => {
    if (activeId === id) {
      if (window.history.state?.panel === 'lead') {
        window.history.back();
      } else {
        closePanel();
      }
    } else {
      if (activeId) {
        setActiveId(id);
      } else {
        openPanel(id);
      }
    }
  }, [activeId, openPanel, closePanel]);

  const handleSendToFactory = useCallback(async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          status: 'FABRICA',
          board_moved_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;
      closePanel();
      refresh();
    } catch (err) {
      console.error('Error sending to factory:', err);
    }
  }, [closePanel, refresh]);

  const handleArchive = useCallback(async (leadId: string) => {
    const scrollPos = scrollContainerRef.current?.scrollTop || 0;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'archived' })
        .eq('id', leadId);

      if (error) throw error;
      closePanel();
      await refresh();

      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPos;
        }
      });
    } catch (err) {
      console.error('Error archiving lead:', err);
    }
  }, [closePanel, refresh]);

  const handleMessageCopied = useCallback(async (leadId: string) => {
    setContactedIds(prev => new Set(prev).add(leadId));
    try {
      await supabase
        .from('clients')
        .update({ contacted_at: new Date().toISOString() })
        .eq('id', leadId);
    } catch (err) {
      console.error('Error marking as contacted:', err);
    }
  }, []);

  const handleUnmark = useCallback(async (leadId: string) => {
    setContactedIds(prev => {
      const next = new Set(prev);
      next.delete(leadId);
      return next;
    });
    try {
      await supabase
        .from('clients')
        .update({ contacted_at: null })
        .eq('id', leadId);
    } catch (err) {
      console.error('Error unmarking lead:', err);
    }
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: '60px 14px',
        textAlign: 'center',
        color: 'var(--ink-muted)',
        fontSize: 'var(--t-detail)',
        fontWeight: 300,
      }}>
        Cargando...
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div style={{
        padding: '60px 14px',
        textAlign: 'center',
        color: 'var(--ink-muted)',
        fontSize: 'var(--t-detail)',
        fontWeight: 300,
      }}>
        No hay contactos en trend
      </div>
    );
  }

  const activeLead = leads.find(l => l.id === activeId);

  return (
    <>
      <div 
        ref={listRef} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          position: 'relative',
          paddingTop: '35vh',
          paddingBottom: '35vh',
          gap: '8px'
        }}
      >
        {/* Desktop frosted backdrop */}
        {!isMobile && activeId && (
          <div className="desktop-backdrop animate-fade-in" onClick={closePanel} />
        )}

        {leads.map((lead, i) => (
          <div 
            key={lead.id} 
            className={`scroll-item ${!isMobile && activeId === lead.id ? 'desktop-panel-wrapper' : ''}`}
            style={{ 
              transformOrigin: 'center center',
              willChange: 'transform, opacity'
            }}
          >
            <ContactCard
              lead={lead as any}
              isActive={activeId === lead.id}
              onClick={() => handleCardClick(lead.id)}
              index={i}
              contacted={contactedIds.has(lead.id)}
              onContacted={handleMessageCopied}
            />
            {/* Desktop: inline panel below card */}
            {!isMobile && activeId === lead.id && activeLead && (
              <div className="animate-scale-in" style={{ padding: '4px 10px 20px' }}>
                <ActiveLead
                  lead={activeLead as any}
                  onClose={closePanel}
                  onSendToFactory={handleSendToFactory}
                  onArchive={handleArchive}
                  onMessageCopied={handleMessageCopied}
                  onUnmark={handleUnmark}
                  isContacted={contactedIds.has(lead.id)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: fullscreen overlay */}
      {isMobile && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeId && activeLead && !isClosing && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overlay-backdrop active"
                onClick={() => {
                  if (window.history.state?.panel === 'lead') {
                    window.history.back();
                  } else {
                    closePanel();
                  }
                }}
              />
              <motion.div
                className="fixed bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto bg-surface rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-[100]"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 500) {
                    if (window.history.state?.panel === 'lead') {
                      window.history.back();
                    } else {
                      closePanel();
                    }
                  }
                }}
              >
                <div
                  className="w-8 h-1 rounded-sm bg-ink-muted mx-auto mt-2.5 mb-1.5 cursor-pointer touch-none"
                  onClick={() => {
                    if (window.history.state?.panel === 'lead') {
                      window.history.back();
                    } else {
                      closePanel();
                    }
                  }}
                />
                <div className="px-3.5 pb-8 pt-1">
                  <h2 className="font-display text-name font-bold text-ink mb-5 leading-[1.15]">
                    {activeLead.name}
                  </h2>
                  <ActiveLead
                    lead={activeLead as any}
                    onClose={closePanel}
                    onSendToFactory={handleSendToFactory}
                    onArchive={handleArchive}
                    onMessageCopied={handleMessageCopied}
                    onUnmark={handleUnmark}
                    isContacted={contactedIds.has(activeLead.id)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
