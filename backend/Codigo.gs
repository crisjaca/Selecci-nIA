/**
 * ============================================================================
 *  SelecciónIA · Backend en Google Apps Script          VERSION 1.0.0 (fase 4)
 * ============================================================================
 *  QUÉ HACE
 *   - Es la "base de datos + API" de la plataforma: guarda cada tabla en una pestaña de
 *     Google Sheets y responde a las peticiones que hace la aplicación web (GitHub Pages).
 *   - Valida la sesión (token), los permisos por rol, el aislamiento entre empresas,
 *     los límites del plan (usuarios y dispositivos) y escribe la auditoría.
 *
 *  CÓMO ESTÁ ORGANIZADO (busca estas marcas con Ctrl+F)
 *   [1] CONFIGURACIÓN      constantes que puedes cambiar
 *   [2] ESQUEMA            columnas de cada pestaña  → si agregas un campo, agrégalo aquí
 *   [3] PERMISOS           qué rol lee/escribe cada tabla → si agregas una tabla, agrégala aquí
 *   [4] ACCESO A DATOS     lectura/escritura en la hoja (con caché por petición)
 *   [5] SESIONES           login, límites de dispositivos, token
 *   [6] SINCRONIZACIÓN     "cambios" (traer) y "empujar" (enviar) del modo sin conexión
 *   [7] ACCIONES PÚBLICAS  registro de empresa, vacantes, postulación y contenido
 *   [8] PUERTA DE ENTRADA  doPost/doGet
 *   [9] MANTENIMIENTO      inicializar(), verificarHoja()  → se ejecutan a mano desde el editor
 *
 *  CÓMO VER QUÉ PASA: menú "Ejecuciones" del editor de Apps Script (cada línea LOG aparece ahí).
 *  CÓMO ACTUALIZAR: edita, guarda, y en Implementar → Administrar implementaciones → ✏️ → Versión nueva.
 *  NOTA: no uses ?. ni ?? aquí; se escribió con sintaxis básica para evitar sorpresas.
 * ============================================================================ */

/* ============================ [1] CONFIGURACIÓN ============================ */
const VERSION = '1.0.0';
const NIVEL_LOG = 'INFO';                       // DEBUG | INFO | WARN | ERROR
const ADMIN_INICIAL = { nombre: 'Administrador SelecciónIA', correo: 'admin@seleccionia.com', clave: 'Admin123!' }; // cámbiala tras el primer ingreso
const SESION_EXPIRA_MS = 5 * 60 * 1000;         // sin señal de vida por 5 min: libera el cupo de dispositivo
const SESION_INACTIVA_MAX_MS = 12 * 3600 * 1000;// pasado este tiempo la sesión se elimina del todo
const VENTANA_NOTIF_MS = 30 * 60 * 1000;        // agrupa intentos bloqueados de una empresa en 30 min
const MAX_BYTES_CV = 10 * 1024 * 1024;          // límite de la hoja de vida (RF_03)
const ROLES_CUPO = ['reclutador', 'director'];  // cuentan contra el límite de dispositivos
const OPERATIVOS = ['reclutador', 'director'];
const TODOS = ['admin_plataforma', 'empresa', 'reclutador', 'director'];
const NIVELES = ['Bachiller', 'Técnico', 'Tecnólogo', 'Profesional', 'Especialización', 'Maestría', 'Doctorado'];

/* ============================== [2] ESQUEMA ================================ */
// Todas las tablas empiezan con: id, version:n, creado:n, actualizado:n. Tipos: (nada)=texto, n=número, b=booleano, j=JSON.
const BASE = ['id', 'version:n', 'creado:n', 'actualizado:n'];
const ESQUEMA = {
  usuarios: 'nombre,correo,rol,idEmpresa,estado,claveHash,sal,debeCambiarClave:b',
  empresas: 'nombre,nit,correoContacto,estado',
  planes: 'nombre,precio:n,periodicidad,limiteUsuarios:n,limiteDispositivosSimultaneos:n,sesionesPorUsuario:n,estado',
  suscripciones: 'idEmpresa,idPlan,fechaInicio:n,fechaVencimiento:n,estado,idTransaccion',
  sesiones: 'token,idUsuario,idEmpresa,rol,dispositivo,navegador,inicio:n,ultimaActividad:n',
  notificaciones: 'tipo,titulo,idEmpresa,intentos:n,leida:b,ultimaFecha:n,datos:j',
  contenido: 'quienesSomos,mision,vision,contacto:j,novedades:j,promociones:j,alianzas:j',
  avisos: 'titulo,texto,estado,fecha:n',
  sugerencias: 'idEmpresa,idUsuario,usuario,rol,tipo,asunto,mensaje,estado,respuesta,fechaRespuesta:n',
  vacantes: 'idEmpresa,titulo,area,perfilProfesional,descripcion,estado,fechaPublicacion:n,requisitos:j',
  candidatos: 'idEmpresa,idVacante,nombre,correo,telefono,nivelEducativo,aniosExperiencia:n,estadoProceso,idEtapaActual,consentimiento:b',
  hojas_de_vida: 'idCandidato,idEmpresa,fechaPostulacion:n,nombreArchivo,formato,pesoMB:n,textoExtraido,extraccion,idArchivoDrive',
  resultados_filtro: 'idEmpresa,idCandidato,idVacante,cumple:b,nivelCumplimiento:n,criterios:j,fecha:n',
  puntajes: 'idEmpresa,idCandidato,idVacante,valorPuntaje:n,desglose:j,fechaCalculo:n',
  etapas: 'idEmpresa,idVacante,nombreEtapa,tipo,orden:n',
  evaluaciones_etapa: 'idEmpresa,idCandidato,idVacante,idEtapa,nombreEtapa,observaciones,resultado,fecha:n,idUsuario,usuarioResponsable',
  historial_auditoria: 'idEmpresa,idEvaluacion,idCandidato,nombreEtapa,fechaRegistro:n,usuarioResponsable,resultadoRegistrado',
  decisiones: 'idEmpresa,idCandidato,idVacante,decisionTomada,justificacion,nombreEtapa,puntajeSugerido:n,sugerencia,fecha:n,idUsuario,usuarioResponsable,rol',
  auditoria: 'idEmpresa,idUsuario,usuario,rol,accion,entidad,idEntidad,detalle,fecha:n',
  eliminados: 'tabla,idRegistro,idEmpresa,fecha:n'      // lápidas: avisan a los demás dispositivos qué se borró
};

