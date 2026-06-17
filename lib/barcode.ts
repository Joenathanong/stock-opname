export interface ParsedBarcode {
  kodeItem: string
  kodeProduk: string
  satuanBesar: string
  isiKarton: number
  satuanKecil: string
  kodeBarcode: string
  namaProduk: string
  gudang?: string
}

export function parseBarcode(raw: string): ParsedBarcode | null {
  const parts = raw.trim().split(';')

  // Minimal sampai nama produk
  if (parts.length < 7) return null

  const isiKartonRaw = parseFloat(parts[3])
  if (isNaN(isiKartonRaw)) return null

  return {
    kodeItem: parts[0].trim(),
    kodeProduk: parts[1].trim(),
    satuanBesar: parts[2].trim(),
    isiKarton: Math.round(isiKartonRaw),
    satuanKecil: parts[4].trim(),
    kodeBarcode: parts[5].trim(),
    namaProduk: parts[6].trim(),
    gudang: parts[7]?.trim() || '',
  }
}

export function formatTimestamp(): { timestamp: string; tanggal: string } {
  const now = new Date()

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const formatted = formatter.format(now).replace(',', '')
  const [tanggal, waktu] = formatted.split(' ')

  return {
    timestamp: `${tanggal} ${waktu} WIB`,
    tanggal,
  }
}