import { google } from 'googleapis'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const SHEET_NAME_STOCK = 'StockOpname'
const SHEET_NAME_HISTORY = 'ScanHistory'

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export async function getSheets() {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

export async function ensureHeaders() {
  const sheets = await getSheets()

  // Check/create StockOpname sheet
  const stockHeaders = [
    'ID', 'Timestamp', 'Tanggal', 'Kode Item', 'Kode Produk', 'Satuan Besar',
    'Isi Karton', 'Satuan Kecil', 'Kode Barcode', 'Nama Produk', 'Gudang',
    'Storage Bin', 'Jumlah Karton', 'Total Unit', 'Operator', 'Status'
  ]

  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME_STOCK}!A1:P1`,
    })
  } catch {
    // Sheet doesn't exist, create headers
  }

  const stockData = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME_STOCK}!A1:P1`,
  }).catch(() => ({ data: { values: [] } }))

  if (!stockData.data.values || stockData.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME_STOCK}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [stockHeaders] },
    })
  }
}

export interface StockRecord {
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

export async function getAllStockRecords(): Promise<StockRecord[]> {
  const sheets = await getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME_STOCK}!A2:P`,
  })

  const rows = res.data.values || []
  return rows.map(row => ({
    id: row[0] || '',
    timestamp: row[1] || '',
    tanggal: row[2] || '',
    kodeItem: row[3] || '',
    kodeProduk: row[4] || '',
    satuanBesar: row[5] || '',
    isiKarton: parseFloat(row[6]) || 0,
    satuanKecil: row[7] || '',
    kodeBarcode: row[8] || '',
    namaProduk: row[9] || '',
    gudang: row[10] || '',
    storageBin: row[11] || '',
    jumlahKarton: parseFloat(row[12]) || 0,
    totalUnit: parseFloat(row[13]) || 0,
    operator: row[14] || '',
    status: row[15] || '',
  }))
}

export async function addStockRecord(record: Omit<StockRecord, 'id'>): Promise<string> {
  await ensureHeaders()
  const sheets = await getSheets()

  // Get current count to generate ID
  const existing = await getAllStockRecords()
  const id = `SO-${Date.now()}`

  const row = [
    id,
    record.timestamp,
    record.tanggal,
    record.kodeItem,
    record.kodeProduk,
    record.satuanBesar,
    record.isiKarton,
    record.satuanKecil,
    record.kodeBarcode,
    record.namaProduk,
    record.gudang,
    record.storageBin,
    record.jumlahKarton,
    record.totalUnit,
    record.operator,
    record.status,
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME_STOCK}!A:P`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  })

  return id
}

export async function updateStockRecord(id: string, updates: Partial<StockRecord>): Promise<boolean> {
  const sheets = await getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME_STOCK}!A:P`,
  })

  const rows = res.data.values || []
  const rowIndex = rows.findIndex(r => r[0] === id)
  if (rowIndex < 0) return false

  const existing = rows[rowIndex]
  const updated = [
    id,
    updates.timestamp ?? existing[1],
    updates.tanggal ?? existing[2],
    updates.kodeItem ?? existing[3],
    updates.kodeProduk ?? existing[4],
    updates.satuanBesar ?? existing[5],
    updates.isiKarton ?? existing[6],
    updates.satuanKecil ?? existing[7],
    updates.kodeBarcode ?? existing[8],
    updates.namaProduk ?? existing[9],
    updates.gudang ?? existing[10],
    updates.storageBin ?? existing[11],
    updates.jumlahKarton ?? existing[12],
    updates.totalUnit ?? existing[13],
    updates.operator ?? existing[14],
    updates.status ?? existing[15],
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME_STOCK}!A${rowIndex + 1}:P${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updated] },
  })

  return true
}
