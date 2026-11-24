import { CONFIG } from '../../../../config/app.config.js';
import { Auditoria } from './Auditoria.js';
import { ServicioAutenticacion } from '../../rf11-autenticacion/aplicacion/ServicioAutenticacion.js';
import { RepositorioUsuario } from '../../rf11-autenticacion/infraestructura/RepositorioUsuario.js';
import { ServicioEmpresa } from '../../rf01-empresa-suscripcion/aplicacion/ServicioEmpresa.js';
import { ServicioPlan } from '../../rf01-empresa-suscripcion/aplicacion/ServicioPlan.js';
import { ServicioSuscripcion } from '../../rf01-empresa-suscripcion/aplicacion/ServicioSuscripcion.js';
import { ServicioUsuariosEmpresa } from '../../rf01-empresa-suscripcion/aplicacion/ServicioUsuariosEmpresa.js';
import { ServicioVacantes } from '../../rf02-vacantes/aplicacion/ServicioVacantes.js';
import { ServicioCandidatos } from '../../rf03-hojas-de-vida/aplicacion/ServicioCandidatos.js';
import { ServicioFiltro } from '../../rf04-filtro/aplicacion/ServicioFiltro.js';
import { ServicioPuntaje } from '../../rf07-puntaje/aplicacion/ServicioPuntaje.js';
import { ServicioRevision } from '../../rf08-revision-decision/aplicacion/ServicioRevision.js';
import { ServicioEtapas } from '../../rf09-evaluacion-etapas/aplicacion/ServicioEtapas.js';
import { ServicioContenido } from '../../rf12-contenido-plataforma/aplicacion/ServicioContenido.js';
import { ServicioSugerencias } from '../../rf12-contenido-plataforma/aplicacion/ServicioSugerencias.js';
import { ServicioAvisos } from '../../rf13-avisos-notificaciones/aplicacion/ServicioAvisos.js';

