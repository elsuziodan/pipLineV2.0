// Type definitions for the Call Center Dashboard

export interface Lead {
  id: string;
  name: string;
  phone: string;
  address?: string;
  status?: string;
  tags?: string[];
  follow_up_date?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Call {
  id: string;
  client_id: string;
  notes: string;
  type: string;
  outcome?: string;
  follow_up_at?: string;
  call_source?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface IntakeForm {
  id: string;
  client_id: string;
  owner_name?: string;
  secondary_phone?: string;
  email?: string;
  business_hours?: string;
  main_services?: string[];
  differentiator?: string;
  brands?: string;
  years_experience?: number;
  facebook_url?: string;
  instagram_url?: string;
  has_logo?: boolean;
  logo_url?: string;
  preferred_colors?: string;
  tagline?: string;
  coverage_area?: string;
  offers_free_quotes?: boolean;
  primary_cta?: string;
  has_work_photos?: boolean;
  seller_notes?: string;
  urgency?: string;
  created_at: string;
  updated_at: string;
}

export type FilterType = 'all' | 'uncontacted' | 'interested' | 'followup_today' | 'top_tier';

export type OutcomeType = 'interesado' | 'seguimiento' | 'no_interesado' | 'no_contesta' | 'equivocado';

export interface CallStats {
  interested_today: number;
  followups_today: number;
  in_negotiation: number;
  uncontacted: number;
}

// Helper to safely get metadata fields
export function getMeta(lead: Lead, key: string): unknown {
  return lead.metadata?.[key];
}

export function getMetaStr(lead: Lead, key: string): string {
  const val = lead.metadata?.[key];
  return typeof val === 'string' ? val : '';
}

export function getMetaNum(lead: Lead, key: string): number {
  const val = lead.metadata?.[key];
  return typeof val === 'number' ? val : 0;
}

export function getMetaBool(lead: Lead, key: string): boolean {
  return Boolean(lead.metadata?.[key]);
}

export function getTierClass(tier: string): string {
  switch (tier?.toLowerCase()) {
    case 'top': return 'pill-top';
    case 'high': return 'pill-high';
    case 'medium': return 'pill-medium';
    case 'low': return 'pill-low';
    default: return 'pill-low';
  }
}

export function getPitchClass(fit: string): string {
  switch (fit?.toLowerCase()) {
    case 'excellent': return 'pill-excellent';
    case 'good': return 'pill-good';
    case 'weak': return 'pill-weak';
    default: return 'pill-weak';
  }
}
