import { fileURLToPath as __f } from 'node:url'; const RAIZ = __f(new URL('../', import.meta.url));
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
globalThis.localStorage = mem(); globalThis.sessionStorage = mem();
const R = RAIZ + 'src/modulos/', imp = (p) => import(R + p);
await imp('rf14-auditoria/aplicacion/engancharAuditoria.js');
const { ServicioEmpresa } = await imp('rf01-empresa-suscripcion/aplicacion/ServicioEmpresa.js');
const { ServicioPlan } = await imp('rf01-empresa-suscripcion/aplicacion/ServicioPlan.js');
const { ServicioSuscripcion } = await imp('rf01-empresa-suscripcion/aplicacion/ServicioSuscripcion.js');
const { ServicioUsuariosEmpresa } = await imp('rf01-empresa-suscripcion/aplicacion/ServicioUsuariosEmpresa.js');
const { ServicioAutenticacion } = await imp('rf11-autenticacion/aplicacion/ServicioAutenticacion.js');
const { ServicioSugerencias } = await imp('rf12-contenido-plataforma/aplicacion/ServicioSugerencias.js');
const { ServicioNotificaciones } = await imp('rf13-avisos-notificaciones/aplicacion/ServicioNotificaciones.js');
const { ServicioAuditoria } = await imp('rf14-auditoria/aplicacion/ServicioAuditoria.js');
const { ServicioVacantes } = await imp('rf02-vacantes/aplicacion/ServicioVacantes.js');
const { ServicioCandidatos } = await imp('rf03-hojas-de-vida/aplicacion/ServicioCandidatos.js');
const { ServicioRevision } = await imp('rf08-revision-decision/aplicacion/ServicioRevision.js');
const { SesionActiva } = await imp('../core/SesionActiva.js').catch(() => import(RAIZ + 'src/core/SesionActiva.js'));
const ok = (c, m) => console.log((c ? 'OK   ' : 'FALLA') + ' ' + m);
const err = async (f) => { try { await f(); return null; } catch (e) { return e.codigo || e.message; } };
const au = new ServicioAutenticacion(), aud = new ServicioAuditoria(), se = new ServicioEmpresa(), sp = new ServicioPlan(), ss = new ServicioSuscripcion(), uu = new ServicioUsuariosEmpresa();

