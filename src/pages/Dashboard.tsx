import { useEffect, useState } from 'react';
import { ArrowLeft, Users, Activity, BarChart3, Clock, LayoutDashboard, PieChart as PieChartIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';

interface Transaction {
  id: string;
  locker_id: number;
  nama: string;
  no_telp: string;
  durasi_jam: number;
  harga: number;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for effect
    setTimeout(() => {
      setTransactions(generateDummyTransactions());
      setLoading(false);
    }, 500);
  }, []);

  const generateDummyTransactions = () => {
    const dummy: Transaction[] = [];
    const names = ['Andi', 'Budi', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Iwan', 'Joko', 'Kiki', 'Lina', 'Maya', 'Nisa', 'Oki', 'Putri'];
    const todayDate = new Date();
    
    // Add today's transactions
    for (let i = 0; i < 5; i++) {
      dummy.push({
        id: `dummy-today-${i}`,
        locker_id: Math.floor(Math.random() * 15) + 1,
        nama: names[Math.floor(Math.random() * names.length)],
        no_telp: `0812${Math.floor(Math.random() * 10000000)}`,
        durasi_jam: [2, 6, 24][Math.floor(Math.random() * 3)],
        harga: 0, // will set below
        status: i < 3 ? 'ACTIVE' : 'COMPLETED',
        created_at: new Date(todayDate.getTime() - i * 3600000).toISOString(),
      });
    }

    // Add past 30 days for monthly stats
    for (let d = 1; d <= 30; d++) {
      const pastDate = new Date(todayDate.getTime() - d * 86400000);
      const numTx = Math.floor(Math.random() * 8) + 2; // 2 to 9 transactions per day
      for (let i = 0; i < numTx; i++) {
        dummy.push({
          id: `dummy-past-${d}-${i}`,
          locker_id: Math.floor(Math.random() * 15) + 1,
          nama: names[Math.floor(Math.random() * names.length)],
          no_telp: `0812${Math.floor(Math.random() * 10000000)}`,
          durasi_jam: [2, 6, 24][Math.floor(Math.random() * 3)],
          harga: 0,
          status: 'COMPLETED',
          created_at: new Date(pastDate.getTime() - Math.random() * 86400000).toISOString(),
        });
      }
    }

    // fix prices
    dummy.forEach(t => {
      if (t.durasi_jam === 2) t.harga = 2000;
      if (t.durasi_jam === 6) t.harga = 10000;
      if (t.durasi_jam === 24) t.harga = 20000;
    });

    // sort newest first
    return dummy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center font-jakarta">
        <div className="flex flex-col items-center text-[#8E8E93]">
          <Activity className="w-8 h-8 animate-spin mb-4" />
          <p>Memuat Data...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  
  const todayTransactions = transactions.filter(t => {
    const date = new Date(t.created_at);
    return date >= todayStart && date <= todayEnd;
  });

  const totalRevenueToday = todayTransactions.reduce((acc, t) => acc + t.harga, 0);
  const totalRentedToday = todayTransactions.length;
  const activeRentals = transactions.filter(t => t.status === 'ACTIVE').length;

  // Weekly stats for chart
  const weeklyStats = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(today, 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const count = transactions.filter(t => {
      const tDate = new Date(t.created_at);
      return tDate >= dayStart && tDate <= dayEnd;
    }).length;

    return {
      name: format(date, 'EEE', { locale: id }),
      fullDate: format(date, 'dd MMM', { locale: id }),
      count,
    };
  });

  const highestUsageDay = [...weeklyStats].sort((a, b) => b.count - a.count)[0];

  // Monthly stats (Pie Charts)
  const monthStart = startOfDay(subDays(today, 30));
  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.created_at);
    return date >= monthStart && date <= todayEnd;
  });

  const pieLockerStatus = [
    { name: 'Disewa', value: activeRentals, color: '#FF9500' },
    { name: 'Tersedia', value: 15 - activeRentals, color: '#34C759' }
  ];

  const piePaket = [
    { name: '2 Jam', value: monthlyTransactions.filter(t => t.durasi_jam === 2).length, color: '#007AFF' },
    { name: '6 Jam', value: monthlyTransactions.filter(t => t.durasi_jam === 6).length, color: '#5856D6' },
    { name: '1 Hari', value: monthlyTransactions.filter(t => t.durasi_jam === 24).length, color: '#FF2D55' }
  ];

  const userCounts: Record<string, number> = {};
  monthlyTransactions.forEach(t => {
    userCounts[t.no_telp] = (userCounts[t.no_telp] || 0) + 1;
  });
  
  let newUsers = 0;
  let returningUsers = 0;
  Object.values(userCounts).forEach(count => {
    if (count === 1) newUsers++;
    else returningUsers++;
  });

  const pieUser = [
    { name: 'Sewa 1 Kali', value: newUsers, color: '#32ADE6' },
    { name: 'Sewa >1 Kali', value: returningUsers, color: '#FF3B30' }
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-jakarta pb-12">
      {/* Header */}
      <header className="bg-white border-b border-black/5 px-8 py-5 shadow-sm flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-black/5 rounded-full transition-colors text-[#8E8E93] hover:text-black">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <img src="/logo.png" alt="LockerPintar" className="h-8" />
          <div>
            <h1 className="text-xl font-bold text-black tracking-tight">Admin Dashboard</h1>
          </div>
        </div>
        <div className="text-sm font-medium text-[#8E8E93] bg-[#F2F2F7] px-4 py-2 rounded-full border border-black/5">
          {format(today, 'EEEE, dd MMMM yyyy', { locale: id })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-black/5 flex items-center gap-6">
            <div className="w-14 h-14 bg-[#007AFF]/10 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7 text-[#007AFF]" />
            </div>
            <div>
              <p className="text-[14px] text-[#8E8E93] font-medium mb-1">Penyewa Hari Ini</p>
              <h3 className="text-3xl font-bold text-black">{totalRentedToday}</h3>
            </div>
          </div>
          
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-black/5 flex items-center gap-6">
            <div className="w-14 h-14 bg-[#34C759]/10 rounded-2xl flex items-center justify-center">
              <Activity className="w-7 h-7 text-[#34C759]" />
            </div>
            <div>
              <p className="text-[14px] text-[#8E8E93] font-medium mb-1">Pendapatan Hari Ini</p>
              <h3 className="text-3xl font-bold text-black">Rp {totalRevenueToday.toLocaleString('id-ID')}</h3>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-black/5 flex items-center gap-6">
            <div className="w-14 h-14 bg-[#FF9500]/10 rounded-2xl flex items-center justify-center">
              <Clock className="w-7 h-7 text-[#FF9500]" />
            </div>
            <div>
              <p className="text-[14px] text-[#8E8E93] font-medium mb-1">Loker Sedang Disewa</p>
              <h3 className="text-3xl font-bold text-black">{activeRentals}</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-black/5">
             <div className="flex justify-between items-end mb-8">
               <div>
                 <h2 className="text-lg font-bold text-black flex items-center gap-2 mb-1">
                   <BarChart3 className="w-5 h-5 text-[#007AFF]" /> Statistik Mingguan
                 </h2>
                 <p className="text-[#8E8E93] text-sm">Penggunaan loker dalam 7 hari terakhir</p>
               </div>
               <div className="text-right">
                 <p className="text-[13px] text-[#8E8E93]">Tertinggi</p>
                 <p className="text-[15px] font-semibold text-black">{highestUsageDay.name} ({highestUsageDay.count} kali)</p>
               </div>
             </div>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={weeklyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5EA" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 13 }} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 13 }} />
                   <Tooltip 
                     cursor={{ fill: '#F2F2F7' }}
                     contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                     labelStyle={{ fontWeight: 'bold', color: 'black', marginBottom: '4px' }}
                   />
                   <Bar dataKey="count" name="Total Sewa" radius={[6, 6, 0, 0]} maxBarSize={50}>
                     {weeklyStats.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.count === highestUsageDay.count && entry.count > 0 ? '#007AFF' : '#E5E5EA'} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Recent Logs Section */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm border border-black/5 flex flex-col h-full">
            <h2 className="text-lg font-bold text-black flex items-center gap-2 mb-1">
               <LayoutDashboard className="w-5 h-5 text-[#34C759]" /> History Log Terbaru
            </h2>
            <p className="text-[#8E8E93] text-sm mb-6">Aktivitas penyewaan loker hari ini</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {todayTransactions.length > 0 ? (
                todayTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 rounded-[14px] bg-[#F2F2F7] border border-black/5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-black text-[15px]">{tx.nama}</p>
                        <p className="text-[13px] text-[#8E8E93]">{tx.no_telp}</p>
                      </div>
                      <span className="text-[20px] font-bold font-mono text-black">
                        #{String(tx.locker_id).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-black/5">
                      <span className="text-[13px] text-[#8E8E93] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(tx.created_at), 'HH:mm')} ({tx.durasi_jam} Jam)
                      </span>
                      <span className="text-[13px] font-semibold text-[#34C759]">
                        Rp {tx.harga.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#8E8E93] py-10">
                  <Activity className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">Belum ada transaksi hari ini</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Stats Pie Charts */}
        <div className="bg-white rounded-[20px] p-6 shadow-sm border border-black/5 mt-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-black flex items-center gap-2 mb-1">
              <PieChartIcon className="w-5 h-5 text-[#FF2D55]" /> Statistik Bulanan (30 Hari)
            </h2>
            <p className="text-[#8E8E93] text-sm">Sebaran data penggunaan dalam 30 hari terakhir</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pie 1: Status Loker */}
            <div className="flex flex-col items-center">
              <h3 className="text-[15px] font-semibold text-[#3C3C43] mb-4">Status Loker Saat Ini</h3>
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieLockerStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieLockerStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                      itemStyle={{ color: 'black', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie 2: Jenis Paket */}
            <div className="flex flex-col items-center">
              <h3 className="text-[15px] font-semibold text-[#3C3C43] mb-4">Pilihan Paket Sewa</h3>
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={piePaket}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {piePaket.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                      itemStyle={{ color: 'black', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie 3: User */}
            <div className="flex flex-col items-center">
              <h3 className="text-[15px] font-semibold text-[#3C3C43] mb-4">Aktivitas User (Sewa)</h3>
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieUser}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieUser.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                      itemStyle={{ color: 'black', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
