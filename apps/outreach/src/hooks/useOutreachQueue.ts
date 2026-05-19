"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Lead } from "../lib/types";

export function useOutreachQueue() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    
    // Default to mock data if no Supabase URL is present (or fails)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.warn("No Supabase URL found, using mock data");
      setLeads([
        {
          id: "1",
          name: "Taller Mecánico Hermanos M",
          phone: "525551234567",
          city: "CDMX",
          google_category: "Taller Automotriz",
          has_website: false,
          created_at: new Date().toISOString()
        },
        {
          id: "2",
          name: "Aluminio y Vidrio San José",
          phone: "525559876543",
          city: "Guadalajara",
          google_category: "Instalador de Aluminio",
          has_website: true,
          created_at: new Date().toISOString()
        }
      ]);
      setLoading(false);
      return;
    }

    try {
      // Fetch leads that have not been blocked or lost
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .not('status', 'in', '("perdido","archived")')
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLeads(data as Lead[]);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, loading, refresh: fetchLeads };
}
