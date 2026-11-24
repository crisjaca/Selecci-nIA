import { Api } from '../../../core/Api.js';
import { Log } from '../../../core/Logger.js';
import { ExtractorTexto } from '../infraestructura/ExtractorTexto.js';
import { ErrorApp } from '../../../core/Errores.js';

// Postulación en modo remoto: el candidato no tiene datos locales, así que todo se valida y se guarda en el SERVIDOR.
// Aquí solo se hacen las comprobaciones rápidas (para dar el error al instante) y se envía el archivo en base64.
// El texto del CV se extrae en el navegador (el servidor no puede leer PDF/DOCX) y viaja junto al archivo.
const MAX = 10 * 1024 * 1024;
const aBase64 = async (file) => { const b = new Uint8Array(await file.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
export const PostulacionRemota = {
  async postular(d) {
    const f = d.archivo; if (!f) throw new ErrorApp('ARCHIVO', 'Adjunta tu hoja de vida.');
    if (!['pdf', 'docx'].includes(f.name.split('.').pop().toLowerCase())) throw new ErrorApp('FORMATO', 'La hoja de vida debe ser un archivo PDF o DOCX.');
    if (f.size > MAX) throw new ErrorApp('PESO', 'La hoja de vida pesa más de 10 MB. Reduce su tamaño e inténtalo de nuevo.');
    const textoExtraido = await new ExtractorTexto().extraer(f).catch(() => '');
    Log.info('Postulacion', 'Enviando postulación al servidor', { kb: Math.round(f.size / 1024), conTexto: !!textoExtraido });
    return Api.llamar('postular', { idVacante: d.idVacante, nombre: d.nombre, correo: d.correo, telefono: d.telefono, nivelEducativo: d.nivelEducativo, aniosExperiencia: d.aniosExperiencia,
      consentimiento: d.consentimiento, textoExtraido, archivo: { nombre: f.name, base64: await aBase64(f) } }, { publico: true });
  }
};
