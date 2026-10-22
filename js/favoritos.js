// js/favoritos.js · favoritos guardados en localStorage con su propia clave.
// Se guarda el personaje completo (lo que pinta la tarjeta) para poder mostrar la vista
// Favoritos sin volver a pedir nada a la API.
const CLAVE = 'multiverso:favoritos';

// Un favorito válido es un objeto con id numérico y nombre. Todo lo demás se descarta.
const esValido = (p) =>
  p !== null && typeof p === 'object' && Number.isFinite(p.id) && typeof p.name === 'string';

// Lee y VALIDA: si el valor no es JSON, no es un array o trae basura, devuelve [] y la app sigue viva.
const leer = () => {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(guardado) ? guardado.filter(esValido) : [];
  } catch {
    return [];
  }
};

const escribir = (lista) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // Almacenamiento lleno o bloqueado (modo privado): la app sigue funcionando en memoria.
  }
};

let favoritos = leer();

// Solo guardamos los campos que usan la tarjeta y el modal.
const resumen = (p) => ({
  id: p.id,
  name: p.name,
  status: p.status,
  species: p.species,
  origin: { name: p.origin?.name ?? 'unknown' },
  location: { name: p.location?.name ?? 'unknown' },
  image: p.image,
});

export const listaFavoritos = () => favoritos;
export const esFavorito = (id) => favoritos.some((f) => f.id === id);

// Marca o desmarca. Devuelve true si quedó marcado.
export const alternarFavorito = (personaje) => {
  const marcado = esFavorito(personaje.id);
  favoritos = marcado
    ? favoritos.filter((f) => f.id !== personaje.id)
    : [...favoritos, resumen(personaje)];
  escribir(favoritos);
  return !marcado;
};
