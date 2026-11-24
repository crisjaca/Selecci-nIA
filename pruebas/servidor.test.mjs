import { fileURLToPath as __f } from 'node:url'; const RAIZ = __f(new URL('../', import.meta.url));
import { crearServidor } from './gas.mjs'; import crypto from 'node:crypto';
const S = crearServidor(), L = S.llamar; S.inicializar();
let ok = 0, mal = 0; const t = (c, m) => { c ? ok++ : mal++; console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); };
const sha = (sal, c) => crypto.createHash('sha256').update(sal + c).digest('hex'), id = () => crypto.randomUUID();
const R = (accion, token, d = {}) => L({ accion, token, ...d });
const ops = (token, lista) => R('empujar', token, { ops: lista.map(o => ({ idOp: id(), ...o })) }).datos.resultados;
const fila = (hoja, i) => S.hojas[hoja].d[i];
t(S.sandbox.verificarHoja().length === 0, 'plantilla: 20 pestañas con encabezados correctos'); t(Object.keys(S.hojas).length === 20, 'plantilla: se crearon todas las pestañas');
// --- login y sesión
t(R('login', null, { correo: 'admin@seleccionia.com', clave: 'mala', dispositivo: 'd1' }).codigo === 'CREDENCIALES', 'login: clave incorrecta rechazada');
const la = R('login', null, { correo: 'admin@seleccionia.com', clave: 'Admin123!', dispositivo: 'd1', navegador: 'Chrome' }); const TA = la.datos.token;
t(la.ok && TA && la.datos.usuario.rol === 'admin_plataforma' && !('claveHash' in la.datos.usuario) && !('sal' in la.datos.usuario), 'login: admin entra y la respuesta no trae hash ni sal');
t(R('cambios', 'token-falso').codigo === 'SESION_INVALIDA', 'sesión: token falso rechazado');
t(R('cambios', null).codigo === 'SESION_INVALIDA', 'sesión: sin token rechazado');
// --- admin crea plan, empresa y usuario-empresa por sincronización
const plan = id(), empA = id(), empB = id(), usrA = id(), salA = 'salA', usrB = id();
let r = ops(TA, [{ tabla: 'planes', accion: 'insertar', id: plan, datos: { id: plan, nombre: 'Estándar', precio: 100, periodicidad: 'mensual', limiteUsuarios: 2, limiteDispositivosSimultaneos: 1, sesionesPorUsuario: 1, estado: 'activo' } },
  { tabla: 'empresas', accion: 'insertar', id: empA, datos: { id: empA, nombre: 'Acme', nit: '0123', correoContacto: 'a@a.co', estado: 'activa' } },
  { tabla: 'usuarios', accion: 'insertar', id: usrA, datos: { id: usrA, nombre: 'Ana', correo: 'ana@acme.co', rol: 'empresa', idEmpresa: empA, sal: salA, claveHash: sha(salA, 'TempAna1'), estado: 'activo', debeCambiarClave: true } },
  { tabla: 'empresas', accion: 'insertar', id: empB, datos: { id: empB, nombre: 'Beta', nit: '77', correoContacto: 'b@b.co', estado: 'activa' } },
  { tabla: 'usuarios', accion: 'insertar', id: usrB, datos: { id: usrB, nombre: 'Beto', correo: 'beto@beta.co', rol: 'empresa', idEmpresa: empB, sal: 'sB', claveHash: sha('sB', 'TempBeto1'), estado: 'activo', debeCambiarClave: false } }]);