/* ============================== [3] PERMISOS =============================== */
// col: columna que identifica a la empresa dueña de la fila (null = tabla global). r: roles que leen. w: roles que escriben.
// ins: roles que solo pueden insertar. Los datos de empresas ajenas NUNCA se envían (filtro por col).
const TABLAS = {
  usuarios: { col: 'idEmpresa', r: ['admin_plataforma', 'empresa'], w: ['admin_plataforma', 'empresa'] },
  empresas: { col: 'id', r: TODOS, w: ['admin_plataforma'] },
  planes: { col: null, r: TODOS, w: ['admin_plataforma'] },
  suscripciones: { col: 'idEmpresa', r: TODOS, w: ['admin_plataforma', 'empresa'] },
  sesiones: { col: 'idEmpresa', r: ['admin_plataforma', 'empresa'], w: [] },          // solo las escribe el servidor
  notificaciones: { col: 'idEmpresa', r: ['admin_plataforma'], w: ['admin_plataforma'], ins: ['empresa', 'reclutador', 'director'] },
  contenido: { col: null, r: TODOS, w: ['admin_plataforma'] },
  avisos: { col: null, r: TODOS, w: ['admin_plataforma'] },
  sugerencias: { col: 'idEmpresa', r: TODOS, w: TODOS },
  vacantes: { col: 'idEmpresa', r: OPERATIVOS, w: OPERATIVOS },
  candidatos: { col: 'idEmpresa', r: OPERATIVOS, w: OPERATIVOS },
  hojas_de_vida: { col: 'idEmpresa', r: OPERATIVOS, w: OPERATIVOS },
  resultados_filtro: { col: 'idEmpresa', r: OPERATIVOS, w: OPERATIVOS },
  puntajes: { col: 'idEmpresa', r: OPERATIVOS, w: OPERATIVOS },
  etapas: { col: 'idEmpresa', r: OPERATIVOS, w: OPERATIVOS },
  evaluaciones_etapa: { col: 'idEmpresa', r: OPERATIVOS, w: OPERATIVOS },
  historial_auditoria: { col: 'idEmpresa', r: OPERATIVOS, w: OPERATIVOS },
  decisiones: { col: 'idEmpresa', r: OPERATIVOS, w: OPERATIVOS },
  auditoria: { col: 'idEmpresa', r: ['admin_plataforma'], w: [], ins: TODOS }          // solo se agrega; no se edita ni se borra
};
const ACCIONES_PUBLICAS = ['ping', 'login', 'registrarEmpresa', 'vacantesPublicas', 'postular', 'contenidoPublico'];

/* ============================ utilidades varias ============================ */
const NIVELES_LOG = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
function LOG(nivel, modulo, mensaje, datos) {            // aparece en "Ejecuciones" del editor
  if (NIVELES_LOG[nivel] < NIVELES_LOG[NIVEL_LOG]) return;
  console.log('[SIA ' + nivel + '][' + modulo + '] ' + mensaje + (datos ? ' ' + JSON.stringify(datos) : ''));
}
function err(codigo, mensaje) { return { codigo: codigo, mensaje: mensaje }; }
function ahora() { return Date.now(); }
function nuevo(d) { const n = ahora(); return Object.assign({ id: Utilities.getUuid(), version: 1, creado: n, actualizado: n }, d); }
// SHA-256(sal + clave) en hexadecimal. Debe dar lo mismo que Seguridad.hash() del cliente.
function hash(sal, clave) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sal + clave, Utilities.Charset.UTF_8);
  return b.map(function (x) { return ('0' + ((x + 256) % 256).toString(16)).slice(-2); }).join('');
}
function publico(u) { const c = Object.assign({}, u); delete c.claveHash; delete c.sal; return c; }

