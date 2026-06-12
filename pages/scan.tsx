import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { parseBarcode, ParsedBarcode } from '../lib/barcode'
import {
  BarChart2, Package, MapPin, CheckCircle, AlertCircle,
  History, Edit2, X, Save, LayoutDashboard, ChevronRight,
  Scan, User, Trash2, RefreshCw
} from 'lucide-react'

interface ScanSession {
  id?: string
  barcode: ParsedBarcode
  storageBin: string
  jumlahKarton: number
  totalUnit: number
  timestamp: string
  operator: string
  status: 'pending' | 'saved' | 'error'
}

interface EditModal {
  index: number
  session: ScanSession
}

export default function ScanPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [parsedBarcode, setParsedBarcode] = useState<ParsedBarcode | null>(null)
  const [jumlahKarton, setJumlahKarton] = useState<number>(0)
  const [operator, setOperator] = useState('Operator 1')
  const [scanHistory, setScanHistory] = useState<ScanSession[]>([])
  const [scanMsg, setScanMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editModal, setEditModal] = useState<EditModal | null>(null)
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const barcodeRef = useRef<HTMLInputElement>(null)
  const locationRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 1) barcodeRef.current?.focus()
    if (step === 2) locationRef.current?.focus()
  }, [step])

  const flash = (type: 'success' | 'error', text: string) => {
    setScanMsg({ type, text })
    setTimeout(() => setScanMsg(null), 3000)
  }

  const handleBarcodeScan = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const raw = barcodeInput.trim()
    if (!raw) return

    const parsed = parseBarcode(raw)
    if (!parsed) {
      flash('error', 'Format barcode tidak valid. Pastikan 8 field dipisahkan titik koma (;)')
      setBarcodeInput('')
      return
    }

    setParsedBarcode(parsed)
    setJumlahKarton(0)
    setStep(2)
    flash('success', `✓ Produk dikenali: ${parsed.namaProduk}`)
    setBarcodeInput('')
    setTimeout(() => qtyRef.current?.focus(), 100)
  }, [barcodeInput])

  const handleLocationScan = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const loc = locationInput.trim()
    if (!loc || !parsedBarcode) return
    if (jumlahKarton <= 0) {
      flash('error', 'Masukkan jumlah karton terlebih dahulu')
      return
    }

    const session: ScanSession = {
      barcode: parsedBarcode,
      storageBin: loc,
      jumlahKarton,
      totalUnit: jumlahKarton * parsedBarcode.isiKarton,
      timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      operator,
      status: 'pending',
    }

    setSaving(true)
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsedBarcode,
          storageBin: loc,
          jumlahKarton,
          operator,
        }),
      })
      const data = await res.json()
      if (data.success) {
        session.id = data.id
        session.status = 'saved'
        flash('success', `✓ Tersimpan! ${parsedBarcode.namaProduk} — ${jumlahKarton} CTN × ${parsedBarcode.isiKarton} = ${session.totalUnit} ${parsedBarcode.satuanKecil} @ ${loc}`)
      } else {
        session.status = 'error'
        flash('error', 'Gagal menyimpan ke Google Sheets')
      }
    } catch {
      session.status = 'error'
      flash('error', 'Koneksi error. Coba lagi.')
    }

    setScanHistory(prev => [session, ...prev])
    setSaving(false)
    setLocationInput('')
    setParsedBarcode(null)
    setJumlahKarton(0)
    setStep(1)
    setTimeout(() => barcodeRef.current?.focus(), 100)
  }, [locationInput, parsedBarcode, jumlahKarton, operator])

  const handleEditSave = async () => {
    if (!editModal) return
    const s = editModal.session
    setSaving(true)

    try {
      if (s.id) {
        await fetch('/api/stock', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: s.id,
            storageBin: s.storageBin,
            jumlahKarton: s.jumlahKarton,
            isiKarton: s.barcode.isiKarton,
          }),
        })
      }
      setScanHistory(prev => prev.map((item, i) =>
        i === editModal.index ? { ...s } : item
      ))
      flash('success', 'Data berhasil diperbarui')
    } catch {
      flash('error', 'Gagal menyimpan perubahan')
    }

    setSaving(false)
    setEditModal(null)
  }

  const resetToStep1 = () => {
    setParsedBarcode(null)
    setBarcodeInput('')
    setLocationInput('')
    setJumlahKarton(0)
    setStep(1)
    setTimeout(() => barcodeRef.current?.focus(), 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
              <Package size={18} className="text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">StockOpname</h1>
              <p className="text-white/50 text-xs">PDT Scan System</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors">
              <LayoutDashboard size={14} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
            >
              <History size={14} />
              <span className="hidden sm:inline">History</span>
              {scanHistory.length > 0 && (
                <span className="bg-amber-400 text-slate-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{scanHistory.length}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Scan Panel */}
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${step === 1 ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-white/50'}`}>
              <Scan size={14} />
              Scan Produk
            </div>
            <ChevronRight size={16} className="text-white/30" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${step === 2 ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-white/50'}`}>
              <MapPin size={14} />
              Scan Lokasi
            </div>
          </div>

          {/* Flash message */}
          {scanMsg && (
            <div className={`slide-in flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
              scanMsg.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/20 border border-red-500/30 text-red-300'
            }`}>
              {scanMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {scanMsg.text}
            </div>
          )}

          {/* STEP 1: Scan Barcode */}
          {step === 1 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-white mb-2">
                <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-bold text-xs flex items-center justify-center">1</div>
                <h2 className="font-semibold">Scan Barcode Produk</h2>
              </div>
              <p className="text-white/50 text-sm">Arahkan PDT ke barcode produk atau ketik manual, tekan Enter</p>
              <div className="relative">
                <Scan size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  className="scan-input w-full bg-black/30 border border-white/20 rounded-xl pl-10 pr-4 py-4 text-white font-mono text-sm placeholder:text-white/30 focus:border-amber-400"
                  placeholder="Scan barcode produk..."
                  autoComplete="off"
                />
              </div>
              <p className="text-white/30 text-xs font-mono">Format: KodeItem;KodeProduk;SatBesar;IsiKarton;SatKecil;Barcode;Nama;Gudang</p>
            </div>
          )}

          {/* STEP 2: Qty + Location */}
          {step === 2 && parsedBarcode && (
            <div className="space-y-4">
              {/* Product info card */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle size={16} />
                    <span className="text-sm font-semibold">Produk Teridentifikasi</span>
                  </div>
                  <button onClick={resetToStep1} className="text-white/40 hover:text-white/70 transition-colors">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <h3 className="text-white font-bold text-base mb-1">{parsedBarcode.namaProduk}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-white/40 text-xs">Kode Item</p>
                    <p className="text-white font-mono">{parsedBarcode.kodeItem}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-white/40 text-xs">Kode Produk</p>
                    <p className="text-white font-mono">{parsedBarcode.kodeProduk}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-white/40 text-xs">Isi / Karton</p>
                    <p className="text-white font-bold">{parsedBarcode.isiKarton} {parsedBarcode.satuanKecil}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-white/40 text-xs">Gudang</p>
                    <p className="text-white font-mono">{parsedBarcode.gudang}</p>
                  </div>
                </div>
              </div>

              {/* Qty input */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-white mb-1">
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-bold text-xs flex items-center justify-center">2a</div>
                  <h2 className="font-semibold">Jumlah Karton</h2>
                </div>
                <input
                  ref={qtyRef}
                  type="number"
                  min={1}
                  value={jumlahKarton || ''}
                  onChange={e => setJumlahKarton(parseInt(e.target.value) || 0)}
                  className="scan-input w-full bg-black/30 border border-white/20 rounded-xl px-4 py-4 text-white text-2xl font-bold text-center placeholder:text-white/30 focus:border-amber-400"
                  placeholder="0"
                />
                {jumlahKarton > 0 && (
                  <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3 text-center">
                    <p className="text-amber-400 font-bold text-xl">
                      {jumlahKarton} CTN × {parsedBarcode.isiKarton} {parsedBarcode.satuanKecil} = <span className="text-2xl">{jumlahKarton * parsedBarcode.isiKarton}</span> {parsedBarcode.satuanKecil}
                    </p>
                  </div>
                )}
              </div>

              {/* Location scan */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-white mb-1">
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-bold text-xs flex items-center justify-center">2b</div>
                  <h2 className="font-semibold">Scan Storage Bin</h2>
                </div>
                <p className="text-white/50 text-sm">Scan label lokasi storage bin, tekan Enter untuk simpan</p>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                  <input
                    ref={locationRef}
                    type="text"
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    onKeyDown={handleLocationScan}
                    disabled={saving}
                    className="scan-input w-full bg-black/30 border border-white/20 rounded-xl pl-10 pr-4 py-4 text-white font-mono text-sm placeholder:text-white/30 focus:border-amber-400 disabled:opacity-50"
                    placeholder="Scan storage bin..."
                    autoComplete="off"
                  />
                </div>
                {saving && (
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <RefreshCw size={14} className="animate-spin" />
                    Menyimpan ke Google Sheets...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Operator selector */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <User size={16} className="text-white/50" />
            <select
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none"
            >
              {['Operator 1', 'Operator 2', 'Operator 3', 'Supervisor'].map(o => (
                <option key={o} value={o} className="bg-slate-800">{o}</option>
              ))}
            </select>
          </div>
        </div>

        {/* RIGHT: History Panel */}
        <div className={`${showHistory || 'hidden lg:block'}`}>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <History size={16} />
                <h2 className="font-semibold">Riwayat Scan</h2>
                <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">{scanHistory.length}</span>
              </div>
              <button
                onClick={() => setScanHistory([])}
                className="text-white/30 hover:text-red-400 transition-colors text-xs flex items-center gap-1"
              >
                <Trash2 size={12} />
                Hapus semua
              </button>
            </div>

            {scanHistory.length === 0 ? (
              <div className="px-5 py-12 text-center text-white/30">
                <History size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada scan</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {scanHistory.map((s, i) => (
                  <div key={i} className={`px-5 py-4 slide-in ${s.status === 'error' ? 'bg-red-500/5' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {s.status === 'saved' ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                          ) : s.status === 'error' ? (
                            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                          )}
                          <p className="text-white text-sm font-medium truncate">{s.barcode.namaProduk}</p>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                          <span className="flex items-center gap-1"><MapPin size={10} />{s.storageBin}</span>
                          <span className="flex items-center gap-1"><Package size={10} />{s.jumlahKarton} CTN = {s.totalUnit} {s.barcode.satuanKecil}</span>
                          <span>{s.timestamp}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditModal({ index: i, session: { ...s, barcode: { ...s.barcode } } })}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-amber-400/20 text-white/40 hover:text-amber-400 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Edit2 size={16} className="text-amber-400" />
                Edit Data Scan
              </h3>
              <button onClick={() => setEditModal(null)} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-white/50 text-xs mb-1">Produk</p>
                <p className="text-white font-medium">{editModal.session.barcode.namaProduk}</p>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Jumlah Karton</label>
                <input
                  type="number"
                  min={1}
                  value={editModal.session.jumlahKarton}
                  onChange={e => setEditModal(prev => prev ? {
                    ...prev,
                    session: {
                      ...prev.session,
                      jumlahKarton: parseInt(e.target.value) || 0,
                      totalUnit: (parseInt(e.target.value) || 0) * prev.session.barcode.isiKarton
                    }
                  } : null)}
                  className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Storage Bin</label>
                <input
                  type="text"
                  value={editModal.session.storageBin}
                  onChange={e => setEditModal(prev => prev ? {
                    ...prev,
                    session: { ...prev.session, storageBin: e.target.value }
                  } : null)}
                  className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white font-mono focus:border-amber-400 outline-none"
                />
              </div>
              <div className="bg-amber-400/10 rounded-xl p-3 text-center">
                <p className="text-amber-400 font-bold">
                  Total: {editModal.session.jumlahKarton} × {editModal.session.barcode.isiKarton} = {editModal.session.totalUnit} {editModal.session.barcode.satuanKecil}
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 text-slate-900 font-semibold text-sm hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={14} />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