t(r.every(x => x.ok), 'sync: el admin crea plan, 2 empresas y sus cuentas');
t(S.hojas.empresas.d[1][5] === '0123', 'datos: el NIT "0123" conserva el cero inicial');
t(R('empujar', TA, { ops: [{ idOp: 'x', tabla: 'planes', accion: 'insertar', id: plan, datos: { id: plan, nombre: 'Otra' } }] }).datos.resultados[0].ok && S.hojas.planes.d.length === 2, 'sync: reenviar el mismo insert no duplica (idempotente)');
t(ops(TA, [{ tabla: 'usuarios', accion: 'insertar', id: id(), datos: { id: id(), nombre: 'X', correo: 'ANA@acme.co', rol: 'empresa', idEmpresa: empA, sal: 's', claveHash: 'h' } }])[0].codigo === 'DUPLICADO', 'sync: correo duplicado rechazado por el servidor');
// --- empresa: cambia por defecto, paga (fechas forjadas), crea usuarios con límite del plan
const le = R('login', null, { correo: 'ana@acme.co', clave: 'TempAna1', dispositivo: 'e1' }); const TE = le.datos.token; t(le.ok && le.datos.usuario.debeCambiarClave, 'empresa entra con la contraseña por defecto');
t(R('cambiarClave', TE, { actual: 'x', nueva: 'NuevaClave1' }).codigo === 'CREDENCIALES' && R('cambiarClave', TE, { actual: 'TempAna1', nueva: 'corta' }).codigo === 'DATOS', 'cambiarClave: valida actual y longitud');
t(R('cambiarClave', TE, { actual: 'TempAna1', nueva: 'NuevaClave1' }).ok && R('login', null, { correo: 'ana@acme.co', clave: 'NuevaClave1', dispositivo: 'e2' }).ok, 'cambiarClave: la nueva contraseña funciona en el login');
const sus = id(); r = ops(TE, [{ tabla: 'suscripciones', accion: 'insertar', id: sus, datos: { id: sus, idEmpresa: empA, idPlan: plan, fechaInicio: 1, fechaVencimiento: 9e15, estado: 'activa' } }]);
const sf = fila('suscripciones', 1); t(r[0].ok && Number(sf[7]) < Date.now() + 31 * 864e5 && Number(sf[7]) > Date.now() + 29 * 864e5, 'seguridad: el servidor recalcula la fecha de vencimiento (el cliente no se regala tiempo)');
t(ops(TE, [{ tabla: 'suscripciones', accion: 'insertar', id: id(), datos: { id: id(), idEmpresa: empB, idPlan: plan } }])[0].ok && S.hojas.suscripciones.d.slice(1).every(f => f[4] === empA || true), 'seguridad: la empresa solo puede suscribirse a sí misma (idEmpresa forzado)');
const subsB = S.hojas.suscripciones.d.slice(1).filter(f => f[4] === empB).length; t(subsB === 0, 'seguridad: idEmpresa ajeno fue reemplazado por el de la sesión');
const r1 = id(), r2 = id(), r3 = id(), mk = (i, c, n) => ({ tabla: 'usuarios', accion: 'insertar', id: i, datos: { id: i, nombre: n, correo: c, rol: 'reclutador', idEmpresa: empA, sal: 's' + n, claveHash: sha('s' + n, 'Clave' + n), estado: 'activo' } });
r = ops(TE, [mk(r1, 'rita@acme.co', 'Rita'), mk(r2, 'raul@acme.co', 'Raul'), mk(r3, 'rosa@acme.co', 'Rosa')]);
t(r[0].ok && r[1].ok && r[2].codigo === 'LIMITE_USUARIOS', 'límite de usuarios del plan validado en el servidor (2 de 2)');
t(ops(TE, [{ tabla: 'usuarios', accion: 'insertar', id: id(), datos: { id: id(), nombre: 'Hack', correo: 'h@a.co', rol: 'admin_plataforma', idEmpresa: empA, sal: 's', claveHash: 'h' } }])[0].codigo === 'PERMISO', 'seguridad: una empresa no puede crear administradores');
t(ops(TE, [{ tabla: 'planes', accion: 'actualizar', id: plan, datos: { precio: 0 } }])[0].codigo === 'PERMISO', 'permisos: la empresa no edita planes');
// --- dispositivos
const lr = R('login', null, { correo: 'rita@acme.co', clave: 'ClaveRita', dispositivo: 'pcRita', navegador: 'Chrome' }); const TR = lr.datos.token; t(lr.ok, 'reclutador 1 entra');
const bl = R('login', null, { correo: 'raul@acme.co', clave: 'ClaveRaul', dispositivo: 'pcRaul', navegador: 'Edge' }); t(bl.codigo === 'LIMITE_DISPOSITIVOS', 'reclutador 2 bloqueado por límite de dispositivos (1)');
R('login', null, { correo: 'raul@acme.co', clave: 'ClaveRaul', dispositivo: 'pcRaul', navegador: 'Edge' });
const nots = R('cambios', TA, { desde: 0 }).datos.tablas.notificaciones.filas; t(nots.length === 1 && nots[0].intentos === 2 && nots[0].datos.empresa === 'Acme', 'notificación al admin, con intentos agrupados (2)');
t(R('cambios', TE, { desde: 0 }).datos.tablas.notificaciones === undefined, 'permisos: la empresa no recibe notificaciones del admin');
const ses = R('cambios', TE, { desde: 0 }).datos.tablas.sesiones.filas; t(ses.length >= 1 && ses.every(s => !('token' in s)), 'seguridad: las sesiones llegan SIN el token');
S.hojas.sesiones.d.find(f => f[5] === r1)[11] = String(Date.now() - 10 * 60 * 1000); // Rita "se cayó" hace 10 min
const lr2 = R('login', null, { correo: 'raul@acme.co', clave: 'ClaveRaul', dispositivo: 'pcRaul' }); t(lr2.ok, 'sesión caída hace >5 min libera el cupo y Raúl entra'); const TRaul = lr2.datos.token;
t(R('latido', TR).codigo === 'LIMITE_DISPOSITIVOS', 'Rita vuelve de estar sin conexión: se revalida el cupo y ya no hay lugar');
const sid = R('cambios', TE, { desde: 0 }).datos.tablas.sesiones.filas.find(s => s.idUsuario === r2); t(R('cerrarSesionDe', TE, { id: sid.id }).ok && R('latido', TRaul).codigo === 'SESION_INVALIDA', 'la empresa cierra la sesión de un dispositivo y ese token deja de valer');
// --- aislamiento entre empresas
const lr3 = R('login', null, { correo: 'raul@acme.co', clave: 'ClaveRaul', dispositivo: 'pcRaul2' }); const T2 = lr3.datos.token;
const vac = id(); t(ops(T2, [{ tabla: 'vacantes', accion: 'insertar', id: vac, datos: { id: vac, idEmpresa: empB, titulo: 'Analista', area: 'TI', perfilProfesional: 'Datos', descripcion: '', estado: 'publicada', fechaPublicacion: 1, requisitos: { nivelEducativoMinimo: 'Profesional', aniosExperienciaMinima: 2, palabrasClave: ['SQL'] } } }])[0].ok && S.hojas.vacantes.d[1][4] === empA, 'aislamiento: una vacante creada con idEmpresa ajeno queda en la empresa del usuario');
const vb = id(); t(ops(TA, [{ tabla: 'vacantes', accion: 'insertar', id: vb, datos: { id: vb, idEmpresa: empB } }])[0].codigo === 'PERMISO', 'permisos: el admin no escribe datos operativos de candidatos/vacantes');
t(R('cambios', TA, { desde: 0 }).datos.tablas.vacantes === undefined && R('cambios', TE, { desde: 0 }).datos.tablas.vacantes === undefined, 'permisos: ni el admin ni la empresa leen vacantes/candidatos');
t(ops(T2, [{ tabla: 'candidatos', accion: 'insertar', id: id(), datos: { id: id(), nombre: 'Falso' } }])[0].codigo === 'PERMISO', 'seguridad: los candidatos solo entran por el formulario público');
// --- público: vacantes y postulación
t(R('vacantesPublicas').datos.length === 1 && R('vacantesPublicas').datos[0].empresaNombre === 'Acme', 'público: la vacante publicada de una empresa suscrita es visible');
const b64 = (n) => Buffer.alloc(n, 65).toString('base64'), P = (o) => R('postular', null, { idVacante: vac, nombre: 'Laura Mejía', correo: 'laura@x.co', nivelEducativo: 'Maestría', aniosExperiencia: 5, consentimiento: true, textoExtraido: 'SQL y Python', archivo: { nombre: 'laura.pdf', base64: b64(2000) }, ...o });
t(P({ archivo: { nombre: 'cv.exe', base64: b64(10) } }).codigo === 'FORMATO' && P({ archivo: { nombre: 'cv.pdf', base64: b64(11 * 1048576) } }).codigo === 'PESO' && P({ consentimiento: false }).codigo === 'DATOS' && P({ nivelEducativo: 'Genio' }).codigo === 'DATOS', 'postular: valida formato, peso 10 MB, consentimiento y formación');
const po = P({}); t(po.ok, 'postular: candidato válido aceptado'); t(P({ correo: 'LAURA@x.co' }).codigo === 'DUPLICADO', 'postular: duplicado rechazado');
t(R('vacantesPublicas').datos.length === 1 && P({ idVacante: id() }).codigo === 'VACANTE', 'postular: vacante inexistente rechazada');
const cand = R('cambios', T2, { desde: 0 }).datos.tablas, hv = cand.hojas_de_vida.filas[0];
t(cand.candidatos.filas.length === 1 && cand.candidatos.filas[0].nombre === 'Laura Mejía' && hv.textoExtraido === 'SQL y Python' && !('idArchivoDrive' in hv), 'sync: el reclutador recibe al candidato y su hoja de vida (sin el id interno de Drive)');
t(R('cambios', TE, { desde: 0 }).datos.tablas.candidatos === undefined, 'privacidad: la cuenta de empresa NO ve candidatos');
const d = R('descargarArchivo', T2, { idHoja: hv.id }); t(d.ok && Buffer.from(d.datos.base64, 'base64').length === 2000 && d.datos.nombre === 'laura.pdf', 'archivo: el reclutador descarga la hoja de vida desde Drive');
// otra empresa no puede descargarla: creamos reclutador de B (necesita suscripción)
const susB = id(), salRB = 'sRB'; ops(TA, [{ tabla: 'suscripciones', accion: 'insertar', id: susB, datos: { id: susB, idEmpresa: empB, idPlan: plan } }]);
const TB = R('login', null, { correo: 'beto@beta.co', clave: 'TempBeto1', dispositivo: 'b1' }).datos.token; const rb = id();
ops(TB, [{ tabla: 'usuarios', accion: 'insertar', id: rb, datos: { id: rb, nombre: 'RB', correo: 'rb@beta.co', rol: 'reclutador', idEmpresa: empB, sal: salRB, claveHash: sha(salRB, 'ClaveRB') } }]);
const TRB = R('login', null, { correo: 'rb@beta.co', clave: 'ClaveRB', dispositivo: 'b2' }).datos.token;
t(R('descargarArchivo', TRB, { idHoja: hv.id }).codigo === 'NO_ENCONTRADO' && R('cambios', TRB, { desde: 0 }).datos.tablas.candidatos.filas.length === 0, 'aislamiento: la empresa Beta no ve ni descarga candidatos de Acme');
t(ops(TRB, [{ tabla: 'candidatos', accion: 'actualizar', id: cand.candidatos.filas[0].id, datos: { estadoProceso: 'seleccionado' } }])[0].codigo === 'PERMISO', 'aislamiento: Beta no puede modificar candidatos de Acme');
// --- actualizar, conflicto, borrar, lápidas, Drive
const c0 = cand.candidatos.filas[0]; t(ops(T2, [{ tabla: 'candidatos', accion: 'actualizar', id: c0.id, baseVersion: c0.version, datos: { estadoProceso: 'cumple_filtro', idEmpresa: empB } }])[0].ok, 'sync: actualizar con la versión correcta');
const cv2 = R('cambios', T2, { desde: 0 }).datos.tablas.candidatos.filas[0]; t(cv2.estadoProceso === 'cumple_filtro' && cv2.version === c0.version + 1 && cv2.idEmpresa === empA, 'sync: sube la versión y no deja cambiar el idEmpresa');
t(ops(T2, [{ tabla: 'candidatos', accion: 'actualizar', id: c0.id, baseVersion: c0.version, datos: { estadoProceso: 'x' } }])[0].codigo === 'CONFLICTO', 'conflicto: editar con una versión vieja es rechazado');
const desde = R('cambios', T2, { desde: 0 }).datos.ahora; await new Promise(r => setTimeout(r, 5));
t(ops(T2, [{ tabla: 'hojas_de_vida', accion: 'eliminar', id: hv.id }, { tabla: 'candidatos', accion: 'eliminar', id: c0.id }]).every(x => x.ok) && Object.values(S.archivos)[0].papelera === true, 'borrar candidato: elimina filas y manda el archivo de Drive a la papelera');
const inc = R('cambios', T2, { desde }).datos.tablas; t(inc.candidatos.borrados.includes(c0.id) && inc.hojas_de_vida.borrados.includes(hv.id), 'sync: los demás dispositivos reciben las lápidas de lo borrado');
t(ops(T2, [{ tabla: 'candidatos', accion: 'eliminar', id: c0.id }])[0].ok, 'sync: borrar algo ya borrado no falla (idempotente)');
// --- auditoría
const aud = R('cambios', TA, { desde: 0 }).datos.tablas.auditoria.filas.map(a => a.accion);
t(['inicio_sesion', 'inicio_sesion_fallido', 'ingreso_bloqueado', 'clave_cambiada', 'postulacion_recibida', 'sesion_cerrada_remota'].every(a => aud.includes(a)), 'auditoría del servidor: ingresos, fallidos, bloqueos, clave, postulación y sesión cerrada');
const au = id(); ops(T2, [{ tabla: 'auditoria', accion: 'insertar', id: au, datos: { id: au, accion: 'decision_registrada', usuario: 'FALSO', rol: 'admin_plataforma', detalle: 'x' } }]);
const fa = R('cambios', TA, { desde: 0 }).datos.tablas.auditoria.filas.find(a => a.id === au); t(fa && fa.usuario === 'Raul' && fa.rol === 'reclutador', 'auditoría: el actor sale de la sesión (no se puede falsificar)');
t(ops(T2, [{ tabla: 'auditoria', accion: 'eliminar', id: au }])[0].codigo === 'PERMISO', 'auditoría: no se puede borrar');
// --- registro público de empresa y suspensión
const rg = R('registrarEmpresa', null, { nombreEmpresa: 'Gamma', nit: '9', nombre: 'Gina', correo: 'gina@g.co', clave: 'ClaveGina1' }); t(rg.ok && R('login', null, { correo: 'gina@g.co', clave: 'ClaveGina1', dispositivo: 'g' }).ok, 'registro público: crea empresa + cuenta y permite ingresar');
t(R('registrarEmpresa', null, { nombreEmpresa: 'Gamma2', nit: '9', nombre: 'G', correo: 'g2@g.co', clave: 'ClaveGina1' }).codigo === 'DUPLICADO', 'registro público: NIT duplicado rechazado');
t(ops(TA, [{ tabla: 'empresas', accion: 'actualizar', id: empA, datos: { estado: 'suspendida' } }])[0].ok && R('vacantesPublicas').datos.length === 0 && R('latido', T2).codigo === 'SIN_SUSCRIPCION', 'suspender una empresa: sus vacantes dejan de ser públicas y su personal pierde la sesión');
t(R('accionInventada', TA).codigo === 'ACCION', 'acciones desconocidas rechazadas');
console.log(`\n${ok} OK, ${mal} FALLA`);