/* ========================== [4] ACCESO A DATOS ============================= */
let _T = {};                                               // caché: se reinicia en cada petición
function columnas(t) { return BASE.concat(ESQUEMA[t].split(',')).map(function (c) { const p = c.split(':'); return { n: p[0], tipo: p[1] || 't' }; }); }
function leerValor(v, tipo) {
  if (tipo === 'n') return v === '' || v === null ? null : Number(v);
  if (tipo === 'b') return v === true || v === 'true' || v === 'TRUE';
  if (tipo === 'j') { if (v === '' || v === null) return null; try { return JSON.parse(v); } catch (e) { return null; } }
  return v === null || v === undefined ? '' : String(v);
}
function escribirValor(v, tipo) { if (v === undefined || v === null) return ''; return tipo === 'j' ? JSON.stringify(v) : String(v); }
// Devuelve la "tabla" t con sus filas en memoria y operaciones que escriben también en la hoja.
function T(t) {
  if (_T[t]) return _T[t];
  const defs = columnas(t), sh = SpreadsheetApp.getActive().getSheetByName(t);
  if (!sh) throw err('HOJA', 'Falta la pestaña "' + t + '". Ejecuta inicializar() en el editor.');
  const n = sh.getLastRow() - 1;
  const filas = (n > 0 ? sh.getRange(2, 1, n, defs.length).getValues() : []).map(function (v) { const o = {}; defs.forEach(function (d, i) { o[d.n] = leerValor(v[i], d.tipo); }); return o; });
  const fila = function (o) { return defs.map(function (d) { return escribirValor(o[d.n], d.tipo); }); };
  const api = {
    filas: filas,
    porId: function (id) { for (let i = 0; i < filas.length; i++) if (filas[i].id === id) return filas[i]; return null; },
    insertar: function (o) { filas.push(o); sh.appendRow(fila(o)); return o; },
    actualizar: function (o) { const i = filas.findIndex(function (x) { return x.id === o.id; }); filas[i] = o; sh.getRange(i + 2, 1, 1, defs.length).setValues([fila(o)]); return o; },
    borrar: function (id) { const i = filas.findIndex(function (x) { return x.id === id; }); if (i < 0) return; filas.splice(i, 1); sh.deleteRow(i + 2); }
  };
  _T[t] = api; return api;
}
function soloColumnas(t, d) { const o = {}; columnas(t).forEach(function (c) { if (d[c.n] !== undefined) o[c.n] = d[c.n]; }); return o; }
// Datos sensibles que NUNCA salen del servidor.
function limpiar(t, f) { const c = Object.assign({}, f); if (t === 'usuarios') { delete c.claveHash; delete c.sal; } if (t === 'sesiones') delete c.token; if (t === 'hojas_de_vida') delete c.idArchivoDrive; return c; }
function enAlcance(t, ctx, f) { const c = TABLAS[t]; if (ctx.rol === 'admin_plataforma' || !c.col) return true; return String(f[c.col]) === String(ctx.idEmpresa); }
function visibles(t, ctx) {
  return T(t).filas.filter(function (f) { if (!enAlcance(t, ctx, f)) return false; if (t === 'sugerencias' && ctx.rol !== 'admin_plataforma' && f.idUsuario !== ctx.usuario.id) return false; return true; });
}
function auditar(accion, ctx, x) {                          // la auditoría nunca debe romper la acción
  try {
    x = x || {}; const u = ctx && ctx.usuario;
    T('auditoria').insertar(nuevo({ idEmpresa: x.idEmpresa !== undefined ? x.idEmpresa : (u ? u.idEmpresa || '' : ''), idUsuario: u ? u.id : '', usuario: u ? u.nombre : 'Público / sistema', rol: u ? u.rol : '', accion: accion, entidad: x.entidad || '', idEntidad: x.idEntidad || '', detalle: x.detalle || '', fecha: ahora() }));
  } catch (e) { LOG('ERROR', 'auditoria', 'No se pudo auditar ' + accion, String(e)); }
}

