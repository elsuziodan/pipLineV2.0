"use client";

import { useState, useEffect, useCallback } from "react";

export function useKanbanBoard() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kanban/cards", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (e) {
      console.error("Error fetching kanban cards:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCardStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    const previousCards = [...cards];
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );

    try {
      const res = await fetch(`/api/client/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch (e) {
      console.error("Error updating card status:", e);
      setCards(previousCards); // Rollback
    }
  };

  useEffect(() => {
    fetchCards();
    const interval = setInterval(fetchCards, 30000);
    return () => clearInterval(interval);
  }, [fetchCards]);

  return { cards, loading, updateCardStatus, refresh: fetchCards };
}
