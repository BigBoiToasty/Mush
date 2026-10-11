// CSV export/import of a binder's slots.

// Pure: CSV of a binder's slots, sorted by page/slot. Fields are quoted per
// RFC 4180 so card names with commas or quotes survive a spreadsheet import.
// card_image is included so the file is a restorable backup (csvToSlots),
// not just a snapshot.
export function slotsToCsv(binderName, slots) {
  const esc = (value) => {
    const s = String(value ?? '')
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  const rows = [...slots]
    .sort((a, b) => a.page_number - b.page_number || a.slot_number - b.slot_number)
    .map((s) =>
      [binderName, s.page_number, s.slot_number, s.card_id, s.card_name, s.variant, s.language, s.card_image]
        .map(esc).join(','))
  return ['binder,page,slot,card_id,card_name,variant,language,card_image', ...rows].join('\n')
}

// Pure: RFC 4180 CSV text -> rows of string fields. Handles quoted fields
// containing commas, doubled quotes, and newlines; accepts \n or \r\n.
function parseCsv(text) {
  const rows = [[]]
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c !== '"') field += c
      else if (text[i + 1] === '"') { field += '"'; i++ }
      else inQuotes = false
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      rows[rows.length - 1].push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      rows[rows.length - 1].push(field)
      field = ''
      rows.push([])
    } else {
      field += c
    }
  }
  rows[rows.length - 1].push(field)
  const last = rows[rows.length - 1]
  if (last.length === 1 && last[0] === '') rows.pop() // trailing newline
  return rows
}

// Pure: parse an exported CSV back into slot rows for import. Header-driven,
// so column order doesn't matter and extra columns (like binder) are ignored.
// Throws with a row-numbered message on anything that can't become a slot.
export function csvToSlots(text) {
  const rows = parseCsv(text)
  const header = rows.shift() ?? []
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]))
  for (const col of ['page', 'slot', 'card_id', 'card_image']) {
    if (idx[col] === undefined) throw new Error(`Missing "${col}" column -- is this a Mush export?`)
  }
  return rows.map((r, n) => {
    const page = Number(r[idx.page])
    const slot = Number(r[idx.slot])
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(slot) || slot < 0 || slot > 8
      || !r[idx.card_id] || !r[idx.card_image]) {
      throw new Error(`Row ${n + 2} is not a valid card row`)
    }
    return {
      page_number: page,
      slot_number: slot,
      card_id: r[idx.card_id],
      card_image: r[idx.card_image],
      card_name: r[idx.card_name] || null,
      variant: r[idx.variant] || null,
      language: r[idx.language] || 'en',
    }
  })
}
