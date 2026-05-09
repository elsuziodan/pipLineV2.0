"use client";

import { useState } from "react";
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

  // We should also get the urgent collection count to pass to the sidebar badge
  // For now, we mock it. This will come from useCollection hook later.
  const collectionUrgentCount = 0;

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

              {/* Right panel: Profile */}
              <div className={`min-w-0 profile-panel ${selectedLead ? 'open' : ''}`} style={{ width: "43%" }}>
                <LeadProfile lead={selectedLead} onCallSaved={() => refresh()} />
              </div>
            </div>
          </div>
        )}

        {activeView === 'factory' && (
          <div key="factory" className="flex flex-col h-full animate-fadeIn">
            <FactoryView />
          </div>
        )}

        {activeView === 'collection' && (
          <div key="collection" className="flex flex-col h-full animate-fadeIn">
            <CollectionView />
          </div>
        )}

        {activeView === 'vault' && (
          <div key="vault" className="flex flex-col h-full animate-fadeIn">
            <VaultView />
          </div>
        )}
      </div>
    </div>
  );
}
