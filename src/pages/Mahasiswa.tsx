import { useEffect, useState } from 'react';
import { supabase, type Locker } from '../lib/supabase';
import { cn } from '../lib/utils';
import { QrCode, ArrowLeft, CheckCircle2, ShieldCheck, CreditCard, X } from 'lucide-react';

export default function MahasiswaPage() {
  const [step, setStep] = useState<'HOME' | 'MAP'>('HOME');
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [activeLocker, setActiveLocker] = useState<number | null>(null);
  const [selectedLockerToRent, setSelectedLockerToRent] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load active session from LocalStorage
  useEffect(() => {
    const savedLocker = localStorage.getItem('activeLockerSession');
    if (savedLocker) {
      setActiveLocker(parseInt(savedLocker, 10));
    }
  }, []);

  // Fetch lockes and subscribe when in MAP view or if we have an active session (to verify)
  useEffect(() => {
    if (step === 'HOME' && !activeLocker) return;

    const fetchLockers = async () => {
      const { data, error } = await supabase
        .from('lockers')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) {
        setLockers(data as Locker[]);
      }
    };

    fetchLockers();

    const channel = supabase
      .channel('public:lockers:mobile')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lockers' },
        (payload) => {
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
  }, [step, activeLocker]);

  const handleSimulateScan = () => {
    setStep('MAP');
  };

  const processPaymentAndRent = async () => {
    if (!selectedLockerToRent) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('lockers')
        .update({ status: 'IN_USE' })
        .eq('id', selectedLockerToRent);

      if (error) throw error;

      // Success
      localStorage.setItem('activeLockerSession', selectedLockerToRent.toString());
      setActiveLocker(selectedLockerToRent);
      setSelectedLockerToRent(null);
      setStep('HOME'); // go back to home to show active session
    } catch (err: any) {
      alert('Gagal menyewa loker: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const selesaikanSewa = async () => {
    if (!activeLocker) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('lockers')
        .update({ status: 'AVAILABLE' })
        .eq('id', activeLocker);

      if (error) throw error;

      // Success
      localStorage.removeItem('activeLockerSession');
      setActiveLocker(null);
    } catch (err: any) {
      alert('Gagal menyelesaikan sewa: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ----- COMPONENT: Active Session View -----
  if (activeLocker) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 font-jakarta flex flex-col justify-center px-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full mx-auto border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Locker Terbuka!</h2>
          <p className="text-slate-500 text-sm mb-6 font-inter">
            Silakan masukkan barang Anda dan tutup pintu rapat-rapat.
          </p>
          
          <div className="bg-slate-100 rounded-xl p-6 mb-8">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-widest block mb-1">
              Nomor Loker
            </span>
            <span className="text-5xl font-bold text-slate-900">
              {String(activeLocker).padStart(2, '0')}
            </span>
          </div>

          <button
            onClick={selesaikanSewa}
            disabled={isProcessing}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? 'Memproses...' : 'Selesai Menggunakan Loker'}
          </button>
        </div>
      </div>
    );
  }

  // ----- COMPONENT: Home / Scan View -----
  if (step === 'HOME') {
    return (
      <div className="min-h-[100dvh] bg-slate-100 font-jakarta flex flex-col relative overflow-hidden">
        {/* Top App Bar area style */}
        <div className="bg-emerald-600 pt-12 pb-8 px-6 text-white rounded-b-3xl shadow-md z-10 relative">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Bintang Lima</h1>
            <ShieldCheck className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-emerald-100 text-sm font-inter">
            Simpan barangmu dengan aman dan praktis di area kampus.
          </p>
        </div>

        <div className="flex-1 px-6 pt-12 pb-8 flex flex-col justify-center relative">
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <QrCode className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Scan QR Loker</h2>
              <p className="text-slate-500 text-sm mb-8 font-inter">
                Arahkan kamera HP kamu ke QR Code di mesin loker utama. 
                <br/><br/>(Untuk demo, klik tombol di bawah)
              </p>
              
              <button
                onClick={handleSimulateScan}
                className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-600 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
              >
                <QrCode className="w-5 h-5" /> Mulai Scan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- COMPONENT: Map / Choose Locker View -----
  return (
    <div className="min-h-[100dvh] bg-slate-50 font-jakarta flex flex-col">
      <header className="bg-white p-4 flex items-center gap-3 border-b border-slate-200 sticky top-0 z-20">
        <button onClick={() => setStep('HOME')} className="p-2 -ml-2 text-slate-600 active:bg-slate-100 rounded-full transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg text-slate-800">Pilih Loker</span>
      </header>

      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
             <span className="text-sm font-bold text-slate-800">Status Mesin</span>
             <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg">ONLINE</span>
          </div>
          <p className="text-xs text-slate-500 font-inter">Pilih kotak hijau yang tersedia untuk menyimpan barangmu.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {lockers.map((locker) => {
            const isAvailable = locker.status === 'AVAILABLE';
            return (
              <button
                key={locker.id}
                disabled={!isAvailable}
                onClick={() => setSelectedLockerToRent(locker.id)}
                className={cn(
                  "aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-sm relative overflow-hidden",
                  isAvailable 
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 active:bg-emerald-100 active:scale-95" 
                    : "bg-slate-100 border-slate-300 text-slate-400 opacity-70 cursor-not-allowed"
                )}
              >
                <span className="text-2xl font-bold font-mono">
                  {String(locker.id).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">
                  {isAvailable ? 'Pilih' : 'Penuh'}
                </span>
                
                {/* Visual door lines */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-[2px] opacity-20">
                   <div className="w-[2px] h-3 bg-current rounded-full"></div>
                   <div className="w-[2px] h-3 bg-current rounded-full"></div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom Sheet Overlay */}
      {selectedLockerToRent !== null && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedLockerToRent(null)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl p-6 min-h-[300px] animate-in slide-in-from-bottom border-t border-slate-200">
            <button 
              onClick={() => setSelectedLockerToRent(null)}
              className="absolute right-4 top-4 p-2 bg-slate-100 rounded-full text-slate-500 active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Pembayaran Sewa</h3>
              <p className="text-slate-500 text-sm mt-1 font-inter">Kotak Loker No. {String(selectedLockerToRent).padStart(2, '0')}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-8 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">QRIS / E-Wallet</p>
                  <p className="text-xs text-slate-500">Ovo, Gopay, Dana, dll</p>
                </div>
              </div>
              <span className="font-bold text-xl text-slate-900">Rp2.000</span>
            </div>

            <button
              onClick={processPaymentAndRent}
              disabled={isProcessing}
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:bg-emerald-600 transition active:scale-95 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
            >
              {isProcessing ? 'Memproses...' : 'Simulasi Bayar & Buka Pintu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
