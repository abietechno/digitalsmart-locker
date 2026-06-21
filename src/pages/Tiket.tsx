import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, type Transaction } from '../lib/supabase';
import { CheckCircle2, QrCode, ArrowLeft, Unlock, XCircle, Clock } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function TiketPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchTransaction = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('token', token)
          .single();

        if (error) throw error;
        setTransaction(data as Transaction);
      } catch (err: any) {
        console.error('Error fetching ticket:', err.message);
        setError('Tiket tidak ditemukan atau terjadi kesalahan.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();

    // Setup realtime listener for this specific transaction just in case
    const channel = supabase
      .channel(`public:transactions:token=${token}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `token=eq.${token}` },
        (payload) => {
          setTransaction(payload.new as Transaction);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);

  const ambilBarang = async () => {
    if (!transaction) return;
    setIsProcessing(true);

    try {
      // 1. Update locker status back to AVAILABLE
      const { error: lockerError } = await supabase
        .from('lockers')
        .update({ status: 'AVAILABLE' })
        .eq('id', transaction.locker_id);

      if (lockerError) throw lockerError;

      // 2. Update transaction status to COMPLETED
      const { error: txError } = await supabase
        .from('transactions')
        .update({ status: 'COMPLETED' })
        .eq('id', transaction.id);

      if (txError) throw txError;

      // Update local state is handled by realtime, but we can do it optimistically
      setTransaction(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
      
      // Also clear any local storage just in case
      localStorage.removeItem('activeLockerSessionData');
      localStorage.removeItem('activeLockerSession');

    } catch (err: any) {
      alert('Gagal mengambil barang: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-jakarta">
        <div className="animate-pulse flex flex-col items-center gap-4 text-emerald-600">
          <QrCode className="w-10 h-10" />
          <div className="font-bold">Memuat Tiket...</div>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-jakarta">
        <header className="bg-white p-4 border-b border-slate-200">
          <button onClick={() => navigate('/mahasiswa')} className="p-2 -ml-2 text-slate-600 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow border border-red-100 text-center max-w-sm w-full">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Gagal Memuat</h2>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = transaction.status === 'COMPLETED';
  const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/tiket/${transaction.token}` : '';

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-jakarta flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm w-full mx-auto relative">
        
        {isCompleted && (
          <div className="absolute -top-4 -right-12 z-20 transform rotate-12">
            <div className="bg-slate-800 text-white font-bold px-4 py-1 border-4 border-slate-50 shadow-lg uppercase tracking-widest text-sm rounded-lg">
              SELESAI
            </div>
          </div>
        )}

        <div className={isCompleted ? "opacity-70 grayscale transition-all" : ""}>
          {/* Ticket Header & QR Segment */}
          <div className="bg-white rounded-t-3xl shadow-xl p-8 pb-10 text-center border-t border-x border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 rounded-bl-full opacity-10"></div>
            
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Digital Locker</h2>
            
            <div className="bg-white inline-block p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
              <QRCode 
                value={qrUrl} 
                size={160} 
                level="L" 
                fgColor={isCompleted ? "#94a3b8" : "#0f172a"}
              />
            </div>

            <p className="text-slate-500 text-sm font-inter">
              {isCompleted ? "Tiket ini sudah tidak berlaku." : "Simpan halaman ini / scan QR code di atas saat ingin mengambil barang."}
            </p>
          </div>

          {/* Ticket Tear line */}
          <div className="h-0 relative flex items-center justify-between -mx-2 z-10 drop-shadow-xl">
             <div className="w-5 h-5 bg-slate-50 rounded-full border-r border-slate-200 absolute -left-2.5"></div>
             <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-2"></div>
             <div className="w-5 h-5 bg-slate-50 rounded-full border-l border-slate-200 absolute -right-2.5"></div>
          </div>

          {/* Ticket Details Segment */}
          <div className="bg-white rounded-b-3xl shadow-xl p-8 pt-10 border-b border-x border-slate-200">
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Penyewa</p>
                <p className="text-slate-900 font-bold">{transaction.nama}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">No. Loker</p>
                <p className="text-slate-900 font-bold text-2xl font-mono">{String(transaction.locker_id).padStart(2, '0')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Durasi</p>
                <p className="text-slate-900 font-bold flex items-center gap-1"><Clock className="w-4 h-4"/> {transaction.durasi_jam} Jam</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Status</p>
                <p className={transaction.status === 'ACTIVE' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-bold'}>
                  {transaction.status === 'ACTIVE' ? 'AKTIF' : 'SELESAI'}
                </p>
              </div>
            </div>

            {!isCompleted ? (
              <button
                onClick={ambilBarang}
                disabled={isProcessing}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? 'Memproses...' : <><Unlock className="w-5 h-5"/> Ambil Barang & Kunci</>}
              </button>
            ) : (
              <button
                onClick={() => navigate('/mahasiswa')}
                className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-200 transition"
              >
                Kembali ke Beranda
              </button>
            )}
            
          </div>
        </div>
        
      </div>
    </div>
  );
}