/* ============================ [5] SESIONES ================================= */
// Empresa activa + suscripción vigente + plan. Es lo que habilita a reclutadores y directores.
function permisoEmpresa(idEmpresa) {
  const e = T('empresas').porId(idEmpresa); if (!e || e.estado !== 'activa') return { ok: false };
  const s = T('suscripciones').filas.filter(function (x) { return x.idEmpresa === idEmpresa && x.estado === 'activa' && x.fechaVencimiento > ahora(); })[0];
  const p = s ? T('planes').porId(s.idPlan) : null; return p ? { ok: true, empresa: e, sus: s, plan: p } : { ok: false };
}
function activa(s) { return ahora() - s.ultimaActividad <= SESION_EXPIRA_MS; }
function cupoUsuarios(idEmpresa) {                          // límite de usuarios del plan, validado en el servidor
  const p = permisoEmpresa(idEmpresa); if (!p.ok) throw err('SIN_SUSCRIPCION', 'Necesitas una suscripción activa para crear usuarios.');
  const n = T('usuarios').filas.filter(function (u) { return u.idEmpresa === idEmpresa && OPERATIVOS.indexOf(u.rol) >= 0 && u.estado === 'activo'; }).length;
  if (n >= p.plan.limiteUsuarios) throw err('LIMITE_USUARIOS', 'Tu plan permite ' + p.plan.limiteUsuarios + ' usuario(s).');
}
function notificarBloqueo(p, usuario, navegador, usados, limite) {
  const t = T('notificaciones'), n = ahora();
  const datos = { empresa: p.empresa.nombre, nit: p.empresa.nit, plan: p.plan.nombre, usados: usados, limite: limite, usuario: usuario.nombre, correo: usuario.correo, navegador: navegador };
  const previa = t.filas.filter(function (x) { return x.tipo === 'limite_dispositivos' && x.idEmpresa === p.empresa.id && n - x.ultimaFecha < VENTANA_NOTIF_MS; })[0];
  if (previa) t.actualizar(Object.assign({}, previa, { intentos: previa.intentos + 1, ultimaFecha: n, leida: false, datos: datos, version: previa.version + 1, actualizado: n }));
  else t.insertar(nuevo({ tipo: 'limite_dispositivos', titulo: 'Intento de ingreso bloqueado por límite de dispositivos', idEmpresa: p.empresa.id, intentos: 1, leida: false, ultimaFecha: n, datos: datos }));
}
function login(p) {
  const correo = String(p.correo || '').trim().toLowerCase();
  const u = T('usuarios').filas.filter(function (x) { return String(x.correo).toLowerCase() === correo; })[0];
  if (!u || u.estado !== 'activo' || hash(u.sal, String(p.clave || '')) !== u.claveHash) {
    auditar('inicio_sesion_fallido', null, { entidad: 'usuario', detalle: 'CREDENCIALES · ' + correo, idEmpresa: u ? u.idEmpresa : '' });
    throw err('CREDENCIALES', 'Correo o contraseña incorrectos.');
  }
  const ts = T('sesiones'), n = ahora(), ctx = { usuario: u, rol: u.rol, idEmpresa: u.idEmpresa };
  ts.filas.filter(function (s) { return n - s.ultimaActividad > SESION_INACTIVA_MAX_MS; }).forEach(function (s) { ts.borrar(s.id); });   // limpieza
  if (u.rol === 'empresa') { const e = T('empresas').porId(u.idEmpresa); if (e && e.estado === 'suspendida') throw err('EMPRESA_SUSPENDIDA', 'La cuenta de tu empresa está suspendida. Comunícate con SelecciónIA.'); }
  ts.filas.filter(function (s) { return s.idUsuario === u.id && s.dispositivo === p.dispositivo; }).forEach(function (s) { ts.borrar(s.id); });
  if (ROLES_CUPO.indexOf(u.rol) >= 0) {
    const pe = permisoEmpresa(u.idEmpresa);
    if (!pe.ok) { auditar('ingreso_bloqueado', ctx, { entidad: 'usuario', detalle: 'SIN_SUSCRIPCION · ' + correo }); throw err('SIN_SUSCRIPCION', 'La suscripción de tu empresa no está activa. Contacta a quien administra la cuenta de tu empresa.'); }
    const limite = pe.plan.limiteDispositivosSimultaneos || 1, porUsuario = pe.plan.sesionesPorUsuario || 1;
    if (ts.filas.filter(function (s) { return s.idUsuario === u.id && activa(s); }).length >= porUsuario) { auditar('ingreso_bloqueado', ctx, { entidad: 'usuario', detalle: 'LIMITE_USUARIO · ' + correo }); throw err('LIMITE_USUARIO', 'Tu cuenta ya está conectada en otro dispositivo. Cierra esa sesión para ingresar aquí.'); }
    const usados = ts.filas.filter(function (s) { return s.idEmpresa === u.idEmpresa && ROLES_CUPO.indexOf(s.rol) >= 0 && activa(s); }).length;
    if (usados >= limite) {
      notificarBloqueo(pe, u, p.navegador || '', usados, limite); auditar('ingreso_bloqueado', ctx, { entidad: 'usuario', detalle: 'LIMITE_DISPOSITIVOS · ' + correo });
      LOG('WARN', 'login', 'Límite de dispositivos', { empresa: pe.empresa.nombre, usados: usados, limite: limite });
      throw err('LIMITE_DISPOSITIVOS', 'Tu empresa alcanzó el límite de ' + limite + ' dispositivo' + (limite > 1 ? 's' : '') + ' conectado' + (limite > 1 ? 's' : '') + ' según su plan. Pídele a tu empresa que cierre una sesión o mejore la suscripción.');
    }
  }
  const token = Utilities.getUuid();
  ts.insertar(nuevo({ token: token, idUsuario: u.id, idEmpresa: u.idEmpresa || '', rol: u.rol, dispositivo: p.dispositivo || '', navegador: p.navegador || '', inicio: n, ultimaActividad: n }));
  auditar('inicio_sesion', ctx, { entidad: 'usuario', idEntidad: u.id, detalle: 'Ingreso correcto' });
  LOG('INFO', 'login', 'Sesión abierta', { rol: u.rol });
  return { token: token, usuario: publico(u) };
}
// Se ejecuta en cada petición autenticada. Reactiva sesiones que volvieron de estar sin conexión, revalidando el cupo.
function validarSesion(token) {
  const ts = T('sesiones'), s = token ? ts.filas.filter(function (x) { return x.token === token; })[0] : null;
  if (!s) throw err('SESION_INVALIDA', 'Tu sesión ya no es válida. Inicia sesión de nuevo.');
  const n = ahora(), u = T('usuarios').porId(s.idUsuario), idle = n - s.ultimaActividad;
  if (!u || u.estado !== 'activo' || idle > SESION_INACTIVA_MAX_MS) { ts.borrar(s.id); throw err('SESION_INVALIDA', 'Tu sesión terminó. Inicia sesión de nuevo.'); }
  if (ROLES_CUPO.indexOf(u.rol) >= 0) {
    const pe = permisoEmpresa(u.idEmpresa);
    if (!pe.ok) { ts.borrar(s.id); throw err('SIN_SUSCRIPCION', 'La suscripción de tu empresa ya no está activa.'); }
    if (idle > SESION_EXPIRA_MS) {                             // volvía de estar caída: ¿sigue habiendo cupo?
      const otras = ts.filas.filter(function (x) { return x.id !== s.id && x.idEmpresa === s.idEmpresa && ROLES_CUPO.indexOf(x.rol) >= 0 && activa(x); }).length;
      if (otras >= (pe.plan.limiteDispositivosSimultaneos || 1)) { ts.borrar(s.id); throw err('LIMITE_DISPOSITIVOS', 'Tu cupo de dispositivos fue ocupado mientras estabas desconectado. Inicia sesión de nuevo.'); }
    }
  }
  if (idle > 30000) ts.actualizar(Object.assign({}, s, { ultimaActividad: n, actualizado: n, version: s.version + 1 }));
  return { sesion: s, usuario: u, rol: u.rol, idEmpresa: u.idEmpresa || '' };
}
function logout(p, ctx) { T('sesiones').borrar(ctx.sesion.id); auditar('cierre_sesion', ctx, { entidad: 'usuario', idEntidad: ctx.usuario.id }); return true; }
function latido() { return { ahora: ahora() }; }
function cerrarSesionDe(p, ctx) {                          // admin o empresa cierran un dispositivo
  const s = T('sesiones').porId(p.id); if (!s) return true;
  if (!(ctx.rol === 'admin_plataforma' || (ctx.rol === 'empresa' && s.idEmpresa === ctx.idEmpresa))) throw err('PERMISO', 'No puedes cerrar esa sesión.');
  T('sesiones').borrar(s.id); auditar('sesion_cerrada_remota', ctx, { entidad: 'usuario', idEntidad: s.idUsuario, idEmpresa: s.idEmpresa }); return true;
}
function cambiarClave(p, ctx) {
  const u = ctx.usuario;
  if (hash(u.sal, String(p.actual || '')) !== u.claveHash) throw err('CREDENCIALES', 'La contraseña actual no es correcta.');
  if (String(p.nueva || '').length < 8) throw err('DATOS', 'La nueva contraseña debe tener al menos 8 caracteres.');
  if (p.nueva === p.actual) throw err('DATOS', 'La nueva contraseña debe ser distinta de la actual.');
  const sal = Utilities.getUuid().replace(/-/g, ''), n = ahora();
  T('usuarios').actualizar(Object.assign({}, u, { sal: sal, claveHash: hash(sal, p.nueva), debeCambiarClave: false, version: u.version + 1, actualizado: n }));
  auditar('clave_cambiada', ctx, { entidad: 'usuario', idEntidad: u.id }); return { usuario: publico(T('usuarios').porId(u.id)) };
}

