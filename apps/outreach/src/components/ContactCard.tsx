"use client";

import { useState, useEffect, useRef } from "react";
import { Lead, normalizePhone } from "../lib/types";
import { cn } from "../lib/utils";

interface ContactCardProps {
  lead: Lead;
  isActive: boolean;
  onClick: () => void;
  index: number;
  contacted?: boolean;
  onContacted?: (leadId: string) => void;
}

export default function ContactCard({ lead, isActive, onClick, index, contacted, onContacted }: ContactCardProps) {
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTapTime = useRef<number>(0);
  const hasMoved = useRef<boolean>(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const phoneInfo = normalizePhone(lead.phone);
  const message = `hola disculpa es el número de ${lead.name}?`;

  const copyPhone = () => {
    const rawNumber = lead.phone.replace(/\D/g, "");
    const localNumber = rawNumber.length > 10 ? rawNumber.slice(-10) : rawNumber;
    navigator.clipboard.writeText(`+52${localNumber}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openWhatsApp = () => {
    const waUrl = `https://wa.me/${phoneInfo.waLinkBase}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    onContacted?.(lead.id);
  };

  const handlePhoneDesktopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) return;
    copyPhone();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!isMobile) return;
    hasMoved.current = false;
    
    touchTimer.current = setTimeout(() => {
      if (!hasMoved.current) {
        copyPhone();
        touchTimer.current = null;
      }
    }, 500);
  };

  const handleTouchMove = () => {
    hasMoved.current = true;
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!isMobile) return;
    
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
      
      if (!hasMoved.current) {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          openWhatsApp();
          lastTapTime.current = 0;
        } else {
          lastTapTime.current = now;
        }
      }
    }
  };

  const meta = [lead.city, lead.google_category].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "animate-slide-up relative p-4 cursor-pointer transition-colors duration-200",
        isActive ? "bg-surface-hover" : "bg-transparent hover:bg-surface-hover"
      )}
      onClick={onClick}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Indicator for Fabrica */}
      {lead.status === 'FABRICA' && (
        <div 
          className="absolute top-5 right-[14px] w-1 h-1 rounded-full bg-ink-accent"
          title="En Fábrica" 
        />
      )}

      {/* Business name */}
      <h2 className="font-display text-name font-bold text-ink m-0 leading-[1.15] tracking-[-0.02em]">
        {lead.name}
      </h2>

      {/* Metadata */}
      <div className="flex justify-between items-baseline mt-[5px]">
        <span className="font-body text-detail font-light text-ink-muted tracking-[0.02em]">
          {meta || '—'}
        </span>
        <span
          className={cn(
            "font-body text-micro tracking-[0.05em] cursor-pointer transition-colors duration-200",
            (copied || contacted) ? "font-medium" : "font-light",
            copied 
              ? "text-ink-accent" 
              : contacted 
                ? "text-ink-accent opacity-70" 
                : "text-ink-muted hover:text-ink"
          )}
          onClick={handlePhoneDesktopClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          title={isMobile ? "Doble tap para abrir, mantener para copiar" : "Copiar número"}
        >
          {copied ? 'Copiado!' : phoneInfo.display}
        </span>
      </div>
    </div>
  );
}
