import { useEffect, useState } from 'react';
import { supabase, type Locker } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Unlock, Lock, AlertCircle } from 'lucide-react';

export default function LokerLaptopPage() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pengecekan Kredensial Supabase
    if (!import.meta.env.VITE_SUPABASE_URL) {
      setError('Credentials Supabase belum diatur di file .env');
      setLoading(false);
      return;
    }

    const fetchLockers = async () => {
      try {
        const { data, error } = await supabase
          .from('lockers')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;
        // fallback in case of no data yet
        if (!data || data.length === 0) {
           setError("Data loker belum ada. Jalankan script SQL.");
        } else {
           setLockers(data as Locker[]);
        }
      } catch (err: any) {
        console.error('Error fetching lockers:', err.message);
        setError(`Gagal mengambil data loker. Pastikan URL & Key Supabase valid, dan tabel 'lockers' sudah dibuat.`);
      } finally {
        setLoading(false);
      }
    };

    fetchLockers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('public:lockers')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lockers' },
        (payload) => {
          console.log('Realtime update received:', payload);
          const updatedLocker = payload.new as Locker;
          setLockers((prev) =>
            prev.map((locker) =>
              locker.id === updatedLocker.id ? updatedLocker : locker
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const tutupPintu = async (id: number) => {
    try {
      // Optimistic update
      setLockers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: 'AVAILABLE' } : l))
      );

      const { error } = await supabase
        .from('lockers')
        .update({ status: 'AVAILABLE' })
        .eq('id', id);

      if (error) {
        console.error('Error updating locker status:', error.message);
        // Revert on error
        setLockers((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: 'IN_USE' } : l))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-jakarta">
        <div className="animate-pulse text-xl text-slate-600 font-medium">Memuat Sistem Loker...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-jakarta">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Locker Dashboard</h1>
          <p className="text-sm text-slate-500 font-inter mt-1">Sistem Pemantauan Digital Kampus</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
            <span className="text-sm font-medium text-slate-600">Sistem Aktif (Live)</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-[1400px] mx-auto w-full">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 max-w-2xl mx-auto mt-12">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div>
              <h2 className="text-lg font-bold text-red-800">Koneksi Database Gagal</h2>
              <p className="text-red-600 mt-2">{error}</p>
            </div>
            <div className="mt-4 text-left bg-white p-4 rounded-lg border border-red-100 text-sm font-mono w-full overflow-auto">
              <p className="text-slate-500 mb-2">// Pastikan Anda telah mengatur file .env</p>
              <p className="text-slate-800">VITE_SUPABASE_URL=your_url</p>
              <p className="text-slate-800">VITE_SUPABASE_ANON_KEY=your_key</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white p-4 text-center border-b border-slate-700">
              <h2 className="text-lg font-bold uppercase tracking-widest text-slate-300">Modul Lemari Loker Utama</h2>
            </div>
            
            {/* Locker Grid */}
            <div className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 bg-slate-900">
              {lockers.map((locker) => {
                const isAvailable = locker.status === 'AVAILABLE';
                return (
                  <div
                    key={locker.id}
                    className={cn(
                      "relative flex flex-col h-56 rounded-xl border-4 transition-all duration-300 shadow-lg overflow-hidden",
                      isAvailable 
                        ? "border-emerald-500 bg-emerald-50" 
                        : "border-red-500 bg-red-50"
                    )}
                  >
                    {/* Metal Door Effect Top */}
                    <div className={cn(
                      "h-12 w-full border-b-2 flex items-center justify-between px-3",
                      isAvailable ? "bg-emerald-100 border-emerald-200" : "bg-red-100 border-red-200"
                    )}>
                      <span className="font-mono text-xl font-bold opacity-70">
                        {String(locker.id).padStart(2, '0')}
                      </span>
                      {isAvailable ? (
                        <Lock className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Unlock className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    
                    {/* Door Body Container */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                      
                      <div className={cn(
                        "text-lg font-bold rounded-full px-4 py-1.5 shadow-sm mb-auto",
                        isAvailable 
                          ? "bg-emerald-200 text-emerald-800" 
                          : "bg-red-200 text-red-800 animate-pulse"
                      )}>
                        {isAvailable ? 'TERSEDIA' : 'TERBUKA'}
                      </div>

                      {/* Manual Override Button - Only show when IN_USE to simulate closing the door manually */}
                      {!isAvailable && (
                        <button
                          onClick={() => tutupPintu(locker.id)}
                          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg shadow transition-colors w-full active:scale-95"
                        >
                          Tutup Pintu
                        </button>
                      )}
                    </div>

                    {/* Vents simulation on locker door */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col gap-1 w-12 opacity-20">
                      <div className="h-1 bg-black rounded-full w-full"></div>
                      <div className="h-1 bg-black rounded-full w-full"></div>
                      <div className="h-1 bg-black rounded-full w-full"></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-slate-800 p-4 border-t border-slate-700 flex justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-emerald-500 border-2 border-emerald-600"></div>
                <span className="text-slate-300 text-sm font-medium">Kosong / Tertutup</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-red-500 border-2 border-red-600"></div>
                <span className="text-slate-300 text-sm font-medium">Sedang Digunakan / Terbuka</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
