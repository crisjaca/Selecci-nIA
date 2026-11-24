import { ListaCorreos } from '../dominio/ListaCorreos.js';
import { GrupoCandidatos, GRUPOS } from '../dominio/GrupoCandidatos.js';
import { RepositorioCandidato } from '../../rf03-hojas-de-vida/infraestructura/RepositorioCandidato.js';
import { ErrorApp } from '../../../core/Errores.js';

// El sistema NO envía correos: solo reúne y formatea las direcciones para que el reclutador las copie y las use desde su correo.
export class ServicioCorreos {
  constructor() { this.candidatos = new RepositorioCandidato(); }
  grupo(idEmpresa, idVacante, tipo = 'todos') {
    const estados = GRUPOS[tipo]; if (!estados) throw new ErrorApp('DATOS', 'Elige un grupo.');
    return new GrupoCandidatos({ idGrupo: `${idVacante}:${tipo}`, nombreGrupo: tipo, candidatos: this.candidatos.listar(c => c.idEmpresa === idEmpresa && c.idVacante === idVacante && estados.includes(c.estadoProceso)) });
  }
  recopilar(idEmpresa, idVacante, tipo = 'todos', separador = ';') {
    const g = this.grupo(idEmpresa, idVacante, tipo);
    if (!g.candidatos.length) throw new ErrorApp('GRUPO_VACIO', 'El grupo no tiene candidatos no seleccionados.');
    const vistos = new Set(), validos = [];
    g.candidatos.forEach(c => { const m = (c.correo || '').trim(); if (/^\S+@\S+\.\S+$/.test(m) && !vistos.has(m.toLowerCase())) { vistos.add(m.toLowerCase()); validos.push(m); } });
    if (!validos.length) throw new ErrorApp('SIN_CORREOS', 'Ningún candidato del grupo tiene un correo válido.');
    return new ListaCorreos({ correosFormateados: validos.join(separador === ',' ? ', ' : '; '), total: validos.length, omitidos: g.candidatos.length - validos.length });
  }
}
