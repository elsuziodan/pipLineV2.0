import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(cur);
            cur = "";
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

function normalize(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/["“”'']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fullSync() {
  console.log('🔄 Iniciando Sincronización Completa...');

  // 1. Extraer datos del CSV desde el archivo
  const csvPath = path.join(__dirname, 'prospects.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: El archivo ${csvPath} no existe.`);
    return;
  }
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.trim().split('\n').slice(1);
  const csvProspects: any[] = [];
  const validNamesSet = new Set<string>();
  const validPhonesSet = new Set<string>();

  for (const line of lines) {
    const parts = parseCSVLine(line);
    if (parts.length < 5) continue;

    const prospect = {
      name: parts[2],
      phone: parts[4],
      address: parts[5],
      city: parts[6],
      metadata: {
        prospect_tier: parts[0],
        prospect_score: parts[1],
        category: parts[3],
        website: parts[7]
      }
    };

    csvProspects.push(prospect);
    validNamesSet.add(normalize(prospect.name));
    if (prospect.phone && normalize(prospect.phone) !== 'false') {
        validPhonesSet.add(normalize(prospect.phone));
    }
  }

  // 2. Obtener clientes actuales
  const { data: dbClients, error } = await supabase
    .from('clients')
    .select('*');

  if (error) {
    console.error('❌ Error al obtener clientes:', error);
    return;
  }

  console.log(`🧐 Base de datos actual: ${dbClients.length} registros.`);

  // 3. Identificar para eliminar (In DB but not in CSV)
  const idsToDelete: string[] = [];
  for (const client of dbClients) {
    const normName = normalize(client.name);
    const normPhone = normalize(client.phone);

    const isInCSV = validNamesSet.has(normName) || (normPhone && validPhonesSet.has(normPhone));

    if (!isInCSV) {
      console.log(`🗑️ Eliminar (No está en CSV): "${client.name}"`);
      idsToDelete.push(client.id);
    }
  }

  if (idsToDelete.length > 0) {
    const { error: delError } = await supabase.from('clients').delete().in('id', idsToDelete);
    if (delError) console.error('❌ Error eliminando:', delError);
    else console.log(`✅ ${idsToDelete.length} registros eliminados.`);
  }

  // 4. Identificar para insertar (In CSV but not in DB)
  // Refrescamos lista de DB después de borrar
  const { data: remainingClients } = await supabase.from('clients').select('name, phone');
  const dbNamesSet = new Set((remainingClients || []).map(c => normalize(c.name)));
  const dbPhonesSet = new Set((remainingClients || []).map(c => normalize(c.phone)).filter(p => p !== ''));

  const toInsert: any[] = [];
  for (const p of csvProspects) {
    const normName = normalize(p.name);
    const normPhone = normalize(p.phone);

    const isInDB = dbNamesSet.has(normName) || (normPhone && dbPhonesSet.has(normPhone));

    if (!isInDB) {
      console.log(`✨ Insertar (Faltante): "${p.name}"`);
      toInsert.push({
        name: p.name,
        phone: p.phone || null,
        address: p.address || null,
        status: 'prospecto',
        metadata: p.metadata
      });
    }
  }

  if (toInsert.length > 0) {
    const { error: insError } = await supabase.from('clients').insert(toInsert);
    if (insError) console.error('❌ Error insertando:', insError);
    else console.log(`✅ ${toInsert.length} registros insertados.`);
  }

  console.log('🏁 Sincronización terminada.');
}

fullSync();
