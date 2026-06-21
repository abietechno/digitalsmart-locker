import { Link } from 'react-router-dom';
import { Laptop, Smartphone, Database, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-jakarta flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="max-w-3xl w-full">
        <header className="mb-12 text-center flex flex-col items-center">
          <img src="/logo.png" alt="LockerPintar" className="h-20 mb-6" />
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">Digital Locker BINTANG LIMA</h1>
          <p className="text-lg text-slate-600 font-inter max-w-2xl mx-auto">
            Prototipe Digital Locker berbasis iOT-Realtime.
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


      </div>
    </div>
  );
}
