/**
 * csv_loader.ts
 * -------------
 * Carga el shortlist.csv generado por el scraper a Supabase.
 */

import * as fs from 'fs';
import { supabase } from '../config/supabase.js';
import { getLeadByPhone } from '../config/database.js';
import { pipelineEvents, type LoadReportEvent } from './pipeline_events.js';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface LoadReport {
  total: number;
  inserted: number;
  duplicates: number;
  blacklisted: number;
  errors: number;
}

// ── Normalización de teléfonos mexicanos ─────────────────────────────────────

function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+52${digits.slice(1)}`;
  return '';
}

// ── Parser de CSV simple ──────────────────────────────────────────────────────

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

async function isBlacklisted(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const { data } = await supabase.from('blacklist').select('id').eq('phone', normalized).maybeSingle();
  return data !== null;
}

// ── Función principal ─────────────────────────────────────────────────────────

export async function loadCSVToSupabase(csvPath: string): Promise<LoadReport> {
  console.log(`📥 [CSVLoader] Iniciando carga desde: ${csvPath}`);
  const report: LoadReport = { total: 0, inserted: 0, duplicates: 0, blacklisted: 0, errors: 0 };
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ [CSVLoader] Archivo no encontrado: ${csvPath}`);
    report.errors = 1;
    return report;
  }
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  report.total = rows.length;
  if (report.total === 0) return report;

  pipelineEvents.emit('loader:progress', {
    processed: 0, total: report.total, inserted: 0, duplicates: 0, blacklisted: 0, errors: 0, timestamp: new Date().toISOString(),
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name  = row['business_name'] ?? row['name'] ?? row['Business Name'] ?? '';
    const phone = row['phone'] ?? row['Phone'] ?? row['telefono'] ?? '';
    const addr  = row['address'] ?? row['Address'] ?? row['direccion'] ?? '';

    if (!phone) {
      report.errors++;
      continue;
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      report.errors++;
      continue;
    }

    try {
      const blacklisted = await isBlacklisted(normalizedPhone);
      if (blacklisted) {
        report.blacklisted++;
        continue;
      }
      const existing = await getLeadByPhone(normalizedPhone);
      if (existing) {
        report.duplicates++;
        continue;
      }

      const { error } = await supabase.from('clients').insert([{
        name:    name || 'Sin nombre',
        phone:   normalizedPhone,
        address: addr || '',
        status:  'prospecto',
        tags:    ['nuevo'],
        metadata: {
          source: 'scraper_pipeline',
          original_phone: phone,
          loaded_at: new Date().toISOString(),
          listing_url: row['listing_url'] || '',
          website_url: row['website_url'] || '',
          rating: row['rating'] || '',
          review_count: row['review_count'] || '',
          google_category: row['google_category'] || '',
        },
      }]);

      if (error) {
        if (error.code === '23505') report.duplicates++;
        else report.errors++;
      } else {
        report.inserted++;
      }
    } catch (err: unknown) {
      report.errors++;
    }

    if ((i + 1) % 5 === 0 || i === rows.length - 1) {
      pipelineEvents.emit('loader:progress', {
        processed: i + 1, total: report.total, inserted: report.inserted, duplicates: report.duplicates, blacklisted: report.blacklisted, errors: report.errors, timestamp: new Date().toISOString(),
      });
    }
  }
  return report;
}
