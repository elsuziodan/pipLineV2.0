import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface CollectionPopoverProps {
  onSave: (result: 'answered' | 'no_answer' | 'promise', note: string) => void;
  onClose: () => void;
}

export function CollectionPopover({ onSave, onClose }: CollectionPopoverProps) {
  const [note, setNote] = useState('');
  const [result, setResult] = useState<'answered' | 'no_answer' | 'promise' | null>(null);
  
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside (desktop behavior)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSave = () => {
    if (result) {
      onSave(result, note);
    }
  };

  return (
    <div 
      ref={popoverRef}
      className="collection-popover absolute z-50 p-4 rounded-xl border border-[var(--color-border)] shadow-xl animate-fadeIn bg-[var(--color-bg-elevated)] backdrop-blur-md"
      style={{
        width: '300px',
        top: '100%',
        left: 0,
        marginTop: '8px'
      }}
    >
      <h4 className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-3">
        ¿Qué pasó en la llamada?
      </h4>
      
      <div className="flex flex-col gap-2 mb-3">
        <button 
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border transition-all ${
            result === 'answered' 
              ? 'bg-[rgba(0,255,136,0.15)] border-[var(--color-success)] text-[var(--color-success)] shadow-[var(--shadow-glow-success)]' 
              : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
          }`}
          onClick={() => setResult('answered')}
        >
          <CheckCircle2 size={16} /> Contestó
        </button>
        
        <button 
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border transition-all ${
            result === 'no_answer' 
              ? 'bg-[rgba(255,68,102,0.15)] border-[var(--color-danger)] text-[var(--color-danger)] shadow-[var(--shadow-glow-danger)]' 
              : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
          }`}
          onClick={() => setResult('no_answer')}
        >
          <XCircle size={16} /> No contestó
        </button>

        <button 
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border transition-all ${
            result === 'promise' 
              ? 'bg-[rgba(255,184,0,0.15)] border-[var(--color-warning)] text-[var(--color-warning)] shadow-[0_0_16px_rgba(255,184,0,0.2)]' 
              : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
          }`}
          onClick={() => setResult('promise')}
        >
          <Clock size={16} /> Prometió pagar
        </button>
      </div>

      <input
        type="text"
        className="input-field mb-3 py-2 text-[13px]"
        placeholder="Nota opcional..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />

      <div className="flex gap-2">
        <button className="btn-ghost flex-1 py-2 text-[13px]" onClick={onClose}>Cancelar</button>
        <button 
          className="btn-call flex-1 py-2 text-[13px]" 
          disabled={!result}
          onClick={handleSave}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