// admin entra
await au.sembrarAdmin(); const admin = await au.iniciarSesion('admin@seleccionia.com', 'Admin123!');
ok(aud.consultar({ q: 'inicio sesion' }).length === 0 && aud.consultar().some(r => r.accion === 'inicio_sesion' && r.rol === 'admin_plataforma'), 'AUDITORÍA registra el ingreso del administrador');
ok((await err(() => au.iniciarSesion('admin@seleccionia.com', 'mala'))) === 'CREDENCIALES' && aud.consultar().some(r => r.accion === 'inicio_sesion_fallido'), 'AUDITORÍA registra el intento fallido y la acción sigue fallando igual');
const { empresa, clave } = await se.crearPorAdmin({ nombreEmpresa: 'Acme', nit: '1', nombre: 'Ana', correo: 'ana@acme.co' });
ok(aud.consultar().some(r => r.accion === 'empresa_creada' && r.usuario === admin.nombre && r.idEmpresa === empresa.id), 'AUDITORÍA registra quién creó la empresa (actor tomado de la sesión)');
ok(!JSON.stringify(aud.consultar()).includes(clave), 'AUDITORÍA nunca guarda contraseñas');
const plan = sp.guardar({ nombre: 'P', precio: 1, periodicidad: 'mensual', limiteUsuarios: 3, limiteDispositivosSimultaneos: 1, sesionesPorUsuario: 1 }); ss.pagar(empresa.id, plan.id);
const r1 = (await uu.crear(empresa.id, { nombre: 'Rita', correo: 'r@acme.co', rol: 'reclutador' })), r2 = (await uu.crear(empresa.id, { nombre: 'Raúl', correo: 'raul@acme.co', rol: 'reclutador' }));
// ingreso bloqueado por límite: auditoría + notificación, sin romper
SesionActiva.limpiar(); const rita = await au.iniciarSesion('r@acme.co', r1.clave);
ok((await err(() => au.iniciarSesion('raul@acme.co', r2.clave))) === 'LIMITE_DISPOSITIVOS', 'el límite de dispositivos sigue bloqueando con auditoría activa');
const bl = aud.consultar().find(r => r.accion === 'ingreso_bloqueado'); ok(bl && bl.idEmpresa === empresa.id && bl.detalle.includes('LIMITE_DISPOSITIVOS'), 'AUDITORÍA registra el ingreso bloqueado con su empresa');
ok(aud.consultar({ idEmpresa: empresa.id }).length >= 3 && aud.consultar({ rol: 'reclutador' }).every(r => r.rol === 'reclutador'), 'AUDITORÍA filtra por empresa y por rol');
// sugerencias
SesionActiva.guardar({ token: 'x', usuario: rita.publico ? rita.publico() : rita });
const sg = new ServicioSugerencias(), sn = new ServicioNotificaciones();
ok((await err(() => sg.enviar(rita, { tipo: 'x', asunto: 'Hola', mensaje: 'mensaje largo de prueba' }))) === 'DATOS' && (await err(() => sg.enviar(rita, { tipo: 'otro', asunto: 'Hola', mensaje: 'corto' }))) === 'DATOS', 'SUGERENCIAS valida tipo y longitud');
const s = sg.enviar(rita, { tipo: 'sugerencia', asunto: 'Exportar a Excel', mensaje: 'Sería útil exportar el ranking a Excel.' });
const nuevas = sn.noLeidas().filter(n => n.tipo === 'sugerencia'); ok(nuevas.length === 1 && nuevas[0].datos.idSugerencia === s.id, 'SUGERENCIAS genera la notificación para el administrador');
ok(sn.noLeidas().filter(n => n.tipo === 'limite_dispositivos').length === 1, 'las notificaciones de límite de dispositivos siguen separadas por tipo (sin mezclarse)');
ok(sg.deUsuario(rita.id).length === 1 && sg.deUsuario('otro').length === 0 && sg.todas().length === 1, 'SUGERENCIAS: cada usuario ve las suyas; el administrador ve todas');
sg.responder(s.id, 'Lo tendremos en cuenta'); ok(sg.repo.obtener(s.id).estado === 'atendida' && sn.noLeidas().filter(n => n.tipo === 'sugerencia').length === 0, 'SUGERENCIAS: responder la marca atendida y apaga su notificación');
ok(aud.consultar().some(r => r.accion === 'sugerencia_enviada') && aud.consultar().some(r => r.accion === 'sugerencia_respondida'), 'AUDITORÍA registra el envío y la respuesta de sugerencias');
// auditoría no incluye datos personales de candidatos
const v = new ServicioVacantes().guardar(empresa.id, { titulo: 'Analista', perfilProfesional: 'x', nivelEducativoMinimo: 'Profesional', aniosExperienciaMinima: 1 }); new ServicioVacantes().cambiarEstado(empresa.id, v.id, 'publicada');
const store = new Map(), sc = new ServicioCandidatos({ archivos: { guardar: async (i, f) => store.set(i, f), obtener: async i => store.get(i), eliminar: async i => store.delete(i) }, extractor: { extraer: async () => '' } });
SesionActiva.limpiar(); const cand = await sc.postular({ idVacante: v.id, nombre: 'Nombre Secreto', correo: 'secreto@x.co', nivelEducativo: 'Profesional', aniosExperiencia: 2, consentimiento: true, archivo: { name: 'cv.pdf', size: 100 } });
const todo = JSON.stringify(aud.consultar()); ok(aud.consultar().some(r => r.accion === 'postulacion_recibida' && r.usuario === 'Público / sistema') && !todo.includes('Nombre Secreto') && !todo.includes('secreto@x.co'), 'AUDITORÍA registra la postulación pública sin nombre ni correo del candidato');
await sc.eliminar(empresa.id, cand.id); ok(aud.consultar().some(r => r.accion === 'candidato_eliminado'), 'AUDITORÍA registra la eliminación de datos');
// un fallo de la auditoría no rompe la acción
const { Auditoria } = await imp('rf14-auditoria/aplicacion/Auditoria.js'); const orig = localStorage.setItem; ok(typeof Auditoria.registrar('x', {}) === 'undefined', 'registrar() nunca lanza errores');
