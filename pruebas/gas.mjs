import { fileURLToPath as __f } from 'node:url'; const RAIZ = __f(new URL('../', import.meta.url));
import vm from 'node:vm'; import fs from 'node:fs'; import crypto from 'node:crypto';
class Hoja { constructor(n) { this.n = n; this.d = []; }
  getLastRow() { return this.d.length; } getLastColumn() { return this.d[0] ? this.d[0].length : 0; } getMaxRows() { return 1000; }
  getRange(r, c, nr = 1, nc = 1) { const h = this; return { getValues: () => { const o = []; for (let i = 0; i < nr; i++) { const f = h.d[r - 1 + i] || []; o.push(Array.from({ length: nc }, (_, j) => f[c - 1 + j] ?? '')); } return o; },
    setValues: (v) => v.forEach((f, i) => { h.d[r - 1 + i] = h.d[r - 1 + i] || []; f.forEach((x, j) => h.d[r - 1 + i][c - 1 + j] = x); }), setNumberFormat() { return this; }, setFontWeight() { return this; } }; }
  appendRow(v) { this.d.push([...v]); } deleteRow(i) { this.d.splice(i - 1, 1); } setFrozenRows() {} }
export function crearServidor() {
  const hojas = {}, props = {}, archivos = {}; let nf = 0;
  const sandbox = { console: { log: () => {} }, JSON, Date, Math, Object, Array, String, Number, Boolean, RegExp, Error,
    SpreadsheetApp: { getActive: () => ({ getSheetByName: n => hojas[n] || null, insertSheet: n => (hojas[n] = new Hoja(n)) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(x => x > 127 ? x - 256 : x),
      base64Decode: s => Array.from(Buffer.from(s, 'base64')), base64Encode: b => Buffer.from(b).toString('base64'), newBlob: (bytes, mime, nombre) => ({ bytes, mime, nombre, getBytes: () => bytes }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ t, setMimeType() { return this; }, getContent() { return t; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => props[k] = v }) },
    DriveApp: { createFolder: () => ({ getId: () => 'carpeta', createFile: b => { const id = 'f' + (++nf); archivos[id] = { blob: b, papelera: false }; return { getId: () => id }; } }),
      getFolderById: () => ({ getId: () => 'carpeta', createFile: b => { const id = 'f' + (++nf); archivos[id] = { blob: b, papelera: false }; return { getId: () => id }; } }),
      getFileById: id => ({ getBlob: () => ({ getBytes: () => archivos[id].blob.bytes }), setTrashed: v => archivos[id].papelera = v }) } };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync(RAIZ + 'backend/Codigo.gs', 'utf8'), sandbox);
  const llamar = (cuerpo) => JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(cuerpo) } }).getContent());
  return { sandbox, hojas, archivos, llamar, inicializar: () => sandbox.inicializar() };
}
