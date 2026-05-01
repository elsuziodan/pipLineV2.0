import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export * from './supabase';
export * from './database';

function validateEnv(): void {
  const required = [
    'META_PHONE_NUMBER_ID',
    'META_ACCESS_TOKEN',
    'META_WEBHOOK_VERIFY_TOKEN',
    'OPENROUTER_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'TELEGRAM_CRM_BOT_TOKEN',
    'TELEGRAM_CRM_CHAT_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Variables de entorno faltantes:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('Revisa tu archivo .env.local');
    process.exit(1);
  }

  console.log('✅ Todas las variables de entorno están configuradas.');
}

validateEnv();

// ─── Test de conexión (npm run test-db) ───────────────────────────────────────
if (require.main === module) {
  (async () => {
    console.log('🔌 Probando conexión a Supabase...');
    const { supabase } = await import('./supabase.js');

    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Falló la conexión:', error.message);
      process.exit(1);
    }

    console.log(`✅ Conexión OK — ${count} registros en tabla 'clients'.`);
    process.exit(0);
  })();
}
