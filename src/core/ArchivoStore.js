import { CONFIG } from '../../config/app.config.js';
import { Api } from './Api.js';
// Archivos (hojas de vida) en IndexedDB: localStorage no alcanza para archivos de hasta 10 MB.
// En la fase 4 se sube también a Google Drive y aquí queda como copia local para trabajar sin conexión.
const abrir = () => new Promise((res, rej) => { const r = indexedDB.open('sia-archivos', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = async (modo, fn) => { const db = await abrir(); return new Promise((res, rej) => { const t = db.transaction('f', modo), rq = fn(t.objectStore('f')); t.oncomplete = () => res(rq.result); t.onerror = () => rej(t.error); }); };
export const ArchivoStore = {
  guardar: (id, blob) => tx('readwrite', s => s.put(blob, id)),
  obtener: (id) => tx('readonly', s => s.get(id)),
  eliminar: (id) => tx('readwrite', s => s.delete(id))
};

// Modo remoto: el original vive en Google Drive. Se guarda una copia local al descargarlo (funciona sin conexión la 2.ª vez).
// Al borrar la hoja de vida, el servidor envía el archivo de Drive a la papelera. IndexedDB puede no estar disponible (modo privado): se tolera.
export const ArchivoRemoto = {
  guardar: (id, blob) => ArchivoStore.guardar(id, blob),
  async obtener(id) {
    const local = await ArchivoStore.obtener(id).catch(() => null); if (local) return local;
    const r = await Api.llamar('descargarArchivo', { idHoja: id }), bin = atob(r.base64), blob = new Blob([Uint8Array.from(bin, c => c.charCodeAt(0))]);
    await ArchivoStore.guardar(id, blob).catch(() => {}); return blob;
  },
  eliminar: (id) => ArchivoStore.eliminar(id).catch(() => {})
};
export const Archivos = () => (CONFIG.modo === 'remoto' ? ArchivoRemoto : ArchivoStore);
