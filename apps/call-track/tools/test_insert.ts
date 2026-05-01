import { supabase } from './src/config/supabase';

async function insertTestLead() {
  const { data, error } = await supabase.from('clients').insert([
    {
      name: 'Daniel Test',
      phone: '528995067091',
      status: 'prospecto',
      tags: ['test_ahora']
    }
  ]);
  
  if (error) {
    console.error('❌ Error insertando lead de prueba:', error);
  } else {
    console.log('✅ Lead de prueba (Daniel) insertado correctamente en Supabase.');
  }
}

insertTestLead();
