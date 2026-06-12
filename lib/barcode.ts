export interface ParsedBarcode {
  kodeItem: string       // 1201020711
  kodeProduk: string     // D26158
  satuanBesar: string    // CTN
  isiKarton: number      // 12 (parsed from 12.00000)
  satuanKecil: string    // PCS
  kodeBarcode: string    // 852600153
  namaProduk: string     // Hanasui Glow Expert Package 4pack x 12
  gudang: string         // WH
}

export function parseBarcode(raw: string): ParsedBarcode | null {
  const parts = raw.trim().split(';')
  if (parts.length < 8) return null

  const isiKartonRaw = parseFloat(parts[3])
  if (isNaN(isiKartonRaw)) return null

  return {
    kodeItem: parts[0].trim(),
    kodeProduk: parts[1].trim(),
    satuanBesar: parts[2].trim(),
    isiKarton: Math.round(isiKartonRaw), // remove decimals: 12.00000 → 12
    satuanKecil: parts[4].trim(),
    kodeBarcode: parts[5].trim(),
    namaProduk: parts[6].trim(),
    gudang: parts[7].trim(),
  }
}

export function formatTimestamp(): { timestamp: string; tanggal: string } {
  const now = new Date()
  // WIB = UTC+7
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const iso = wib.toISOString().replace('T', ' ').substring(0, 19)
  const tanggal = wib.toISOString().substring(0, 10)
  return { timestamp: iso + ' WIB', tanggal }
}
