export const RAIZ = new URL('../../', import.meta.url).href;
export const ir = (ruta) => location.assign(RAIZ + ruta);
