export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function alerta(el, mensaje, tipo = 'error') { el.className = 'alerta ' + tipo; el.textContent = mensaje; el.hidden = !mensaje; }
export const fecha = (t) => t ? new Date(t).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const hora = (t) => t ? new Date(t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—';
export const dinero = (n) => '$' + Number(n || 0).toLocaleString('es-CO');
// cols: [[titulo, fn(fila), esHtml?], ...]
export function tabla(cols, filas, vacio = 'Aún no hay registros.') {
  if (!filas.length) return `<p class="vacio">${esc(vacio)}</p>`;
  return `<div class="tabla-w"><table><thead><tr>${cols.map(c => `<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${cols.map(c => `<td>${c[2] ? c[1](f) : esc(c[1](f))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
export const delegar = (el, fn) => el.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) fn(b.dataset.a, b.dataset.id, b); });
export const campo = (etq, name, tipo = 'text', extra = '') => `<div class="cp"><label for="${name}">${etq}</label><input id="${name}" name="${name}" type="${tipo}" ${extra}></div>`;
