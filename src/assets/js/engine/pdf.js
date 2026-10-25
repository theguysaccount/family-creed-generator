// A one-page PDF around a JPEG, sized for print. No library: a PDF this simple is a few objects.
// jpeg: Uint8Array of a baseline or progressive JPEG; px: its pixel size; page: size in points.
export function jpegPdf(jpeg, pxW, pxH, pageW, pageH, meta = {}) {
  const enc = new TextEncoder();
  const chunks = [];
  let len = 0;
  const offsets = [];
  const push = (data) => {
    const b = typeof data === "string" ? enc.encode(data) : data;
    chunks.push(b);
    len += b.length;
  };
  const obj = (n, body, stream) => {
    offsets[n] = len;
    push(`${n} 0 obj\n${body}\n`);
    if (stream) { push("stream\n"); push(stream); push("\nendstream\n"); }
    push("endobj\n");
  };
  const pdfStr = (s) => "(" + String(s).replace(/[^\x20-\x7e]/g, "").replace(/([\\()])/g, "\\$1") + ")";
  const W = pageW.toFixed(2), H = pageH.toFixed(2);
  const content = enc.encode(`q\n${W} 0 0 ${H} 0 0 cm\n/Im0 Do\nQ\n`);
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /TrimBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
  obj(5, `<< /Length ${content.length} >>`, content);
  obj(6, `<< /Title ${pdfStr(meta.title || "Family crest")} /Creator ${pdfStr(meta.creator || "Family Creed Generator")} /Producer ${pdfStr("Family Creed Generator")} >>`);
  const xref = len;
  let x = `xref\n0 7\n0000000000 65535 f \n`;
  for (let n = 1; n <= 6; n++) x += String(offsets[n]).padStart(10, "0") + " 00000 n \n";
  push(x);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
