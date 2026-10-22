// js/api.js · todo lo que habla con internet vive aquí (no toca el DOM).
const URL_BASE = 'https://rickandmortyapi.com/api/character';

// fetch NO rechaza con un 404 o 500: hay que revisar respuesta.ok y lanzar el error nosotros.
export const pedirJSON = async (url) => {
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    const error = new Error(`Error ${respuesta.status} al pedir ${url}`);
    error.status = respuesta.status;
    throw error;
  }
  return respuesta.json();
};

// Arma la URL de la lista con los filtros (la API espera status en minúsculas).
export const urlLista = ({ texto = '', estado = '' } = {}) => {
  const params = new URLSearchParams();
  if (texto.trim()) params.set('name', texto.trim());
  if (estado) params.set('status', estado.toLowerCase());
  const consulta = params.toString();
  return consulta ? `${URL_BASE}?${consulta}` : URL_BASE;
};

// Pide una página de personajes. Devuelve { personajes, siguiente, total }.
//   datos.results    → el array
//   datos.info.next  → URL de la página siguiente (null en la última)
//   datos.info.count → total que cumple el filtro
// Cada personaje ya trae todo lo que pinta la tarjeta: no hace falta pedir detalle.
export const obtenerPersonajes = async (url = URL_BASE) => {
  try {
    const datos = await pedirJSON(url);
    return {
      personajes: datos.results,
      siguiente: datos.info.next,
      total: datos.info.count,
    };
  } catch (error) {
    // La API responde 404 cuando la búsqueda no encuentra nada: eso es "vacío", no "error".
    if (error.status === 404) return { personajes: [], siguiente: null, total: 0 };
    throw error;
  }
};
