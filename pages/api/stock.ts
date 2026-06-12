import type { NextApiRequest, NextApiResponse } from 'next'
import { getAllStockRecords, addStockRecord, updateStockRecord } from '../../lib/sheets'
import { formatTimestamp } from '../../lib/barcode'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const records = await getAllStockRecords()
      return res.status(200).json({ success: true, data: records })
    }

    if (req.method === 'POST') {
      const body = req.body
      const { timestamp, tanggal } = formatTimestamp()
      const id = await addStockRecord({
        timestamp,
        tanggal,
        kodeItem: body.kodeItem,
        kodeProduk: body.kodeProduk,
        satuanBesar: body.satuanBesar,
        isiKarton: body.isiKarton,
        satuanKecil: body.satuanKecil,
        kodeBarcode: body.kodeBarcode,
        namaProduk: body.namaProduk,
        gudang: body.gudang,
        storageBin: body.storageBin,
        jumlahKarton: body.jumlahKarton,
        totalUnit: body.jumlahKarton * body.isiKarton,
        operator: body.operator || 'Operator',
        status: 'Selesai',
      })
      return res.status(200).json({ success: true, id })
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body
      if (updates.jumlahKarton !== undefined && updates.isiKarton !== undefined) {
        updates.totalUnit = updates.jumlahKarton * updates.isiKarton
      }
      const ok = await updateStockRecord(id, updates)
      return res.status(200).json({ success: ok })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
