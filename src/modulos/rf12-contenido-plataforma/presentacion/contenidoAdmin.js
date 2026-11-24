import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioContenido } from '../aplicacion/ServicioContenido.js';
import { alerta, esc } from '../../../core/Ui.js';

if (iniciarVista('admin_plataforma', { tablero: false })) {
  const sv = new ServicioContenido(), k = sv.obtener(), c = document.getElementById('contenido');
  const lineas = (a) => a.map(i => `${i.titulo} | ${i.texto || ''}`).join('\n');
  const area = (n, etq, v, filas = 3) => `<div class="cp ancho"><label for="${n}">${etq}</label><textarea id="${n}" name="${n}" rows="${filas}">${esc(v)}</textarea></div>`;
  c.innerHTML = `<h1>Contenido de la plataforma</h1><p class="sub">Lo que se muestra en la página de inicio. Las secciones de novedades, promociones y alianzas se escriben una por línea con el formato <b>Título | texto</b>; si quedan vacías, no se muestran.</p>
  <div id="msg" class="alerta" hidden role="alert"></div>
  <form id="form" class="grid-form">${area('quienesSomos', 'Quiénes somos', k.quienesSomos)}${area('mision', 'Misión', k.mision)}${area('vision', 'Visión', k.vision)}
  <div class="cp"><label for="correo">Correo de contacto</label><input id="correo" name="correo" type="email" value="${esc(k.contacto.correo)}"></div>
  <div class="cp"><label for="telefono">Teléfono de contacto</label><input id="telefono" name="telefono" type="text" value="${esc(k.contacto.telefono)}"></div>
  ${area('novedades', 'Novedades', lineas(k.novedades))}${area('promociones', 'Promociones', lineas(k.promociones))}${area('alianzas', 'Alianzas', lineas(k.alianzas))}
  <button class="btn" type="submit">Guardar contenido</button></form>`;
  const parse = (t) => t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [a, ...r] = l.split('|'); return { titulo: a.trim(), texto: r.join('|').trim() }; });
  document.getElementById('form').addEventListener('submit', (ev) => { ev.preventDefault(); const d = Object.fromEntries(new FormData(ev.target));
    sv.guardar({ quienesSomos: d.quienesSomos, mision: d.mision, vision: d.vision, contacto: { correo: d.correo, telefono: d.telefono },
      novedades: parse(d.novedades), promociones: parse(d.promociones), alianzas: parse(d.alianzas) });
    alerta(document.getElementById('msg'), 'Contenido guardado. Ya se ve en la página de inicio.', 'ok'); });
}
