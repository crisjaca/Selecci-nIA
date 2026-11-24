// Extrae el texto del PDF o DOCX en el navegador (pdf.js y mammoth desde cdnjs). Si falla (por ejemplo sin internet),
// devuelve '' y el filtro avisa que no pudo leer el texto, sin bloquear la postulación.
const PDF = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
const cargar = (src) => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });
export class ExtractorTexto {
  async extraer(file) {
    try {
      const buf = await file.arrayBuffer(), ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        await cargar(PDF); pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
        const doc = await pdfjsLib.getDocument({ data: buf }).promise; let t = '';
        for (let i = 1; i <= Math.min(doc.numPages, 30); i++) { const c = await (await doc.getPage(i)).getTextContent(); t += c.items.map(x => x.str).join(' ') + '\n'; }
        return t.slice(0, 20000);
      }
      await cargar(MAMMOTH); return (await mammoth.extractRawText({ arrayBuffer: buf })).value.slice(0, 20000);
    } catch { return ''; }
  }
}