// c: clase, m: método, accion, entidad; id/emp/det/actor: funciones (args, resultado). Nunca incluyas contraseñas ni datos personales de candidatos.
const E = [
  { c: ServicioAutenticacion, m: 'iniciarSesion', soloLocal: true, accion: 'inicio_sesion', entidad: 'usuario', id: (a, r) => r.id, emp: (a, r) => r.idEmpresa, actor: (a, r) => r, det: () => 'Ingreso correcto',
    fallo: (a, e) => ({ accion: e.codigo === 'CREDENCIALES' ? 'inicio_sesion_fallido' : 'ingreso_bloqueado', detalle: `${e.codigo} · ${a[0]}`, idEmpresa: new RepositorioUsuario().porCorreo(a[0] || '')?.idEmpresa ?? null }) },
  { c: ServicioAutenticacion, m: 'cerrarSesion', soloLocal: true, accion: 'cierre_sesion', entidad: 'usuario', previo: true },
  { c: ServicioAutenticacion, m: 'cambiarClave', soloLocal: true, accion: 'clave_cambiada', entidad: 'usuario' },
  { c: ServicioEmpresa, m: 'crearPorAdmin', accion: 'empresa_creada', entidad: 'empresa', id: (a, r) => r.empresa.id, emp: (a, r) => r.empresa.id, det: (a, r) => r.empresa.nombre },
  { c: ServicioEmpresa, m: 'registrar', soloLocal: true, accion: 'empresa_registrada', entidad: 'empresa', id: (a, r) => r.id, emp: (a, r) => r.id, det: (a, r) => r.nombre },
  { c: ServicioEmpresa, m: 'cambiarEstado', accion: 'empresa_estado', entidad: 'empresa', id: a => a[0], emp: a => a[0], det: a => 'Estado: ' + a[1] },
  { c: ServicioEmpresa, m: 'reiniciarClave', accion: 'clave_reiniciada_empresa', entidad: 'empresa', id: a => a[0], emp: a => a[0] },
  { c: ServicioPlan, m: 'guardar', accion: 'plan_guardado', entidad: 'plan', id: (a, r) => r.id, emp: () => null, det: (a, r) => r.nombre },
  { c: ServicioPlan, m: 'cambiarEstado', accion: 'plan_estado', entidad: 'plan', id: a => a[0], emp: () => null, det: a => 'Estado: ' + a[1] },
  { c: ServicioPlan, m: 'eliminar', accion: 'plan_eliminado', entidad: 'plan', id: a => a[0], emp: () => null },
  { c: ServicioSuscripcion, m: 'pagar', accion: 'suscripcion_pagada', entidad: 'suscripcion', id: (a, r) => r.id, emp: a => a[0], det: (a, r) => 'Transacción ' + r.idTransaccion },
  { c: ServicioSuscripcion, m: 'cancelar', accion: 'suscripcion_cancelada', entidad: 'suscripcion', id: a => a[0] },
  { c: ServicioUsuariosEmpresa, m: 'crear', accion: 'usuario_creado', entidad: 'usuario', id: (a, r) => r.usuario.id, emp: a => a[0], det: (a, r) => 'Rol: ' + r.usuario.rol },
  { c: ServicioUsuariosEmpresa, m: 'cambiarEstado', accion: 'usuario_estado', entidad: 'usuario', id: a => a[1], emp: a => a[0], det: a => 'Estado: ' + a[2] },
  { c: ServicioUsuariosEmpresa, m: 'reiniciarClave', accion: 'clave_reiniciada_usuario', entidad: 'usuario', id: a => a[1], emp: a => a[0] },
  { c: ServicioVacantes, m: 'guardar', accion: 'vacante_guardada', entidad: 'vacante', id: (a, r) => r.id, emp: a => a[0], det: (a, r) => r.titulo },
  { c: ServicioVacantes, m: 'cambiarEstado', accion: 'vacante_estado', entidad: 'vacante', id: a => a[1], emp: a => a[0], det: a => 'Estado: ' + a[2] },
  { c: ServicioVacantes, m: 'eliminar', accion: 'vacante_eliminada', entidad: 'vacante', id: a => a[1], emp: a => a[0] },
  { c: ServicioCandidatos, m: 'postular', accion: 'postulacion_recibida', entidad: 'candidato', id: (a, r) => r.id, emp: (a, r) => r.idEmpresa, det: a => 'Vacante ' + a[0].idVacante },
  { c: ServicioCandidatos, m: 'eliminar', accion: 'candidato_eliminado', entidad: 'candidato', id: a => a[1], emp: a => a[0], det: () => 'Eliminación definitiva' },
  { c: ServicioFiltro, m: 'ejecutar', accion: 'filtro_ejecutado', entidad: 'vacante', id: a => a[1], emp: a => a[0], det: (a, r) => `${r.filter(x => x.cumple).length} de ${r.length} cumplen` },
  { c: ServicioPuntaje, m: 'calcularVacante', accion: 'puntajes_calculados', entidad: 'vacante', id: a => a[1], emp: a => a[0], det: (a, r) => `${r.length} candidato(s)` },
  { c: ServicioEtapas, m: 'crearEtapa', accion: 'etapa_creada', entidad: 'etapa', id: (a, r) => r.id, emp: a => a[0], det: (a, r) => r.nombreEtapa },
  { c: ServicioEtapas, m: 'usarSugeridas', accion: 'etapas_sugeridas', entidad: 'vacante', id: a => a[1], emp: a => a[0] },
  { c: ServicioEtapas, m: 'eliminarEtapa', accion: 'etapa_eliminada', entidad: 'etapa', id: a => a[1], emp: a => a[0] },
  { c: ServicioEtapas, m: 'registrarEvaluacion', accion: 'evaluacion_registrada', entidad: 'candidato', id: (a, r) => r.idCandidato, emp: a => a[0].idEmpresa, actor: a => a[0], det: (a, r) => `${r.nombreEtapa}: ${r.resultado}` },
  { c: ServicioRevision, m: 'decidir', accion: 'decision_registrada', entidad: 'candidato', id: (a, r) => r.idCandidato, emp: a => a[0].idEmpresa, actor: a => a[0], det: (a, r) => `${r.decisionTomada} · ${r.nombreEtapa}` },
  { c: ServicioContenido, m: 'guardar', accion: 'contenido_editado', entidad: 'contenido', emp: () => null },
  { c: ServicioAvisos, m: 'publicar', accion: 'aviso_publicado', entidad: 'aviso', id: (a, r) => r.id, emp: () => null, det: (a, r) => r.titulo },
  { c: ServicioAvisos, m: 'archivar', accion: 'aviso_archivado', entidad: 'aviso', id: a => a[0], emp: () => null },
  { c: ServicioSugerencias, m: 'enviar', accion: 'sugerencia_enviada', entidad: 'sugerencia', id: (a, r) => r.id, emp: a => a[0].idEmpresa, actor: a => a[0], det: (a, r) => 'Tipo: ' + r.tipo },
  { c: ServicioSugerencias, m: 'responder', accion: 'sugerencia_respondida', entidad: 'sugerencia', id: a => a[0], emp: () => null }
];
function envolver(x) {
  // soloLocal: en modo remoto estas acciones las audita el servidor (evita duplicados)
  if (x.soloLocal && CONFIG.modo === 'remoto') return;
  const proto = x.c.prototype, orig = proto[x.m]; if (!orig || orig.__aud) return;
  const reg = (a, r) => Auditoria.registrar(x.accion, { entidad: x.entidad, idEntidad: x.id?.(a, r), idEmpresa: x.emp?.(a, r), detalle: x.det?.(a, r) ?? '', actor: x.actor?.(a, r) });
  const seguro = (f) => { try { f(); } catch { /* la auditoría no rompe la acción */ } };
  const fallar = (a, e) => seguro(() => { if (x.fallo) { const f = x.fallo(a, e); Auditoria.registrar(f.accion, { entidad: x.entidad, detalle: f.detalle, idEmpresa: f.idEmpresa }); } });
  const w = function (...a) {
    if (x.previo) seguro(() => reg(a));
    let r; try { r = orig.apply(this, a); } catch (e) { fallar(a, e); throw e; }
    if (r && typeof r.then === 'function') return r.then(v => { if (!x.previo) seguro(() => reg(a, v)); return v; }, e => { fallar(a, e); throw e; });
    if (!x.previo) seguro(() => reg(a, r)); return r;
  };
  w.__aud = true; proto[x.m] = w;
}
E.forEach(envolver);
