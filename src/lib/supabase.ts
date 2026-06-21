import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !(import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
  console.warn('⚠️ Supabase credentials are not set. Realtime features will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Locker = {
  id: number;
  status: 'AVAILABLE' | 'IN_USE';
};

export type Transaction = {
  id: string;
  locker_id: number;
  nama: string;
  no_telp: string;
  durasi_jam: number;
  harga: number;
  status: 'ACTIVE' | 'COMPLETED';
  created_at: string;
  token: string;
};
