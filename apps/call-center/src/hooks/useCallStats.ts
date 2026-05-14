"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { CallStats } from "@/lib/types";

export function useCallStats(): CallStats & { loading: boolean } {
  const [stats, setStats] = useState<CallStats>({
    interested_today: 0,
    followups_today: 0,
    in_negotiation: 0,
    uncontacted: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Interested today — calls with outcome 'interesado' created today
    const { count: interestedCount } = await supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("outcome", "interesado")
      .gte("created_at", `${today}T00:00:00`);

    // Follow-ups today — clients with follow_up_date = today
    const { count: followupCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .gte("follow_up_date", `${today}T00:00:00`)
      .lte("follow_up_date", `${today}T23:59:59`);

    // In negotiation
    const { count: negotiationCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "negociacion");

    // Uncontacted — clients with status 'prospecto' that have no calls
    const { count: prospectCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "prospecto");

    setStats({
      interested_today: interestedCount ?? 0,
      followups_today: followupCount ?? 0,
      in_negotiation: negotiationCount ?? 0,
      uncontacted: prospectCount ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("stats-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);

  return { ...stats, loading };
}
