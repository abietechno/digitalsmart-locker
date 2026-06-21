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

  // Payment Popup State
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [pendingSessionData, setPendingSessionData] = useState<any>(null);

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
      }

      // 3. Generate Mayar.id Payment Link (Demo)
      let paymentLink = null;
      try {
        const MAYAR_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiYWVhZDk0Mi02Nzc0LTRiZGUtOTQ4ZS05NzBlMzY3MTA3MWEiLCJhY2NvdW50SWQiOiI4NTU5ZTUyZC1iOTQ1LTQwOTUtOTJhYS1iY2U2YjkzZTIwMzEiLCJjcmVhdGVkQXQiOiIxNzgyMDM0NDQzMDI4Iiwicm9sZSI6ImRldmVsb3BlciIsInNjb3BlIjp7InJlYWQiOnRydWUsIndyaXRlIjp0cnVlfSwic3ViIjoiYWJpZXRlY2huby5pZEBnbWFpbC5jb20iLCJuYW1lIjoiQUJJRSBURUNITk9MT0dZIFNPTFVUSU9OUyIsImxpbmsiOiJhYmlldGVjaG5vIiwiaXNTZWxmRG9tYWluIjpudWxsLCJpYXQiOjE3ODIwMzQ0NDN9.gBYi42BpryH447SipToF7M0nd_0p44_ZGk7VPuQ18HVup68sphYxaEZR-MCEC8kEltA_d7lGQiKycksVEZwi3NpbczYM6Jfa6dYTBBY4EWcQGQlFw9Nf2_n09-eFbQRXC-3klj0tt393TDlYI1xFYdWPITHw7ysSs6ORIDsc65KhiCLpGOCRBPp_OHnIEnCPCycPQl7sLajG0yA9a7cz2kw__LFKipSo2bPaL0bBWhSc4kev-RVghDbatB4GfnkNOQf-K1idcpZBfSaioj_Hqg-xYo15TVXvpZIz_FQQugxeCuRgIjVhJeEhtw2pmAEn6i91c2hHjmKF8gysh4S8wQ";
        const response = await fetch('https://api.mayar.id/hl/v1/payment/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MAYAR_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Loker ${String(selectedLockerToRent).padStart(2, '0')} - Bintang Lima`,
            amount: price,
            description: `Sewa loker untuk ${nama} (${selectedDuration} Jam)`
          })
        });
        
        const mayarData = await response.json();
        if (mayarData && mayarData.data && mayarData.data.link) {
          paymentLink = mayarData.data.link;
        }
      } catch (mayarErr) {
        console.error("Mayar setup error:", mayarErr);
      }

      const sessionData = {
        id: selectedLockerToRent,
        nama,
        noTelp,
        durasiJam: selectedDuration,
        startTime: Date.now(),
        token: tx?.token || '',
        transaction_id: tx?.id || null
      };
      
      if (paymentLink) {
        setPendingSessionData(sessionData);
        setPaymentUrl(paymentLink);
        setShowPaymentPopup(true);
      } else {
        localStorage.setItem('activeLockerSessionData', JSON.stringify(sessionData));
        setActiveSession(sessionData);
        setSelectedLockerToRent(null);
        
        if (tx?.token) {
          window.location.href = `/tiket/${tx.token}`;
        } else {
          setStep('HOME'); // Fallback purely if transaction failed but locker update passed
        }
      }
    } catch (err: any) {
      alert('Gagal menyewa loker: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (pendingSessionData) {
      const finalSession = {
        ...pendingSessionData,
        startTime: Date.now() // start timer from when they finish paying
      };
      localStorage.setItem('activeLockerSessionData', JSON.stringify(finalSession));
      setActiveSession(finalSession);
      setSelectedLockerToRent(null);
      if (finalSession.token) {
        window.location.href = `/tiket/${finalSession.token}`;
      } else {
        setStep('HOME');
      }
    }
    setShowPaymentPopup(false);
    setPaymentUrl('');
    setPendingSessionData(null);
  };

  const handlePaymentCancel = async () => {
    // Optionally revert the locker to AVAILABLE and transaction to CANCELLED
    if (pendingSessionData) {
      try {
        await supabase.from('lockers').update({ status: 'AVAILABLE' }).eq('id', pendingSessionData.id);
        if (pendingSessionData.transaction_id) {
          await supabase.from('transactions').update({ status: 'CANCELLED' }).eq('id', pendingSessionData.transaction_id);
        }
      } catch (e) {
        console.error("Error reverting payment cancel", e);
      }
    }
    setShowPaymentPopup(false);
    setPaymentUrl('');
    setPendingSessionData(null);
    setSelectedLockerToRent(null);
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
      <div className="min-h-[100dvh] bg-[#F2F2F7] font-jakarta flex flex-col justify-center px-4 relative overflow-hidden">
        {showLegacyConfirmPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLegacyConfirmPopup(false)}></div>
            <div className="bg-white/90 backdrop-blur-xl rounded-[14px] w-[270px] relative z-10 text-center animate-in zoom-in-95 overflow-hidden shadow-2xl border border-black/5">
              <div className="pt-5 px-4 pb-4">
                <h2 className="text-[17px] font-semibold text-black mb-1">Akhiri Sewa?</h2>
                <p className="text-[13px] text-[#3C3C43]">
                  Waktu sewa masih tersisa. Yakin ingin membuka loker dan menyelesaikan sewa?
                </p>
              </div>
              <div className="flex border-t border-black/10">
                <button
                  onClick={() => setShowLegacyConfirmPopup(false)}
                  className="flex-1 py-[11px] text-[17px] text-[#007AFF] border-r border-black/10 active:bg-black/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setShowLegacyConfirmPopup(false);
                    selesaikanSewa();
                  }}
                  className="flex-1 py-[11px] text-[17px] text-[#FF3B30] font-semibold active:bg-black/5 transition-colors"
                >
                  Akhiri
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-[20px] p-6 text-center shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100/50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#34C759]" />
            </div>
            <h2 className="text-[22px] font-bold text-black mb-1">Hai, {activeSession.nama}</h2>
            
            <p className="text-[#3C3C43] text-[15px] mb-6 font-inter">
              Pintu loker terbuka! Silakan masukkan barang Anda dan tutup pintu rapat-rapat.
            </p>

            <div className="w-full bg-[#F2F2F7] rounded-[14px] py-6 px-4 mb-6">
              <span className="text-[13px] font-medium text-[#3C3C43]/60 uppercase tracking-widest block mb-2">Sisa Waktu</span>
              {legacyTimeLeft ? (
                <p className={cn("font-mono text-4xl mb-1 tracking-tight", legacyTimeLeft.hours === 0 && legacyTimeLeft.minutes < 15 ? "text-[#FF3B30] font-semibold" : "text-black")}>
                  {String(legacyTimeLeft.hours).padStart(2, '0')}:{String(legacyTimeLeft.minutes).padStart(2, '0')}:{String(legacyTimeLeft.seconds).padStart(2, '0')}
                </p>
              ) : (
                <p className="text-[#8E8E93] text-4xl font-mono mb-1 tracking-tight">--:--:--</p>
              )}
              <span className="text-[13px] text-[#3C3C43]">Paket {activeSession.durasiJam} Jam</span>
            </div>
            
            <div className="w-full mb-6 relative">
               <div className="flex justify-between items-center bg-white border border-black/5 rounded-[10px] p-4 shadow-sm">
                 <span className="text-[17px] text-[#3C3C43]">Nomor Loker</span>
                 <span className="text-[22px] font-bold text-black font-mono tracking-tighter">{String(activeSession.id).padStart(2, '0')}</span>
               </div>
            </div>

            <button
              onClick={handleLegacyAmbilSelesai}
              disabled={isProcessing}
              className="w-full bg-[#007AFF] text-white font-semibold py-[14px] rounded-xl active:opacity-70 disabled:opacity-50 transition-opacity text-[17px] flex items-center justify-center gap-2"
            >
              {isProcessing ? 'Memproses...' : 'Selesai & Kunci'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- COMPONENT: Home / Scan View -----
  if (step === 'HOME') {
    return (
      <div className="min-h-[100dvh] bg-[#F2F2F7] font-jakarta flex flex-col relative overflow-hidden">
        <div className="px-6 pt-20 pb-6">
          <h1 className="text-[34px] font-bold tracking-tight text-black flex items-center gap-3">
            Bintang Lima <ShieldCheck className="w-8 h-8 text-[#007AFF]" />
          </h1>
          <p className="text-[#3C3C43] text-[15px] mt-2">
            Simpan barangmu dengan aman dan praktis di area kampus.
          </p>
        </div>

        <div className="flex-1 px-4 flex flex-col relative pb-8">
          <div className="w-full max-w-sm mx-auto h-full flex flex-col">
            <div className="bg-white rounded-[20px] p-6 text-center shadow-sm flex flex-col items-center border border-black/5 mt-4">
              <div className="w-20 h-20 bg-[#007AFF]/10 rounded-full flex items-center justify-center mb-5">
                <QrCode className="w-10 h-10 text-[#007AFF]" />
              </div>
              <h2 className="text-[20px] font-semibold text-black mb-2">Scan QR Loker</h2>
              <p className="text-[#3C3C43] text-[15px] mb-8 font-inter">
                Arahkan kamera HP kamu ke QR Code di mesin loker utama. 
                <br/><br/><span className="text-[13px] text-[#8E8E93]">(Untuk demo, klik tombol di bawah)</span>
              </p>
              
              <button
                onClick={handleSimulateScan}
                className="w-full bg-[#007AFF] text-white font-semibold py-[14px] rounded-xl active:opacity-70 transition-opacity text-[17px] flex items-center justify-center gap-2 shadow-sm"
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
      <div className="min-h-[100dvh] bg-[#F2F2F7] font-jakarta flex flex-col">
        <header className="bg-white/80 backdrop-blur-md p-4 flex items-center relative border-b border-black/5 sticky top-0 z-20">
          <button onClick={() => setStep('HOME')} className="absolute left-4 text-[#007AFF] active:opacity-50 transition-opacity flex items-center gap-[2px]">
            <ArrowLeft className="w-5 h-5" /> <span className="text-[17px]">Kembali</span>
          </button>
          <span className="font-semibold text-[17px] text-black w-full text-center">Isi Data Diri</span>
        </header>

        <main className="flex-1 p-4 flex flex-col">
          <form onSubmit={handleDataSubmit} className="max-w-sm mx-auto w-full flex-1 flex flex-col">
            <div className="px-2 mt-2 mb-2">
              <p className="text-[#3C3C43] text-[13px] uppercase ml-2">
                Informasi Penyewa
              </p>
            </div>

            <div className="bg-white rounded-[10px] overflow-hidden mb-8 shadow-sm border border-black/5">
              <div className="p-4 border-b border-black/5 flex items-center gap-4">
                <span className="w-[72px] text-[17px] text-black">Nama</span>
                <input 
                  type="text" 
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="flex-1 bg-transparent text-[17px] text-black focus:outline-none placeholder:text-[#3C3C43]/30"
                  placeholder="Budi Santoso"
                />
              </div>
              <div className="p-4 flex items-center gap-4">
                <span className="w-[72px] text-[17px] text-black">Telepon</span>
                <input 
                  type="tel" 
                  required
                  value={noTelp}
                  onChange={(e) => setNoTelp(e.target.value)}
                  className="flex-1 bg-transparent text-[17px] text-black focus:outline-none placeholder:text-[#3C3C43]/30"
                  placeholder="081234567890"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!nama.trim() || !noTelp.trim()}
              className="mt-auto mb-4 w-full bg-[#007AFF] text-white font-semibold py-[14px] rounded-xl active:opacity-70 disabled:opacity-50 transition-opacity text-[17px] shadow-sm"
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
    <div className="min-h-[100dvh] bg-[#F2F2F7] font-jakarta flex flex-col">
      <header className="bg-white/80 backdrop-blur-md p-4 flex items-center relative border-b border-black/5 sticky top-0 z-20">
        <button onClick={() => setStep('INPUT_DATA')} className="absolute left-4 text-[#007AFF] active:opacity-50 transition-opacity flex items-center gap-[2px]">
          <ArrowLeft className="w-5 h-5" /> <span className="text-[17px]">Kembali</span>
        </button>
        <span className="font-semibold text-[17px] text-black w-full text-center">Pilih Loker</span>
      </header>

      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="px-2 mb-6 mt-2 max-w-md mx-auto">
          <div className="bg-white rounded-[10px] p-4 flex items-center justify-between shadow-sm border border-black/5">
             <div className="flex flex-col">
               <span className="text-[13px] text-[#3C3C43] mb-0.5">Lokasi</span>
               <span className="text-[17px] text-black font-semibold">Loker Area Utama</span>
             </div>
             <span className="text-[13px] font-medium px-2 py-1 bg-[#34C759]/10 text-[#34C759] rounded-md">ONLINE</span>
          </div>
        </div>

        <div className="px-2 mb-2 max-w-md mx-auto">
            <span className="text-[13px] text-[#3C3C43] uppercase ml-2">Pilih Kotak Kosong</span>
        </div>
        <div className="grid grid-cols-3 gap-3 px-2 max-w-md mx-auto">
          {lockers.map((locker) => {
            const isAvailable = locker.status === 'AVAILABLE';
            return (
              <button
                key={locker.id}
                disabled={!isAvailable}
                onClick={() => setSelectedLockerToRent(locker.id)}
                className={cn(
                  "aspect-square rounded-[14px] flex flex-col items-center justify-center transition-all relative overflow-hidden ring-1 ring-black/5",
                  isAvailable 
                    ? "bg-white text-black active:opacity-70 shadow-sm" 
                    : "bg-[#E5E5EA] text-[#8E8E93] cursor-not-allowed"
                )}
              >
                <span className="text-[26px] font-medium font-mono tracking-tighter">
                  {String(locker.id).padStart(2, '0')}
                </span>
                <span className="text-[11px] font-medium mt-1 tracking-wide">
                  {isAvailable ? 'Tersedia' : 'Penuh'}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom Sheet Overlay */}
      {selectedLockerToRent !== null && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedLockerToRent(null)}
          />
          <div className="relative bg-[#F2F2F7] md:rounded-t-[32px] rounded-t-[32px] shadow-2xl min-h-[400px] animate-in slide-in-from-bottom border-t border-white/20 pb-8 max-w-md mx-auto w-full">
            <div className="w-10 h-1.5 bg-black/10 rounded-full mx-auto mt-3 mb-5"></div>
            
            <div className="px-6 text-center mb-6">
              <h3 className="text-[22px] font-bold text-black">Loker {String(selectedLockerToRent).padStart(2, '0')}</h3>
              <p className="text-[#3C3C43] text-[15px] mt-1">Pilih paket waktu penyewaan</p>
            </div>

            <div className="px-4 mb-6">
              <div className="bg-white rounded-[10px] overflow-hidden shadow-sm border border-black/5">
                {DURATIONS.map((dur, idx) => (
                  <button
                    key={dur.hours}
                    onClick={() => setSelectedDuration(dur.hours)}
                    className={cn(
                      "w-full text-left flex justify-between items-center p-4 transition-colors",
                      idx !== DURATIONS.length - 1 ? "border-b border-black/5" : "",
                      selectedDuration === dur.hours ? "bg-[#007AFF]/5" : "bg-white active:bg-gray-50"
                    )}
                  >
                    <span className={cn("text-[17px]", selectedDuration === dur.hours ? "text-[#007AFF] font-semibold" : "text-black")}>
                      {dur.label}
                    </span>
                    {selectedDuration === dur.hours && <CheckCircle2 className="w-5 h-5 text-[#007AFF]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 mb-8">
              <div className="bg-white rounded-[10px] p-4 flex justify-between items-center shadow-sm border border-black/5">
                 <div className="text-[17px] text-black">Total Pembayaran</div>
                 <span className="font-semibold text-[17px] text-black">
                   Rp{(DURATIONS.find(d => d.hours === selectedDuration)?.price || 0).toLocaleString('id-ID')}
                 </span>
              </div>
            </div>

            <div className="px-4">
              <button
                onClick={processPaymentAndRent}
                disabled={isProcessing}
                className="w-full bg-[#007AFF] text-white font-semibold py-[14px] rounded-xl active:opacity-70 disabled:opacity-50 transition-opacity text-[17px] shadow-sm flex items-center justify-center"
              >
                {isProcessing ? 'Memproses...' : 'Lanjut Pembayaran'}
              </button>
              <button
                onClick={() => setSelectedLockerToRent(null)}
                className="w-full bg-transparent text-[#007AFF] font-semibold py-[14px] rounded-xl active:opacity-70 transition-opacity text-[17px] mt-2"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Popup Form */}
      {showPaymentPopup && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center md:items-center">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={handlePaymentCancel}
          />
          <div className="relative bg-[#F2F2F7] rounded-t-[32px] md:rounded-[32px] shadow-2xl w-full md:max-w-md mx-auto h-[85vh] md:h-[700px] flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 border-t border-white/20 overflow-hidden">
            <div className="pt-3 pb-3 px-4 flex justify-between items-center bg-white/90 backdrop-blur-md z-10 shrink-0 border-b border-black/5">
              <span className="w-8"></span> {/* Spacer for centering */}
              <h3 className="font-semibold text-[17px] text-black">Pembayaran</h3>
              <button 
                onClick={handlePaymentCancel}
                className="w-8 h-8 flex items-center justify-center bg-[#E5E5EA] rounded-full text-[#8E8E93] active:bg-[#D1D1D6] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 w-full relative z-0">
              {paymentUrl ? (
                <iframe 
                  src={paymentUrl} 
                  className="absolute top-0 left-0 w-full h-full border-0 bg-white" 
                  title="Payment Gateway"
                  allow="payment"
                />
              ) : (
                <div className="flex w-full h-full items-center justify-center text-[#8E8E93] bg-[#F2F2F7]">Memuat...</div>
              )}
            </div>
            
            <div className="p-4 bg-white border-t border-black/5 shrink-0 z-10 pb-8 md:pb-4">
              <button
                onClick={handlePaymentSuccess}
                className="w-full bg-[#007AFF] text-white font-semibold py-[14px] rounded-xl active:opacity-70 transition text-[17px] shadow-sm"
              >
                Selesai / Cek Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
