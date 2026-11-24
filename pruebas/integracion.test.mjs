import { fileURLToPath as __f } from 'node:url'; const RAIZ = __f(new URL('../', import.meta.url));
import { crearServidor } from './gas.mjs';
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), get size() { return m.size; } }; };
const dev = (n) => ({ n, ls: mem(), ss: mem() }), usar = (d) => { globalThis.localStorage = d.ls; globalThis.sessionStorage = d.ss; };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true, userAgent: 'Chrome/1' }, configurable: true, writable: true });
const S = crearServidor(); S.inicializar(); let red = true;
globalThis.fetch = async (url, o) => { if (!red) throw new TypeError('sin red'); return { json: async () => S.llamar(JSON.parse(o.body)) }; };
const R = RAIZ + '', imp = (p) => import(R + p);
const { CONFIG } = await imp('config/app.config.js'); CONFIG.modo = 'remoto'; CONFIG.appsScriptUrl = 'mock'; CONFIG.nivelLog = 'error';
await imp('src/modulos/rf14-auditoria/aplicacion/engancharAuditoria.js');
const M = 'src/modulos/';
const { ServicioAutenticacion } = await imp(M + 'rf11-autenticacion/aplicacion/ServicioAutenticacion.js');
const { Sync } = await imp(M + 'rf10-sin-conexion/aplicacion/Sincronizador.js');
const { ServicioPlan } = await imp(M + 'rf01-empresa-suscripcion/aplicacion/ServicioPlan.js');
const { ServicioEmpresa } = await imp(M + 'rf01-empresa-suscripcion/aplicacion/ServicioEmpresa.js');
const { ServicioSuscripcion } = await imp(M + 'rf01-empresa-suscripcion/aplicacion/ServicioSuscripcion.js');
const { ServicioUsuariosEmpresa } = await imp(M + 'rf01-empresa-suscripcion/aplicacion/ServicioUsuariosEmpresa.js');
const { ServicioVacantes } = await imp(M + 'rf02-vacantes/aplicacion/ServicioVacantes.js');
const { ServicioCandidatos } = await imp(M + 'rf03-hojas-de-vida/aplicacion/ServicioCandidatos.js');
const { PostulacionRemota } = await imp(M + 'rf03-hojas-de-vida/aplicacion/PostulacionRemota.js');
const { ServicioFiltro } = await imp(M + 'rf04-filtro/aplicacion/ServicioFiltro.js');
const { ServicioPuntaje } = await imp(M + 'rf07-puntaje/aplicacion/ServicioPuntaje.js');
const { ServicioNotificaciones } = await imp(M + 'rf13-avisos-notificaciones/aplicacion/ServicioNotificaciones.js');
const { RepositorioCandidato } = await imp(M + 'rf03-hojas-de-vida/infraestructura/RepositorioCandidato.js');
const { Cola } = await imp('src/core/Cola.js'); const { SesionActiva } = await imp('src/core/SesionActiva.js'); const { Api } = await imp('src/core/Api.js');
let ok = 0, mal = 0; const t = (c, m) => { c ? ok++ : mal++; console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); };
const err = async (f) => { try { await f(); return null; } catch (e) { return e.codigo || e.message; } };
const ADMIN = dev('admin'), EMP = dev('empresa'), R1 = dev('rec1'), R2 = dev('rec2'), PUB = dev('publico'), au = () => new ServicioAutenticacion();

