import { createClient } from '@supabase/supabase-js';

// Substitua com suas credenciais REAIS do Supabase
// Você pode obter em: https://app.supabase.com/project/_/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'SUA_SUPABASE_URL_AQUI';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_SUPABASE_ANON_KEY_AQUI';

export const supabase = createClient(supabaseUrl, supabaseKey);
