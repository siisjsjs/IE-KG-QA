import * as XLSX from 'xlsx';

export type Triple = { subject: string; predicate: string; object: string };

export class ExcelService {
  parseTriples(buffer: Buffer): Triple[] {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

    const triples: Triple[] = [];
    for (const r of rows) {
      const subject = String(r.subject ?? r.Subject ?? r.S ?? '').trim();
      const predicate = String(r.predicate ?? r.Predicate ?? r.P ?? '').trim();
      const object = String(r.object ?? r.Object ?? r.O ?? '').trim();
      if (!subject || !predicate || !object) continue;
      triples.push({ subject, predicate, object });
    }
    return triples;
  }

  buildExcel(triples: Triple[]) {
    const ws = XLSX.utils.json_to_sheet(triples);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'triples');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(buf);
  }
}
