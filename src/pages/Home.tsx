import { Link } from 'react-router-dom';
import { Laptop, Smartphone, Database, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-jakarta flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="max-w-3xl w-full">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mb-6 shadow-sm border border-emerald-200">
            <Database className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">Smart Locker Digital</h1>
          <p className="text-lg text-slate-600 font-inter max-w-2xl mx-auto">
            Prototipe sistem penyewaan loker kampus terintegrasi Supabase Realtime tingkat demo presentasi.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Card Laptop */}
          <Link 
            to="/loker"
            className="group block bg-white p-8 rounded-3xl shadow-lg border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-50 transition-colors">
              <Laptop className="w-6 h-6 text-slate-700 group-hover:text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-between">
              Layar Mesin Loker
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors transform group-hover:translate-x-1" />
            </h2>
            <p className="text-slate-500 text-sm font-inter">
              (Tampilan Laptop) Buka ini untuk memvisualisasikan rak loker server-side yang menyala hijau (Tersedia) dan merah (Digunakan) secara real-time.
            </p>
          </Link>

          {/* Card Mobile */}
          <Link 
            to="/mahasiswa"
            className="group block bg-white p-8 rounded-3xl shadow-lg border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-50 transition-colors">
              <Smartphone className="w-6 h-6 text-slate-700 group-hover:text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-between">
              Aplikasi Mahasiswa
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors transform group-hover:translate-x-1" />
            </h2>
            <p className="text-slate-500 text-sm font-inter">
              (Tampilan HP) Buka halaman ini sebagai mahasiswa untuk melakukan scan QR, memilih loker kosong, dan simulasi pembayaran QRIS.
            </p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-sm">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Langkah Persiapan Demo (Wajib)
          </h3>
          <ol className="list-decimal pl-5 space-y-2 text-slate-600 font-inter">
            <li>Buka menu Settings aplikasi ini dan isi <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">VITE_SUPABASE_URL</code> serta <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">VITE_SUPABASE_ANON_KEY</code>.</li>
            <li>Di project Supabase Anda, masuk ke SQL Editor dan eksekusi query pembuatan tabel. File kodenya tersedia jika Anda mengakses root direktori atau membuka file <code className="bg-slate-100 px-1 py-0.5 rounded">/supabase_setup.sql</code>.</li>
            <li><strong>Sangat Penting:</strong> Aktifkan <i>Realtime Publication</i> untuk tabel <code className="bg-slate-100 px-1 py-0.5 rounded">lockers</code> di Supabase.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
