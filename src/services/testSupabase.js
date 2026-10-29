import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      console.error('❌ SUPABASE CONNECTION FAILED:', error.message);

      return false;
    }

    console.log('✅ SUPABASE CONNECTION SUCCESSFUL');

    console.log('RLS protected profile result:', data);

    return true;
  } catch (error) {
    console.error('❌ SUPABASE CONNECTION ERROR:', error);

    return false;
  }
}