/* ========================== [6] SINCRONIZACIÓN ============================= */
// El cliente pide lo que cambió desde su última sincronización (desde=0: todo lo que puede ver).
function cambios(p, ctx) {
  const desde = Number(p.desde) || 0, ts = ahora(), out = {};
  Object.keys(TABLAS).forEach(function (t) {
    if (p.tablas && p.tablas.indexOf(t) < 0) return;
    if (TABLAS[t].r.indexOf(ctx.rol) < 0) return;
    const filas = visibles(t, ctx).filter(function (f) { return !desde || f.actualizado > desde; }).map(function (f) { return limpiar(t, f); });
    const borrados = !desde ? [] : T('eliminados').filas.filter(function (x) { return x.tabla === t && x.fecha > desde && (ctx.rol === 'admin_plataforma' || x.idEmpresa === ctx.idEmpresa || x.idEmpresa === ''); }).map(function (x) { return x.idRegistro; });
    out[t] = { filas: filas, borrados: borrados };
  });
  return { ahora: ts, tablas: out };
}
function autorizar(t, ctx, accion, d) {
  const c = TABLAS[t]; if (!c) throw err('TABLA', 'Tabla no permitida: ' + t);
  if (c.w.indexOf(ctx.rol) >= 0) return;
  if (accion === 'insertar' && c.ins && c.ins.indexOf(ctx.rol) >= 0) { if (t === 'notificaciones' && d.tipo !== 'sugerencia') throw err('PERMISO', 'No puedes crear esa notificación.'); return; }
  throw err('PERMISO', 'No tienes permiso para modificar ' + t + '.');
}
// Reglas de negocio que se validan SIEMPRE en el servidor (el cliente puede ser manipulado).
const REGLAS_INSERTAR = {
  usuarios: function (d, ctx) {
    if (ctx.rol === 'empresa') { if (OPERATIVOS.indexOf(d.rol) < 0) throw err('PERMISO', 'Solo puedes crear reclutadores o directores.'); }
    else if (d.rol !== 'empresa') throw err('PERMISO', 'El administrador solo crea cuentas de empresa.');
    if (!/^\S+@\S+\.\S+$/.test(d.correo || '')) throw err('DATOS', 'Correo no válido.');
    if (!d.claveHash || !d.sal) throw err('DATOS', 'Falta la contraseña.');
    if (T('usuarios').filas.some(function (u) { return String(u.correo).toLowerCase() === String(d.correo).toLowerCase(); })) throw err('DUPLICADO', 'Ya existe una cuenta con ese correo.');
    if (!T('empresas').porId(d.idEmpresa)) throw err('NO_ENCONTRADO', 'La empresa no existe.');
    if (OPERATIVOS.indexOf(d.rol) >= 0) cupoUsuarios(d.idEmpresa);
    d.estado = 'activo'; d.debeCambiarClave = true;
  },
  suscripciones: function (d) {                              // el servidor calcula las fechas: el cliente no puede regalarse tiempo
    const plan = T('planes').porId(d.idPlan); if (!plan || plan.estado !== 'activo') throw err('PLAN', 'Ese plan no está disponible.');
    const n = ahora(); d.fechaInicio = n; d.fechaVencimiento = n + (plan.periodicidad === 'anual' ? 365 : 30) * 864e5; d.estado = 'activa';
  },
  candidatos: function () { throw err('PERMISO', 'Las postulaciones entran por el formulario público.'); },
  hojas_de_vida: function () { throw err('PERMISO', 'Las hojas de vida entran por el formulario público.'); },
  auditoria: function (d, ctx) { d.usuario = ctx.usuario.nombre; d.rol = ctx.rol; d.idUsuario = ctx.usuario.id; d.fecha = ahora(); },   // el actor no se puede falsificar
  sugerencias: function (d, ctx) { if (ctx.rol !== 'admin_plataforma') { d.idUsuario = ctx.usuario.id; d.usuario = ctx.usuario.nombre; d.rol = ctx.rol; d.estado = 'nueva'; d.respuesta = ''; } }
};
const REGLAS_ACTUALIZAR = {
  usuarios: function (f, patch) {
    if (f.rol === 'admin_plataforma') throw err('PERMISO', 'No se puede modificar al administrador de plataforma.');
    ['rol', 'idEmpresa', 'correo'].forEach(function (k) { delete patch[k]; });
    if (patch.estado === 'activo' && f.estado !== 'activo' && OPERATIVOS.indexOf(f.rol) >= 0) cupoUsuarios(f.idEmpresa);
  },
  suscripciones: function (f, patch, ctx) { if (ctx.rol === 'empresa' && !(Object.keys(patch).every(function (k) { return k === 'estado'; }) && patch.estado === 'reemplazada')) throw err('PERMISO', 'Solo el administrador cambia suscripciones.'); },
  hojas_de_vida: function () { throw err('PERMISO', 'Las hojas de vida no se editan.'); },
  sugerencias: function (f, patch, ctx) { if (ctx.rol !== 'admin_plataforma') throw err('PERMISO', 'Solo el administrador responde.'); Object.keys(patch).forEach(function (k) { if (['estado', 'respuesta', 'fechaRespuesta'].indexOf(k) < 0) delete patch[k]; }); }
};
const PROTEGIDOS = ['id', 'idEmpresa', 'version', 'creado', 'actualizado'];
function aplicarOp(op, ctx) {
  const t = op.tabla, tabla = (autorizar(t, ctx, op.accion, op.datos || {}), T(t)), n = ahora();
  if (op.accion === 'insertar') {
    const d = soloColumnas(t, op.datos || {}); if (!d.id) throw err('DATOS', 'Falta el id.');
    const ex = tabla.porId(d.id); if (ex) { if (!enAlcance(t, ctx, ex)) throw err('PERMISO', 'Ese registro no es tuyo.'); return; }   // reintento: ya estaba (idempotente)
    if (ctx.rol !== 'admin_plataforma' && TABLAS[t].col && TABLAS[t].col !== 'id') d[TABLAS[t].col] = ctx.idEmpresa;
    if (REGLAS_INSERTAR[t]) REGLAS_INSERTAR[t](d, ctx);
    tabla.insertar(Object.assign(d, { version: 1, creado: n, actualizado: n }));
  } else if (op.accion === 'actualizar') {
    const f = tabla.porId(op.id); if (!f) throw err('NO_ENCONTRADO', 'El registro ya no existe.');
    if (!enAlcance(t, ctx, f)) throw err('PERMISO', 'Ese registro no es tuyo.');
    if (op.baseVersion && f.version !== op.baseVersion) throw err('CONFLICTO', 'Otro dispositivo modificó este registro antes. Se restauró la versión del servidor.');
    const patch = soloColumnas(t, op.datos || {}); PROTEGIDOS.forEach(function (k) { delete patch[k]; });
    if (REGLAS_ACTUALIZAR[t]) REGLAS_ACTUALIZAR[t](f, patch, ctx);
    tabla.actualizar(Object.assign({}, f, patch, { version: f.version + 1, actualizado: n }));
  } else if (op.accion === 'eliminar') {
    const f = tabla.porId(op.id); if (!f) return;            // ya estaba borrado (idempotente)
    if (!enAlcance(t, ctx, f)) throw err('PERMISO', 'Ese registro no es tuyo.');
    if (t === 'usuarios' && f.rol === 'admin_plataforma') throw err('PERMISO', 'No se puede eliminar al administrador.');
    if (t === 'hojas_de_vida' && f.idArchivoDrive) { try { DriveApp.getFileById(f.idArchivoDrive).setTrashed(true); } catch (e) { LOG('WARN', 'drive', 'No se pudo enviar a la papelera', String(e)); } }
    tabla.borrar(f.id);
    T('eliminados').insertar(nuevo({ tabla: t, idRegistro: f.id, idEmpresa: t === 'empresas' ? f.id : (f.idEmpresa || ''), fecha: n }));
  } else throw err('OPERACION', 'Operación desconocida.');
}
// Recibe una lista de operaciones y responde una por una (una mala no detiene a las demás).
function empujar(p, ctx) {
  const ops = (p.ops || []).slice(0, 100), res = [];
  ops.forEach(function (op) {
    try { aplicarOp(op, ctx); res.push({ idOp: op.idOp, ok: true }); }
    catch (x) { LOG('WARN', 'empujar', op.accion + ' ' + op.tabla + ' rechazada', { codigo: x.codigo || String(x) }); res.push({ idOp: op.idOp, ok: false, codigo: x.codigo || 'SERVIDOR', mensaje: x.mensaje || String(x.message || x) }); }
  });
  LOG('INFO', 'empujar', ops.length + ' operaciones', { rechazadas: res.filter(function (r) { return !r.ok; }).length });
  return { resultados: res };
}
function carpetaCV() {                                       // carpeta privada de Drive para las hojas de vida
  const props = PropertiesService.getScriptProperties(); let id = props.getProperty('CARPETA_CV');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* se recrea */ } }
  const c = DriveApp.createFolder('SelecciónIA_HojasDeVida'); props.setProperty('CARPETA_CV', c.getId()); return c;
}
function descargarArchivo(p, ctx) {
  const h = T('hojas_de_vida').porId(p.idHoja); if (!h || !enAlcance('hojas_de_vida', ctx, h)) throw err('NO_ENCONTRADO', 'Hoja de vida no encontrada.');
  const b = DriveApp.getFileById(h.idArchivoDrive).getBlob(); return { base64: Utilities.base64Encode(b.getBytes()), nombre: h.nombreArchivo };
}

