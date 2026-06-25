-- 1. Buat Tabel 'lockers' (Hapus yang lama jika mau reset, atau biarkan jika sudah ada)
-- Jika ingin mereset seluruh data, uncomment 2 baris di bawah ini:
-- DROP TABLE IF EXISTS public.transactions;
-- DROP TABLE IF EXISTS public.lockers;

CREATE TABLE IF NOT EXISTS public.lockers (
  id INT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'AVAILABLE'
);

-- Buat Tabel 'transactions'
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  locker_id INT NOT NULL,
  nama TEXT NOT NULL,
  no_telp TEXT NOT NULL,
  durasi_jam INT NOT NULL,
  harga INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  token UUID DEFAULT gen_random_uuid() UNIQUE
);

-- 2. Aktifkan RLS (Row Level Security)
ALTER TABLE public.lockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Buat policy agar bisa diakses public (Drop dulu jika sudah ada agar tidak error)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lockers;
CREATE POLICY "Enable read access for all users" ON public.lockers
  AS PERMISSIVE FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.lockers;
CREATE POLICY "Enable update access for all users" ON public.lockers
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Enable access for all users on transactions" ON public.transactions;
CREATE POLICY "Enable access for all users on transactions" ON public.transactions
  AS PERMISSIVE FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 4. Insert data awal loker No. 1 sampai 15
-- Kita gunakan ON CONFLICT DO NOTHING agar tidak error jika sudah ada
INSERT INTO public.lockers (id, status)
VALUES
  (1, 'AVAILABLE'),
  (2, 'AVAILABLE'),
  (3, 'AVAILABLE'),
  (4, 'AVAILABLE'),
  (5, 'AVAILABLE'),
  (6, 'AVAILABLE'),
  (7, 'AVAILABLE'),
  (8, 'AVAILABLE'),
  (9, 'AVAILABLE'),
  (10, 'AVAILABLE'),
  (11, 'AVAILABLE'),
  (12, 'AVAILABLE'),
  (13, 'AVAILABLE'),
  (14, 'AVAILABLE'),
  (15, 'AVAILABLE')
ON CONFLICT (id) DO NOTHING;

-- 5. Aktifkan Replikasi Realtime untuk tabel 'lockers' dan 'transactions'
-- Jalankan perintah ini jika replication belum aktif
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.lockers, public.transactions;
COMMIT;
