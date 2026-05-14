"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar, ViewType } from "@/components/Sidebar";
import { StatsBar } from "@/components/StatsBar";
import { CallQueue } from "@/components/CallQueue";
import { LeadProfile } from "@/components/LeadProfile";
import { NavigationBar } from "@/components/NavigationBar";
import { useCallQueue } from "@/hooks/useCallQueue";
import { useCallStats } from "@/hooks/useCallStats";

import { FactoryView } from "@/components/FactoryView";
import { CollectionView } from "@/components/CollectionView";
import { VaultView } from "@/components/VaultView";

export default function CallCenterPage() {
  const [activeView, setActiveView] = useState<ViewType>('prospecting');

  const {
    leads,
    filter,
    setFilter,
    selectedIndex,
    setSelectedIndex,
    navigateNext,
    navigatePrev,
    loading,
    calls,
    refresh,
  } = useCallQueue();

  const stats = useCallStats();
  const selectedLead = leads[selectedIndex] ?? null;

  const [historyOpen, setHistoryOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  // We should also get the urgent collection count to pass to the sidebar badge
  // For now, we mock it. This will come from useCollection hook later.
  const collectionUrgentCount = 0;

  const isDrawerOpen = selectedIndex >= 0 && selectedLead !== null;

  // Close the drawer
  const closeDrawer = useCallback(() => {
    setSelectedIndex(-1);
  }, [setSelectedIndex]);

  // Android back button: push a history entry when drawer opens, pop closes it
  useEffect(() => {
    if (isDrawerOpen) {
      window.history.pushState({ drawer: true }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (isDrawerOpen) {
        closeDrawer();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDrawerOpen, closeDrawer]);

  // Swipe-to-close: track touch on the drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
    const delta = touchCurrentY.current - touchStartY.current;
    
    // Only allow dragging down (positive delta), and only if scrolled to top
    if (delta > 0 && drawerRef.current && drawerRef.current.scrollTop <= 0) {
      e.preventDefault();
      drawerRef.current.style.transform = `translateY(${Math.min(delta, 300)}px)`;
      drawerRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    const delta = touchCurrentY.current - touchStartY.current;
    
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      
      if (delta > 100) {
        // Swiped down enough — close
        drawerRef.current.style.transform = 'translateY(100%)';
        setTimeout(() => {
          closeDrawer();
          if (drawerRef.current) {
            drawerRef.current.style.transform = '';
          }
        }, 350);
      } else {
        // Snap back
        drawerRef.current.style.transform = '';
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden main-content">
      <Sidebar active={activeView} onViewChange={setActiveView} collectionUrgentCount={collectionUrgentCount} />

      <div
        className="flex-1 flex flex-col overflow-hidden view-container"
        style={{ position: "relative", zIndex: 1 }}
      >
        {activeView === 'prospecting' && (
          <div key="prospecting" className="flex flex-col h-full animate-fadeIn">
            <StatsBar stats={stats} />

            <div className="flex-1 flex overflow-hidden p-4 gap-4 relative">
              {/* Left panel: Queue */}
              <div className="flex flex-col min-w-0 gap-1 queue-panel" style={{ width: "57%" }}>
                <CallQueue
                  leads={leads}
                  selectedIndex={selectedIndex}
                  onSelect={setSelectedIndex}
                  filter={filter}
                  onFilterChange={setFilter}
                  loading={loading}
                  calls={calls}
                />
                <NavigationBar
                  onPrev={navigatePrev}
                  onNext={navigateNext}
                  canPrev={selectedIndex > 0}
                  canNext={selectedIndex < leads.length - 1}
                  current={leads.length > 0 ? selectedIndex + 1 : 0}
                  total={leads.length}
                  onOpenHistory={() => setHistoryOpen(!historyOpen)}
                />
              </div>

              {/* Overlay behind profile drawer (mobile only) */}
              <div 
                className={`profile-overlay ${selectedLead ? 'active' : ''}`}
                style={{
                  display: 'none',
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  zIndex: 54,
                  opacity: 0,
                  pointerEvents: 'none',
                  transition: 'opacity 0.3s ease',
                }}
                onClick={() => setSelectedIndex(-1)}
              />

              {/* Right panel: Profile */}
              <div 
                ref={drawerRef}
                className={`min-w-0 profile-panel ${selectedLead ? 'open' : ''}`} 
                style={{ width: "43%", overscrollBehavior: 'contain' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Mobile drag handle + close */}
                <div 
                  className="profile-drawer-handle items-center justify-center pt-3 pb-2"
                  style={{ display: 'none' }}
                >
                  <div 
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      background: 'rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                    }}
                    onClick={closeDrawer}
                  />
                </div>
                <LeadProfile lead={selectedLead} onCallSaved={() => refresh()} />
              </div>
            </div>
          </div>
        )}

        {activeView === 'factory' && (
          <div key="factory" className="flex flex-col h-full overflow-y-auto animate-fadeIn">
            <FactoryView />
          </div>
        )}

        {activeView === 'collection' && (
          <div key="collection" className="flex flex-col h-full overflow-y-auto animate-fadeIn">
            <CollectionView />
          </div>
        )}

        {activeView === 'vault' && (
          <div key="vault" className="flex flex-col h-full overflow-y-auto animate-fadeIn">
            <VaultView />
          </div>
        )}
      </div>
    </div>
  );
}