/* ========================= [7] ACCIONES PÚBLICAS =========================== */
function ping() { return { servicio: 'SelecciónIA', version: VERSION, ahora: ahora() }; }
function contenidoPublico() { const c = T('contenido').filas[0]; return c ? limpiar('contenido', c) : null; }
function registrarEmpresa(p) {
  if (!p.nombreEmpresa || !p.nit || !p.nombre || !/^\S+@\S+\.\S+$/.test(p.correo || '')) throw err('DATOS', 'Completa todos los campos con datos válidos.');
  if (String(p.clave || '').length < 8) throw err('DATOS', 'La contraseña debe tener al menos 8 caracteres.');
  if (T('empresas').filas.some(function (e) { return e.nit === String(p.nit).trim(); })) throw err('DUPLICADO', 'Ya existe una empresa con ese NIT.');
  if (T('usuarios').filas.some(function (u) { return String(u.correo).toLowerCase() === String(p.correo).trim().toLowerCase(); })) throw err('DUPLICADO', 'Ya existe una cuenta con ese correo.');
  const e = T('empresas').insertar(nuevo({ nombre: String(p.nombreEmpresa).trim(), nit: String(p.nit).trim(), correoContacto: String(p.correo).trim(), estado: 'activa' }));
  const sal = Utilities.getUuid().replace(/-/g, '');
  T('usuarios').insertar(nuevo({ nombre: String(p.nombre).trim(), correo: String(p.correo).trim(), rol: 'empresa', idEmpresa: e.id, estado: 'activo', claveHash: hash(sal, p.clave), sal: sal, debeCambiarClave: false }));
  auditar('empresa_registrada', null, { entidad: 'empresa', idEntidad: e.id, idEmpresa: e.id, detalle: e.nombre }); return { idEmpresa: e.id };
}
function vacantesPublicasLista() {
  return T('vacantes').filas.filter(function (v) { return v.estado === 'publicada'; }).map(function (v) { return { v: v, pe: permisoEmpresa(v.idEmpresa) }; })
    .filter(function (x) { return x.pe.ok; }).map(function (x) { return { id: x.v.id, idEmpresa: x.v.idEmpresa, titulo: x.v.titulo, area: x.v.area, perfilProfesional: x.v.perfilProfesional, descripcion: x.v.descripcion, requisitos: x.v.requisitos, fechaPublicacion: x.v.fechaPublicacion, empresaNombre: x.pe.empresa.nombre }; });
}
function vacantesPublicas() { return vacantesPublicasLista(); }
// Postulación de un candidato (sin cuenta): valida TODO en el servidor y guarda el archivo en Drive.
function postular(p) {
  const v = vacantesPublicasLista().filter(function (x) { return x.id === p.idVacante; })[0]; if (!v) throw err('VACANTE', 'Esta vacante ya no está disponible.');
  const correo = String(p.correo || '').trim(), anios = Number(p.aniosExperiencia === '' ? NaN : p.aniosExperiencia), a = p.archivo || {};
  if (!String(p.nombre || '').trim()) throw err('DATOS', 'Escribe tu nombre.');
  if (!/^\S+@\S+\.\S+$/.test(correo)) throw err('DATOS', 'Escribe un correo válido.');
  if (NIVELES.indexOf(p.nivelEducativo) < 0) throw err('DATOS', 'Selecciona tu máximo nivel de formación.');
  if (!(anios >= 0 && anios <= 60 && Math.floor(anios) === anios)) throw err('DATOS', 'Los años de experiencia deben ser un número entero.');
  if (!p.consentimiento) throw err('DATOS', 'Debes aceptar el tratamiento de tus datos personales para postularte.');
  if (!a.base64 || !a.nombre) throw err('ARCHIVO', 'Adjunta tu hoja de vida.');
  const ext = String(a.nombre).split('.').pop().toLowerCase(); if (ext !== 'pdf' && ext !== 'docx') throw err('FORMATO', 'La hoja de vida debe ser un archivo PDF o DOCX.');
  const bytes = Math.floor(a.base64.length * 3 / 4); if (bytes > MAX_BYTES_CV) throw err('PESO', 'La hoja de vida pesa más de 10 MB. Reduce su tamaño e inténtalo de nuevo.');
  if (T('candidatos').filas.some(function (c) { return c.idVacante === v.id && String(c.correo).toLowerCase() === correo.toLowerCase(); })) throw err('DUPLICADO', 'Ya te postulaste a esta vacante con ese correo.');
  const mime = ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const archivo = carpetaCV().createFile(Utilities.newBlob(Utilities.base64Decode(a.base64), mime, a.nombre));
  const c = T('candidatos').insertar(nuevo({ idEmpresa: v.idEmpresa, idVacante: v.id, nombre: String(p.nombre).trim(), correo: correo, telefono: String(p.telefono || '').trim(), nivelEducativo: p.nivelEducativo, aniosExperiencia: anios, estadoProceso: 'postulado', idEtapaActual: '', consentimiento: true }));
  const texto = String(p.textoExtraido || '').slice(0, 20000);
  T('hojas_de_vida').insertar(nuevo({ idCandidato: c.id, idEmpresa: v.idEmpresa, fechaPostulacion: ahora(), nombreArchivo: a.nombre, formato: ext, pesoMB: Math.round(bytes / 10485.76) / 100, textoExtraido: texto, extraccion: texto ? 'ok' : 'sin_texto', idArchivoDrive: archivo.getId() }));
  auditar('postulacion_recibida', null, { entidad: 'candidato', idEntidad: c.id, idEmpresa: v.idEmpresa, detalle: 'Vacante ' + v.id });   // sin datos personales
  LOG('INFO', 'postular', 'Postulación recibida', { vacante: v.id }); return { id: c.id };
}

