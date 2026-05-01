"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NewProjectDialog({ onProjectAdded }: { onProjectAdded: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  ).slice(0, 10);

  const handleSelect = async (id: string) => {
    try {
      const res = await fetch(`/api/client/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FABRICA" }),
      });
      if (res.ok) {
        onProjectAdded(id);
        setOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-zinc-50 text-zinc-950 rounded-md text-xs font-bold hover:bg-zinc-200 transition-colors h-8">
          <Plus size={14} />
          NUEVO PROYECTO
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Añadir Cliente a Producción
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar cliente por nombre o teléfono..."
              className="bg-zinc-900 border-zinc-800 pl-10 text-sm focus-visible:ring-zinc-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-72 pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="space-y-1">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelect(client.id)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800 group"
                  >
                    <div className="text-sm font-medium text-zinc-50 group-hover:text-white">{client.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">+{client.phone}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-600 text-sm">
                No se encontraron clientes.
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
