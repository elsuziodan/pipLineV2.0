"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Lead, FilterType } from "@/lib/types";

export function useCallQueue() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [calls, setCalls] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .not("status", "eq", "perdido")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      setLoading(false);
      return;
    }

    // Sort by prospect_score descending
    const sorted = (data || []).sort((a: Lead, b: Lead) => {
      const scoreA = (a.metadata?.prospect_score as number) ?? 0;
      const scoreB = (b.metadata?.prospect_score as number) ?? 0;
      return scoreB - scoreA;
    });

    setAllLeads(sorted);
    setLoading(false);
  }, []);

  // Fetch call outcomes per client for filtering
  const fetchCalls = useCallback(async () => {
    const { data } = await supabase
      .from("calls")
      .select("client_id, metadata");

    if (data) {
      const map: Record<string, string[]> = {};
      data.forEach((c: { client_id: string; metadata?: any }) => {
        const outcome = c.metadata?.outcome;
        if (!map[c.client_id]) map[c.client_id] = [];
        if (outcome) map[c.client_id].push(outcome);
      });
      setCalls(map);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchCalls();
  }, [fetchLeads, fetchCalls]);

  // Filter leads
  const filteredLeads = allLeads.filter((lead) => {
    const clientCalls = calls[lead.id] || [];
    const today = new Date().toISOString().slice(0, 10);

    switch (filter) {
      case "uncontacted":
        return clientCalls.length === 0;
      case "interested":
        return clientCalls.includes("interesado");
      case "followup_today":
        return lead.follow_up_date?.slice(0, 10) === today;
      case "top_tier": {
        const tier = (lead.metadata?.prospect_tier as string) ?? "";
        return tier === "top" || tier === "high";
      }
      default:
        return true;
    }
  });

  const navigateNext = useCallback(() => {
    setSelectedIndex((prev) => Math.min(prev + 1, filteredLeads.length - 1));
  }, [filteredLeads.length]);

  const navigatePrev = useCallback(() => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Reset index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  return {
    leads: filteredLeads,
    allLeads,
    filter,
    setFilter,
    selectedIndex,
    setSelectedIndex,
    navigateNext,
    navigatePrev,
    loading,
    refresh: () => { fetchLeads(); fetchCalls(); },
    calls,
  };
}