/* ========================= [8] PUERTA DE ENTRADA =========================== */
const ACCIONES = { ping: ping, login: login, registrarEmpresa: registrarEmpresa, vacantesPublicas: vacantesPublicas, postular: postular, contenidoPublico: contenidoPublico,
  logout: logout, latido: latido, cambiarClave: cambiarClave, cambios: cambios, empujar: empujar, descargarArchivo: descargarArchivo, cerrarSesionDe: cerrarSesionDe };
function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return salida({ ok: true, datos: ping() }); }
// Una sola petición a la vez (LockService): evita que dos ingresos tomen el último cupo o que dos escrituras se pisen.
function doPost(e) {
  const lock = LockService.getScriptLock(); let accion = '?';
  try {
    lock.waitLock(25000); _T = {};
    const p = JSON.parse(e.postData.contents); accion = p.accion;
    const h = ACCIONES[accion]; if (!h) throw err('ACCION', 'Acción desconocida: ' + accion);
    const ctx = ACCIONES_PUBLICAS.indexOf(accion) >= 0 ? null : validarSesion(p.token);
    LOG('DEBUG', 'doPost', accion);
    return salida({ ok: true, datos: h(p, ctx) });
  } catch (x) {
    const esNuestro = x && x.codigo;
    if (!esNuestro) LOG('ERROR', 'doPost', 'Error inesperado en ' + accion, String(x && x.stack || x));
    return salida({ ok: false, codigo: esNuestro ? x.codigo : 'SERVIDOR', mensaje: esNuestro ? x.mensaje : 'Error interno del servidor. Revisa «Ejecuciones» en Apps Script.' });
  } finally { try { lock.releaseLock(); } catch (e2) { /* ya liberado */ } }
}

