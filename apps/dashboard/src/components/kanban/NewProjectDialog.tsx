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
        <Button className="flex items-center gap-2 bg-zinc-100 text-zinc-950 rounded-lg text-[11px] font-bold hover:bg-white transition-all h-8 px-4 active:scale-95">
          <Plus size={14} strokeWidth={3} />
          NUEVO PROYECTO
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0C0C0C] border-white/[0.05] text-zinc-50 sm:max-w-[425px] rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-white/[0.05] pb-4">
          <DialogTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Añadir a Producción
          </DialogTitle>
        </DialogHeader>
        <div className="pt-6 pb-2">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <Input
              placeholder="Nombre o teléfono..."
              className="bg-white/[0.02] border-white/[0.05] pl-10 h-10 text-[13px] focus-visible:ring-zinc-800 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-80 -mr-4 pr-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="space-y-1.5">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelect(client.id)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/[0.05] group"
                  >
                    <div className="text-[13px] font-medium text-zinc-400 group-hover:text-zinc-100 transition-colors">{client.name}</div>
                    <div className="text-[10px] text-zinc-600 font-medium mt-0.5">+{client.phone}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-zinc-600 text-xs font-medium">
                No se encontraron clientes.
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
