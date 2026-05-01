"use client";

import { useState, useEffect, useCallback } from "react";

export function useSuggestedLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads/suggested", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error("Error fetching suggested leads:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const ignoreLead = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/suggested/${id}/ignore`, {
        method: "POST",
      });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (e) {
      console.error("Error ignoring lead:", e);
    }
  };

  const approveLead = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/suggested/${id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
        // You might want to trigger a refresh of the Kanban board here
      }
    } catch (e) {
      console.error("Error approving lead:", e);
    }
  };

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  return { leads, loading, ignoreLead, approveLead, refresh: fetchLeads };
}
