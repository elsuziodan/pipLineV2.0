"use client";

import { useState } from "react";
import { Lead } from "../lib/types";

interface SpeechEngineProps {
  lead: Lead;
  onMessageCopied?: (leadId: string) => void;
}

export default function SpeechEngine({ lead, onMessageCopied }: SpeechEngineProps) {
  const [copied, setCopied] = useState(false);

  const message = `hola disculpa es el número de ${lead.name}?`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    onMessageCopied?.(lead.id);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="font-body bg-transparent border-none py-2 cursor-pointer text-detail font-light italic text-ink-accent text-left transition-colors leading-relaxed hover:opacity-80"
    >
      {copied ? 'Copiado ✓' : `"${message}"`}
    </button>
  );
}
