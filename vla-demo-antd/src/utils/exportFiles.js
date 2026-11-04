import * as XLSX from 'xlsx'

/**
 * Pure CSV serializer for unit tests and exportCSV.
 * @param {Record<string, unknown>[]} rows
 * @returns {string}
 */
export function toCSV(rows) {
  if (!rows || rows.length === 0) return ''
  const keys = Object.keys(rows[0])
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [keys.join(',')]
  for (const row of rows) {
    lines.push(keys.map((k) => escape(row[k])).join(','))
  }
  return lines.join('\n')
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * @param {string} filename
 * @param {unknown} data
 */
export function exportJSON(filename, data) {
  const text = JSON.stringify(data, null, 2)
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  triggerDownload(blob, filename.endsWith('.json') ? filename : filename + '.json')
}

/**
 * @param {string} filename
 * @param {Record<string, unknown>[]} rows
 */
export function exportCSV(filename, rows) {
  const csv = toCSV(rows)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, filename.endsWith('.csv') ? filename : filename + '.csv')
}

/**
 * @param {string} filename
 * @param {Record<string, unknown>[]} rows
 */
export function exportExcel(filename, rows) {
  const sheet = XLSX.utils.json_to_sheet(rows || [])
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1')
  const name = filename.endsWith('.xlsx') ? filename : filename + '.xlsx'
  XLSX.writeFile(book, name)
}