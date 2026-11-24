import { iniciarVista } from '../../rf11-autenticacion/presentacion/shell.js';
import { ServicioAuditoria } from '../aplicacion/ServicioAuditoria.js';
import { RepositorioEmpresa } from '../../rf01-empresa-suscripcion/infraestructura/RepositorioEmpresa.js';
import { esc, tabla, fecha, hora } from '../../../core/Ui.js';

if (iniciarVista('admin_plataforma', { tablero: false })) {
  const sa = new ServicioAuditoria(), empresas = new RepositorioEmpresa().listar(), nom = Object.fromEntries(empresas.map(e => [e.id, e.nombre])), c = document.getElementById('contenido');
  c.innerHTML = `<h1>Auditoría</h1><p class="sub">Registro de acciones de la plataforma: quién hizo qué y cuándo (últimos 300 movimientos). No incluye datos personales de candidatos.</p>
  <form id="ff" class="grid-form"><div class="cp"><label for="q">Buscar</label><input id="q" name="q" type="text" placeholder="acción, usuario o detalle"></div>
  <div class="cp"><label for="idEmpresa">Empresa</label><select id="idEmpresa" name="idEmpresa"><option value="">Todas</option>${empresas.map(e => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('')}</select></div>
  <div class="cp"><label for="rol">Rol</label><select id="rol" name="rol"><option value="">Todos</option><option value="admin_plataforma">Administrador</option><option value="empresa">Empresa</option><option value="reclutador">Reclutador</option><option value="director">Director</option></select></div></form><div id="lista"></div>`;
  const f = document.getElementById('ff'), pintar = () => document.getElementById('lista').innerHTML = tabla([['Fecha', r => `${fecha(r.fecha)} ${hora(r.fecha)}`], ['Usuario', r => `${r.usuario}${r.rol ? ' (' + r.rol + ')' : ''}`], ['Acción', r => r.accion.replaceAll('_', ' ')], ['Empresa', r => nom[r.idEmpresa] || '—'], ['Detalle', r => r.detalle || '—']], sa.consultar(Object.fromEntries(new FormData(f))), 'Aún no hay movimientos.');
  f.addEventListener('input', pintar); f.addEventListener('submit', e => e.preventDefault()); pintar();
}
