export function paginate(rows, query = {}) {
  const list = Array.isArray(rows) ? rows : []
  const total = list.length
  let pageSize = Number(query.pageSize)
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 10
  pageSize = Math.floor(pageSize)

  let page = Number(query.page)
  const illegal =
    !Number.isFinite(page) ||
    !Number.isInteger(page) ||
    page < 1 ||
    (page - 1) * pageSize >= total
  if (illegal) page = 1

  const start = (page - 1) * pageSize
  const items = list.slice(start, start + pageSize)
  return { items, total, page, pageSize }
}