// ===== Administrador: entra, crea plan y empresa (todo viaja por la cola)
usar(ADMIN); await au().iniciarSesion('admin@seleccionia.com', 'Admin123!'); t(!!SesionActiva.obtener().token && Sync.estado().ultima, 'ADMIN inicia sesión en el servidor y hace la primera sincronización');
const plan = new ServicioPlan().guardar({ nombre: 'Estándar', precio: 100, periodicidad: 'mensual', limiteUsuarios: 3, limiteDispositivosSimultaneos: 1, sesionesPorUsuario: 1 });
t(Sync.pendientes() === 2 && S.hojas.planes.d.length === 1, 'ADMIN crea un plan: queda en la cola (el plan y su registro de auditoría), aún no está en Sheets');
await Sync.sincronizar(); t(Sync.pendientes() === 0 && S.hojas.planes.d.length === 2, 'ADMIN sincroniza: el plan llega a la hoja y la cola queda vacía');
const { empresa, clave } = await new ServicioEmpresa().crearPorAdmin({ nombreEmpresa: 'Acme', nit: '0123', nombre: 'Ana', correo: 'ana@acme.co' }); await Sync.sincronizar();
t(S.hojas.empresas.d.length === 2 && S.hojas.usuarios.d.length === 3, 'ADMIN crea empresa + cuenta con contraseña por defecto (en Sheets: empresa y 2 usuarios)');
// ===== Empresa: paga, crea usuarios
usar(EMP); const ue = await au().iniciarSesion('ana@acme.co', clave); t(ue.debeCambiarClave && new ServicioPlan().listar().length === 1, 'EMPRESA entra y recibe los planes en su copia local');
t((await err(() => new ServicioUsuariosEmpresa().crear(empresa.id, { nombre: 'X', correo: 'x@x.co', rol: 'reclutador' }))) === 'SIN_SUSCRIPCION', 'EMPRESA sin suscripción no puede crear usuarios');
new ServicioSuscripcion().pagar(empresa.id, plan.id); await Sync.sincronizar(); const rs = new ServicioSuscripcion().resumen(empresa.id);
t(rs.plan && rs.sus.fechaVencimiento > Date.now() + 29 * 864e5, 'EMPRESA paga: la suscripción vuelve del servidor con fechas calculadas por él');
const u1 = await new ServicioUsuariosEmpresa().crear(empresa.id, { nombre: 'Rita', correo: 'rita@acme.co', rol: 'reclutador' }), u2 = await new ServicioUsuariosEmpresa().crear(empresa.id, { nombre: 'Raúl', correo: 'raul@acme.co', rol: 'reclutador' }); await Sync.sincronizar();
t(S.hojas.usuarios.d.length === 5, 'EMPRESA crea 2 reclutadores (llegan a Sheets)');
t(await au().cambiarClave(clave, 'NuevaClave1', 'NuevaClave1').then(() => true) && Sync.estado().ultima, 'EMPRESA cambia su contraseña por defecto en el servidor');
// ===== Reclutador 1: vacante, y un candidato entra desde el formulario público
usar(R1); await au().iniciarSesion('rita@acme.co', u1.clave); const idE = SesionActiva.obtener().usuario.idEmpresa;
const sv = new ServicioVacantes(); const v = sv.guardar(idE, { titulo: 'Analista', perfilProfesional: 'Datos', nivelEducativoMinimo: 'Profesional', aniosExperienciaMinima: 2 }); sv.cambiarEstado(idE, v.id, 'publicada'); await Sync.sincronizar();
t(S.hojas.vacantes.d.length === 2, 'RECLUTADOR publica una vacante (llega a Sheets)');
usar(PUB); const pubs = await Api.llamar('vacantesPublicas', {}, { publico: true }); t(pubs.length === 1 && pubs[0].empresaNombre === 'Acme', 'PÚBLICO ve la vacante sin tener cuenta');
const cvBytes = Buffer.alloc(3000, 66), post = (o) => PostulacionRemota.postular({ idVacante: v.id, nombre: 'Laura Mejía', correo: 'laura@x.co', telefono: '', nivelEducativo: 'Maestría', aniosExperiencia: 5, consentimiento: true, archivo: new File([cvBytes], 'laura.pdf'), ...o });
t((await err(() => post({ archivo: new File([cvBytes], 'laura.exe') }))) === 'FORMATO' && (await err(() => post({ consentimiento: false }))) === 'DATOS', 'PÚBLICO: el formato y el consentimiento se validan antes de enviar');
t((await post({})).id && Object.keys(S.archivos).length === 1, 'PÚBLICO se postula: el servidor guarda candidato y archivo en Drive');
t((await err(() => post({}))) === 'DUPLICADO', 'PÚBLICO: postularse dos veces es rechazado por el servidor');
// ===== Reclutador 1: recibe, filtra, descarga, trabaja sin conexión
usar(R1); await Sync.sincronizar(); const sc = new ServicioCandidatos(), cand = sc.listar(idE)[0]; t(sc.listar(idE).length === 1 && cand.nombre === 'Laura Mejía', 'RECLUTADOR recibe al candidato al sincronizar');
new ServicioFiltro().ejecutar(idE, v.id); await Sync.sincronizar(); t(S.hojas.candidatos.d[1][11] === 'cumple_filtro' && S.hojas.resultados_filtro.d.length === 2, 'RECLUTADOR ejecuta el filtro: el estado y el resultado llegan a Sheets');
const d = await sc.descargar(idE, cand.id); t(d.blob.size === 3000 && d.nombre === 'laura.pdf', 'RECLUTADOR descarga el CV original desde Drive');
red = false; navigator.onLine = false; new ServicioPuntaje().calcularVacante(idE, v.id); const rn = await Sync.sincronizar();
t(rn.sinRed && Sync.pendientes() > 0 && S.hojas.puntajes.d.length === 1, 'SIN CONEXIÓN: el puntaje se guarda en el dispositivo y queda pendiente (' + Sync.pendientes() + ')');
t(new ServicioPuntaje().ranking(idE, v.id).length === 1, 'SIN CONEXIÓN: la aplicación sigue funcionando con la copia local');
red = true; navigator.onLine = true; await Sync.sincronizar(); t(Sync.pendientes() === 0 && S.hojas.puntajes.d.length === 2, 'AL VOLVER INTERNET: los cambios pendientes se envían solos y la cola queda vacía');
// ===== Conflicto: otro dispositivo cambia el mismo registro primero
const tok = SesionActiva.obtener().token, srv = S.llamar({ accion: 'cambios', token: tok, desde: 0 }).datos.tablas.candidatos.filas[0];
S.llamar({ accion: 'empujar', token: tok, ops: [{ idOp: 'otro', tabla: 'candidatos', accion: 'actualizar', id: cand.id, baseVersion: srv.version, datos: { telefono: '3001234567' } }] });
new RepositorioCandidato().actualizar(cand.id, { estadoProceso: 'en_etapa' }); await Sync.sincronizar(); const loc = new RepositorioCandidato().obtener(cand.id);
t(Sync.estado().rechazadas.length === 1 && Sync.estado().rechazadas[0].codigo === 'CONFLICTO' && loc.telefono === '3001234567' && loc.estadoProceso === 'cumple_filtro', 'CONFLICTO: el cambio viejo se rechaza y se restaura la versión del servidor (registrado en «rechazados»)');
// ===== Límite de dispositivos con el servidor
usar(R2); const bl = await err(() => au().iniciarSesion('raul@acme.co', u2.clave)); t(bl === 'LIMITE_DISPOSITIVOS', 'LÍMITE: el 2.º reclutador es bloqueado por el servidor (plan de 1 dispositivo)');
t(!SesionActiva.obtener(), 'LÍMITE: el dispositivo bloqueado no queda con sesión');
usar(ADMIN); await Sync.sincronizar(); t(new ServicioNotificaciones().noLeidas().length === 1, 'LÍMITE: el administrador recibe la notificación al sincronizar');
const aud = S.hojas.auditoria.d.slice(1).map(f => [f[6], f[8]]); t(aud.filter(a => a[0] === 'Rita' && a[1] === 'inicio_sesion').length === 1 && aud.some(a => a[1] === 'ingreso_bloqueado'), 'AUDITORÍA: un solo registro de ingreso por login (el servidor audita; el cliente no duplica)');
t(S.hojas.auditoria.d.slice(1).some(f => f[8] === 'vacante_guardada' && f[6] === 'Rita'), 'AUDITORÍA: las acciones del cliente llegan con el actor tomado de la sesión');
// ===== Eliminar candidato y cerrar sesión
usar(R1); await sc.eliminar(idE, cand.id); await Sync.sincronizar();
t(S.hojas.candidatos.d.length === 1 && S.hojas.hojas_de_vida.d.length === 1 && Object.values(S.archivos)[0].papelera, 'ELIMINAR: el candidato, su hoja de vida y su archivo de Drive desaparecen');
await au().cerrarSesion(); t(!SesionActiva.obtener() && R1.ls.getItem('sia:candidatos') === null && S.hojas.sesiones.d.length <= 3, 'CERRAR SESIÓN: se cierra en el servidor y se borra la copia local del dispositivo');
usar(R2); t((await au().iniciarSesion('raul@acme.co', u2.clave)).nombre === 'Raúl', 'CUPO LIBERADO: ahora el 2.º reclutador sí entra');
usar(R1); await au().cerrarSesion().catch(() => {});
console.log(`\n${ok} OK, ${mal} FALLA`);