/* =========================== [9] MANTENIMIENTO ============================= */
// Crea las pestañas con sus encabezados y formato de texto (para que el NIT "0123" no pierda el cero). Se puede repetir sin riesgo.
function prepararHoja() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(ESQUEMA).forEach(function (t) {
    const defs = columnas(t); let sh = ss.getSheetByName(t);
    if (!sh) sh = ss.insertSheet(t);
    sh.getRange(1, 1, sh.getMaxRows(), defs.length).setNumberFormat('@');
    if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, defs.length).setValues([defs.map(function (d) { return d.n; })]); sh.getRange(1, 1, 1, defs.length).setFontWeight('bold'); sh.setFrozenRows(1); }
    LOG('INFO', 'prepararHoja', 'Pestaña lista: ' + t);
  });
}
// Ejecútala UNA VEZ desde el editor: prepara las pestañas y crea el administrador inicial.
function inicializar() {
  prepararHoja(); _T = {};
  if (!T('usuarios').filas.some(function (u) { return u.rol === 'admin_plataforma'; })) {
    const sal = Utilities.getUuid().replace(/-/g, '');
    T('usuarios').insertar(nuevo({ nombre: ADMIN_INICIAL.nombre, correo: ADMIN_INICIAL.correo, rol: 'admin_plataforma', idEmpresa: '', estado: 'activo', claveHash: hash(sal, ADMIN_INICIAL.clave), sal: sal, debeCambiarClave: true }));
    LOG('INFO', 'inicializar', 'Administrador inicial creado: ' + ADMIN_INICIAL.correo);
  }
  carpetaCV(); LOG('INFO', 'inicializar', 'Listo. Ahora publica la aplicación web (Implementar).');
}
// Revisa que las pestañas y encabezados coincidan con ESQUEMA (útil después de agregar campos).
function verificarHoja() {
  const ss = SpreadsheetApp.getActive(), problemas = [];
  Object.keys(ESQUEMA).forEach(function (t) {
    const sh = ss.getSheetByName(t); if (!sh) { problemas.push('Falta la pestaña ' + t); return; }
    const esperado = columnas(t).map(function (d) { return d.n; }), real = sh.getLastRow() ? sh.getRange(1, 1, 1, esperado.length).getValues()[0] : [];
    if (String(real) !== String(esperado)) problemas.push('Encabezados distintos en ' + t + ': esperado [' + esperado + '] vs actual [' + real + ']');
  });
  LOG('INFO', 'verificarHoja', problemas.length ? problemas.join(' | ') : 'Todo en orden'); return problemas;
}
