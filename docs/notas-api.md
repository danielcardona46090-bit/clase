# Notas de la API · Multiverso Explorer (Semana 8)

API: **The Rick and Morty API** · https://rickandmortyapi.com/documentation

> Respuestas basadas en la documentación oficial de la API y en la forma de los datos que ya
> copiábamos en `datos.js` (Semana 7). Verifícalas tú también abriendo la URL en el navegador
> (pestaña Network → Response, o la extensión JSON Viewer).

## 1. ¿Cuál es la URL de la lista?

```
https://rickandmortyapi.com/api/character
```

Con filtros (los usa el buscador y el select de estado):

```
https://rickandmortyapi.com/api/character?name=rick&status=alive
```

Con página: `https://rickandmortyapi.com/api/character?page=2`

## 2. ¿Dónde está el array?

En **`datos.results`** (un array de 20 personajes por página). La raíz de la respuesta es un
objeto con dos claves: `info` y `results`.

## 3. ¿Dónde está la página siguiente?

En **`datos.info.next`**: es una **URL completa** lista para pasarla a `fetch`
(`https://rickandmortyapi.com/api/character?page=2`). En la última página vale **`null`**:
así sabemos cuándo ocultar «Cargar más».

Otros datos útiles de `info`: `count` (total de personajes que cumplen el filtro),
`pages` (número de páginas) y `prev`.

## 4. ¿Cada elemento trae todo lo que pinta la tarjeta?

**Sí, no hace falta pedir un detalle.** Cada objeto de `results` ya incluye:

| Lo que pinta la app | Ruta exacta |
|---|---|
| Foto | `p.image` |
| Nombre | `p.name` |
| Estado (insignia) | `p.status` → `'Alive'`, `'Dead'`, `'unknown'` |
| Especie | `p.species` |
| Origen | `p.origin.name` |
| Ubicación (modal) | `p.location.name` |
| Identificador (corazón y modal) | `p.id` |

Por eso **no usamos el patrón lista → detalles con `Promise.all`**: una sola petición por
página basta.

## Casos especiales

- **Búsqueda sin resultados:** la API responde **404** con `{ "error": "There is nothing here" }`.
  No es un fallo real de red: en `obtenerPersonajes` lo convertimos en una lista vacía para que se
  muestre el mensaje de «sin resultados» y no el de error.
- **Filtro de estado:** la API acepta `status=alive|dead|unknown` (en minúsculas).

## Paginación (paso 4)

La API **sí pagina** (20 por página, `info.next`), así que el paso 4 («Cargar más») está hecho:

- Guardamos en el estado `siguiente = datos.info.next`.
- Al pulsar «Cargar más» pedimos esa URL y **añadimos** los resultados a la lista.
- Si `siguiente` es `null`, el botón desaparece.
- El contador muestra `cargados de info.count`.

## Favoritos (pasos 5 y 6)

- Clave de `localStorage`: **`multiverso:favoritos`**.
- Se guardan los personajes completos (los campos que pinta la tarjeta), no solo el id, para que
  la vista Favoritos funcione sin volver a pedir nada a la API.
- Si el valor guardado está dañado (no es JSON, o no es un array), se ignora y la app arranca con
  la lista vacía.
