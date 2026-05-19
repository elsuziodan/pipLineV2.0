export interface Lead {
  id: string;
  name: string;
  phone: string;
  city?: string;
  google_category?: string;
  has_website?: boolean;
  status?: string;
  contacted_at?: string;
  archived_at?: string;
  trashed_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type OutreachStatus = 'pending' | 'sent' | 'replied' | 'interested' | 'no_read' | 'blocked';

export interface OutreachMessage {
  id: string;
  client_id: string;
  status: OutreachStatus;
  speech_used?: string;
  notes?: string;
  sent_at?: string;
  replied_at?: string;
  created_at: string;
}

export function normalizePhone(rawPhone: string | undefined): { display: string; linkBase: string; waLinkBase: string } {
  if (!rawPhone) return { display: "Sin teléfono", linkBase: "", waLinkBase: "" };
  
  let digits = rawPhone.replace(/\D/g, "");
  if (!digits) return { display: "Sin teléfono", linkBase: "", waLinkBase: "" };

  if (digits.startsWith("521") && digits.length === 13) {
    digits = digits.slice(3);
  } else if (digits.startsWith("52") && digits.length === 12) {
    digits = digits.slice(2);
  }

  const formatted = digits.length === 10
    ? digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")
    : digits;

  return {
    display: `+52 ${formatted}`,
    linkBase: `52${digits}`,
    waLinkBase: `52${digits}`
  };
}
