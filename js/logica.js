// js/logica.js · funciones puras: reciben datos y devuelven datos (no tocan el DOM).
// Filtra por nombre (sin importar mayúsculas ni espacios en los bordes) y por estado.
// estado === '' significa "todos los estados".
export const filtrarPersonajes = (lista, { texto, estado }) => {
  const buscado = texto.trim().toLowerCase();
  return lista
    .filter((p) => p.name.toLowerCase().includes(buscado))
    .filter((p) => estado === '' || p.status === estado);
};
