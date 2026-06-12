import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import {
  Package, BarChart2, MapPin, TrendingUp, RefreshCw,
  Scan, Calendar, Filter, ChevronDown, Search, Download
} from 'lucide-react'

interface StockRecord {
  id: string
  timestamp: string
  tanggal: string
  kodeItem: string
  kodeProduk: string
  satuanBesar: string
  isiKarton: number
  satuanKecil: string
  kodeBarcode: string
  namaProduk: string
  gudang: string
  storageBin: string
  jumlahKarton: number
  totalUnit: number
  operator: string
  status: string
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16']

export default function Dashboard() {
  const [records, setRecords] = useState<StockRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stock')
      const data = await res.json()
      if (data.success) {
        setRecords(data.data)
        setLastRefresh(new Date())
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    // Set default date range to last 30 days
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    setDateTo(today.toISOString().substring(0, 10))
    setDateFrom(thirtyDaysAgo.toISOString().substring(0, 10))
  }, [fetchData])

  // Filtered records
  const filtered = records.filter(r => {
    const matchDate = (!dateFrom || r.tanggal >= dateFrom) && (!dateTo || r.tanggal <= dateTo)
    const matchSearch = !search ||
      r.namaProduk.toLowerCase().includes(search.toLowerCase()) ||
      r.storageBin.toLowerCase().includes(search.toLowerCase()) ||
      r.kodeProduk.toLowerCase().includes(search.toLowerCase())
    return matchDate && matchSearch
  })

  // Summary stats
  const totalItems = filtered.length
  const totalUnit = filtered.reduce((s, r) => s + r.totalUnit, 0)
  const totalKarton = filtered.reduce((s, r) => s + r.jumlahKarton, 0)
  const uniqueProducts = new Set(filtered.map(r => r.kodeProduk)).size
  const uniqueBins = new Set(filtered.map(r => r.storageBin)).size

  // Chart: top products by unit
  const productMap: Record<string, number> = {}
  filtered.forEach(r => {
    productMap[r.namaProduk] = (productMap[r.namaProduk] || 0) + r.totalUnit
  })
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name: name.length > 22 ? name.substring(0, 22) + '…' : name, value }))

  // Chart: by date
  const dateMap: Record<string, { karton: number; unit: number }> = {}
  filtered.forEach(r => {
    if (!dateMap[r.tanggal]) dateMap[r.tanggal] = { karton: 0, unit: 0 }
    dateMap[r.tanggal].karton += r.jumlahKarton
    dateMap[r.tanggal].unit += r.totalUnit
  })
  const byDate = Object.entries(dateMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date: date.substring(5), ...v }))

  // Chart: by storage bin
  const binMap: Record<string, number> = {}
  filtered.forEach(r => {
    binMap[r.storageBin] = (binMap[r.storageBin] || 0) + r.totalUnit
  })
  const byBin = Object.entries(binMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  // Chart: by operator
  const opMap: Record<string, number> = {}
  filtered.forEach(r => {
    opMap[r.operator] = (opMap[r.operator] || 0) + 1
  })
  const byOperator = Object.entries(opMap).map(([name, value]) => ({ name, value }))

  const exportCSV = () => {
    const headers = ['ID,Timestamp,Tanggal,Kode Item,Kode Produk,Satuan Besar,Isi Karton,Satuan Kecil,Kode Barcode,Nama Produk,Gudang,Storage Bin,Jumlah Karton,Total Unit,Operator,Status']
    const rows = filtered.map(r =>
      [r.id, r.timestamp, r.tanggal, r.kodeItem, r.kodeProduk, r.satuanBesar,
       r.isiKarton, r.satuanKecil, r.kodeBarcode, `"${r.namaProduk}"`, r.gudang,
       r.storageBin, r.jumlahKarton, r.totalUnit, r.operator, r.status].join(',')
    )
    const csv = [...headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stockopname_${dateFrom}_${dateTo}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
              <BarChart2 size={18} className="text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">Dashboard</h1>
              <p className="text-white/50 text-xs">Stock Opname Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <p className="text-white/30 text-xs hidden sm:block">
                Update: {lastRefresh.toLocaleTimeString('id-ID')}
              </p>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <Link href="/scan" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-semibold transition-colors">
              <Scan size={14} />
              <span className="hidden sm:inline">Scan</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-amber-400" />
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-white/40" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:border-amber-400 outline-none"
            />
            <span className="text-white/30 text-sm">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:border-amber-400 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={14} className="text-white/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk / lokasi..."
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm flex-1 focus:border-amber-400 outline-none placeholder:text-white/30"
            />
          </div>
          <span className="text-white/40 text-sm ml-auto">{filtered.length} record</span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Scan', value: totalItems.toLocaleString('id'), icon: Scan, color: 'from-amber-400/20' },
            { label: 'Total Karton', value: totalKarton.toLocaleString('id'), icon: Package, color: 'from-blue-500/20' },
            { label: 'Total Unit', value: totalUnit.toLocaleString('id'), icon: TrendingUp, color: 'from-emerald-500/20' },
            { label: 'Produk Unik', value: uniqueProducts.toLocaleString('id'), icon: BarChart2, color: 'from-purple-500/20' },
            { label: 'Storage Bin', value: uniqueBins.toLocaleString('id'), icon: MapPin, color: 'from-rose-500/20' },
          ].map((card, i) => (
            <div key={i} className={`bg-gradient-to-br ${card.color} to-transparent border border-white/10 rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <card.icon size={14} className="text-white/50" />
                <p className="text-white/50 text-xs">{card.label}</p>
              </div>
              <p className="text-white font-bold text-2xl">{loading ? '—' : card.value}</p>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend by date */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-400" />
              Aktivitas Harian
            </h3>
            {byDate.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={byDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                  <Line type="monotone" dataKey="karton" name="Karton" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="unit" name="Unit" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-white/30 text-sm">Tidak ada data</div>
            )}
          </div>

          {/* By storage bin */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-amber-400" />
              Top Storage Bin
            </h3>
            {byBin.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={byBin}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {byBin.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-white/30 text-sm">Tidak ada data</div>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top products */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Package size={16} className="text-amber-400" />
              Top Produk (by Unit)
            </h3>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={160} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                  />
                  <Bar dataKey="value" name="Unit" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-white/30 text-sm">Tidak ada data</div>
            )}
          </div>

          {/* By operator */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-amber-400" />
              Scan per Operator
            </h3>
            {byOperator.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byOperator}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                  />
                  <Bar dataKey="value" name="Scan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-white/30 text-sm">Tidak ada data</div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Filter size={16} className="text-amber-400" />
              Detail Record
            </h3>
            <span className="text-white/40 text-sm">{filtered.length} baris</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Timestamp', 'Kode Produk', 'Nama Produk', 'Storage Bin', 'Jml Karton', 'Total Unit', 'Satuan', 'Operator', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/40 font-medium text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-white/30">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-white/30">Tidak ada data untuk filter ini</td></tr>
                ) : filtered.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap font-mono">{r.timestamp}</td>
                    <td className="px-4 py-3 text-amber-400 font-mono text-xs">{r.kodeProduk}</td>
                    <td className="px-4 py-3 text-white max-w-[200px] truncate">{r.namaProduk}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono text-xs">{r.storageBin}</span>
                    </td>
                    <td className="px-4 py-3 text-white font-bold">{r.jumlahKarton}</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">{r.totalUnit.toLocaleString('id')}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{r.satuanKecil}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{r.operator}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'Selesai' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="text-center text-white/30 text-xs py-3">Menampilkan 100 dari {filtered.length} record. Export CSV untuk semua data.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
