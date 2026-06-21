import { useEffect, useState } from 'react';
import { supabase, type Locker } from '../lib/supabase';
import { cn } from '../lib/utils';
import { QrCode, ArrowLeft, CheckCircle2, ShieldCheck, CreditCard, X, User, Phone, Clock } from 'lucide-react';

const DURATIONS = [
  { hours: 2, label: '2 Jam', price: 5000 },
  { hours: 6, label: '6 Jam', price: 10000 },
  { hours: 24, label: '1 Hari', price: 20000 },
];

export default function MahasiswaPage() {
  const [step, setStep] = useState<'HOME' | 'INPUT_DATA' | 'MAP'>('HOME');
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [activeSession, setActiveSession] = useState<{ id: number, nama: string, durasiJam: number, startTime: number } | null>(null);
  const [selectedLockerToRent, setSelectedLockerToRent] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [nama, setNama] = useState('');
  const [noTelp, setNoTelp] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number>(2);

  const [showLegacyConfirmPopup, setShowLegacyConfirmPopup] = useState(false);
  const [legacyTimeLeft, setLegacyTimeLeft] = useState<{ hours: number, minutes: number, seconds: number } | null>(null);

  // Load active session from LocalStorage
  useEffect(() => {
    const savedSession = localStorage.getItem('activeLockerSessionData');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setActiveSession(parsed);
      } catch (e) {
        console.error(e);
      }
    } else {
      // Backward compatibility with previous version
      const oldId = localStorage.getItem('activeLockerSession');
      if (oldId) {
        setActiveSession({ id: parseInt(oldId, 10), nama: 'Mahasiswa', durasiJam: 2, startTime: Date.now(), token: '' });
      }
    }
  }, []);

  // Timer for legacy session view
  useEffect(() => {
    if (!activeSession || activeSession.token) return;

    const endTime = activeSession.startTime + (activeSession.durasiJam * 60 * 60 * 1000);

    const updateTimer = () => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setLegacyTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        setLegacyTimeLeft({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleLegacyAmbilSelesai = () => {
    if (legacyTimeLeft && (legacyTimeLeft.hours > 0 || legacyTimeLeft.minutes > 0 || legacyTimeLeft.seconds > 0)) {
      setShowLegacyConfirmPopup(true);
    } else {
      selesaikanSewa();
    }
  };

  // Fetch lockers and subscribe when not in HOME view or if we have an active session
  useEffect(() => {
    if (step === 'HOME' && !activeSession) return;

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
  }, [step, activeSession]);

  const handleSimulateScan = () => {
    setStep('INPUT_DATA');
  };

  const handleDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nama && noTelp) {
      setStep('MAP');
    }
  };

  const processPaymentAndRent = async () => {
    if (!selectedLockerToRent) return;
    setIsProcessing(true);

    try {
      // 1. Update locker status
      const { error } = await supabase
        .from('lockers')
        .update({ status: 'IN_USE' })
        .eq('id', selectedLockerToRent);

      if (error) throw error;

      // 2. Create transaction record
      const price = DURATIONS.find(d => d.hours === selectedDuration)?.price || 0;
      
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({
          locker_id: selectedLockerToRent,
          nama: nama,
          no_telp: noTelp,
          durasi_jam: selectedDuration,
          harga: price,
          status: 'ACTIVE'
        })
        .select()
        .single();
        
      if (txError) {
        console.error("Error creating transaction", txError.message);
        // Fallback gracefully just in case
      }

      // 3. Save session and redirect
      const sessionData = {
        id: selectedLockerToRent,
        nama,
        noTelp,
        durasiJam: selectedDuration,
        startTime: Date.now(),
        token: tx?.token || ''
      };
      
      localStorage.setItem('activeLockerSessionData', JSON.stringify(sessionData));
      setActiveSession(sessionData);
      setSelectedLockerToRent(null);
      
      // Redirect to ticket page if token exists
      if (tx?.token) {
        window.location.href = `/tiket/${tx.token}`;
      } else {
        setStep('HOME'); // Fallback purely if transaction failed but locker update passed
      }
    } catch (err: any) {
      alert('Gagal menyewa loker: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const selesaikanSewa = async () => {
    if (!activeSession) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('lockers')
        .update({ status: 'AVAILABLE' })
        .eq('id', activeSession.id);

      if (error) throw error;

      // Success
      localStorage.removeItem('activeLockerSessionData');
      localStorage.removeItem('activeLockerSession');
      setActiveSession(null);
      setStep('HOME');
      setNama('');
      setNoTelp('');
    } catch (err: any) {
      alert('Gagal menyelesaikan sewa: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ----- COMPONENT: Active Session View -----
  if (activeSession) {
    if (activeSession.token) {
      window.location.href = `/tiket/${activeSession.token}`;
      return null;
    }
    
    // Fallback if no token (legacy session)
    return (
      <div className="min-h-[100dvh] bg-slate-50 font-jakarta flex flex-col justify-center px-6 relative overflow-hidden">
        {showLegacyConfirmPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLegacyConfirmPopup(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative z-10 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Selesai Sekarang?</h2>
              <p className="text-slate-600 font-inter mb-6">
                Anda yakin akan buka loker? Waktu sewa Anda masih tersisa.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowLegacyConfirmPopup(false);
                    selesaikanSewa();
                  }}
                  className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-600 transition"
                >
                  Iya, Buka Locker
                </button>
                <button
                  onClick={() => setShowLegacyConfirmPopup(false)}
                  className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-200 transition"
                >
                  Tidak Jadi, Kepencet
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full mx-auto border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Hai, {activeSession.nama}</h2>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 mx-auto w-full">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 text-center">Sisa Waktu</p>
            {legacyTimeLeft ? (
              <p className={legacyTimeLeft.hours === 0 && legacyTimeLeft.minutes < 15 ? "text-red-600 font-bold text-3xl font-mono text-center tracking-widest" : "text-slate-900 font-bold text-3xl font-mono text-center tracking-widest"}>
                {String(legacyTimeLeft.hours).padStart(2, '0')}:{String(legacyTimeLeft.minutes).padStart(2, '0')}:{String(legacyTimeLeft.seconds).padStart(2, '0')}
              </p>
            ) : (
              <p className="text-slate-400 font-bold text-3xl font-mono text-center tracking-widest">--:--:--</p>
            )}
            <p className="text-emerald-600 font-bold mt-2 text-sm flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Paket: {activeSession.durasiJam} Jam
            </p>
          </div>

          <p className="text-slate-500 text-sm mb-6 font-inter">
            Pintu loker terbuka! Silakan masukkan barang Anda dan tutup pintu rapat-rapat.
          </p>
          
          <div className="bg-slate-100 rounded-xl p-6 mb-8 relative overflow-hidden">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-widest block mb-1">
              Nomor Loker
            </span>
            <span className="text-5xl font-bold text-slate-900">
              {String(activeSession.id).padStart(2, '0')}
            </span>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 rounded-bl-full opacity-10"></div>
          </div>

          <button
            onClick={handleLegacyAmbilSelesai}
            disabled={isProcessing}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? 'Memproses...' : 'Selesai & Kunci Loker'}
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

  // ----- COMPONENT: Input Data View -----
  if (step === 'INPUT_DATA') {
    return (
      <div className="min-h-[100dvh] bg-slate-50 font-jakarta flex flex-col">
        <header className="bg-white p-4 flex items-center gap-3 border-b border-slate-200 sticky top-0 z-20">
          <button onClick={() => setStep('HOME')} className="p-2 -ml-2 text-slate-600 active:bg-slate-100 rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg text-slate-800">Isi Data Diri</span>
        </header>

        <main className="flex-1 p-6 flex flex-col">
          <form onSubmit={handleDataSubmit} className="max-w-sm mx-auto w-full flex-1 flex flex-col">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 mt-4">
              <p className="text-slate-500 text-sm font-inter mb-6">
                Masukkan nama dan nomor telepon Anda untuk memulai penyewaan loker.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-500" /> Nama Lengkap
                  </label>
                  <input 
                    type="text" 
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-500" /> Nomor Telepon / WA
                  </label>
                  <input 
                    type="tel" 
                    required
                    value={noTelp}
                    onChange={(e) => setNoTelp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    placeholder="Contoh: 081234567890"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!nama.trim() || !noTelp.trim()}
              className="mt-auto w-full bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:bg-emerald-600 transition active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              Lanjutkan Pilih Loker
            </button>
          </form>
        </main>
      </div>
    );
  }

  // ----- COMPONENT: Map / Choose Locker View -----
  return (
    <div className="min-h-[100dvh] bg-slate-50 font-jakarta flex flex-col">
      <header className="bg-white p-4 flex items-center gap-3 border-b border-slate-200 sticky top-0 z-20">
        <button onClick={() => setStep('INPUT_DATA')} className="p-2 -ml-2 text-slate-600 active:bg-slate-100 rounded-full transition">
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
          <div className="relative bg-white rounded-t-3xl shadow-2xl p-6 min-h-[400px] animate-in slide-in-from-bottom border-t border-slate-200">
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

            {/* Duration Selector */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-3">Pilih Durasi Sewa</label>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((dur) => (
                  <button
                    key={dur.hours}
                    onClick={() => setSelectedDuration(dur.hours)}
                    className={cn(
                      "py-3 px-2 rounded-xl border-2 text-center transition-all",
                      selectedDuration === dur.hours
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    )}
                  >
                    <div className="text-sm">{dur.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-8 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">Total Tagihan</p>
                  <p className="text-xs text-slate-500">QRIS / E-Wallet</p>
                </div>
              </div>
              <span className="font-bold text-2xl text-slate-900">
                Rp{(DURATIONS.find(d => d.hours === selectedDuration)?.price || 0).toLocaleString('id-ID')}
              </span>
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
