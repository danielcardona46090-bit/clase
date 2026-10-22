import { obtenerPersonajes, urlLista } from './api.js';
import { filtrarPersonajes } from './logica.js';
import { listaFavoritos, esFavorito, alternarFavorito } from './favoritos.js';

// --- Estados: la clave es el valor EXACTO que trae la API (status) ---
const ESTADOS = {
  Alive:   { texto: 'Vivo',        clases: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  Dead:    { texto: 'Muerto',      clases: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  unknown: { texto: 'Desconocido', clases: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
};
// Si llega un status que no está en ESTADOS, la tarjeta igual se ve
const estadoDe = (p) =>
  ESTADOS[p.status] ?? { texto: p.status || 'Sin dato', clases: ESTADOS.unknown.clases };

// Los datos vienen de internet o de localStorage: se escapan antes de meterlos en innerHTML.
const esc = (valor) =>
  String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// --- Referencias al DOM ---
const grilla = document.getElementById('grilla');
const contador = document.getElementById('contador');
const titulo = document.getElementById('titulo');
const formulario = document.getElementById('formulario');
const inputBusqueda = document.getElementById('busqueda');
const selectEstado = document.getElementById('filtro-estado');
const btnMas = document.getElementById('btn-mas');
const errorMas = document.getElementById('error-mas');
const enlacesVista = document.querySelectorAll('a[data-vista]');

// --- Estado de la aplicación ---
const filtros = { texto: '', estado: '' };
const app = {
  vista: 'personajes',   // 'personajes' | 'favoritos'
  fase: 'cargando',      // 'cargando' | 'error' | 'listo'  (solo aplica a la vista personajes)
  lista: [],             // personajes cargados desde la API (se acumulan con "Cargar más")
  siguiente: null,       // datos.info.next: URL de la página siguiente, o null en la última
  total: 0,              // datos.info.count
  url: '',               // consulta con la que se cargó la lista
  cargandoMas: false,
  falloMas: false,
};
let peticionActual = 0;  // para ignorar respuestas viejas si el usuario sigue escribiendo

// --- Plantillas ---
const BASE_CORAZON = 'absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white/90 text-xl shadow transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-slate-900/80';
const corazonDe = (marcado) => (marcado ? '♥' : '♡');
const etiquetaCorazon = (p, marcado) => `${marcado ? 'Quitar de favoritos a' : 'Marcar como favorito a'} ${p.name}`;

const tarjetaHTML = (p) => {
  const estado = estadoDe(p);
  const marcado = esFavorito(p.id);
  return `
  <article class="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow group transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-800">
    <div class="overflow-hidden">
      <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"
          class="aspect-square w-full object-cover transition group-hover:scale-105">
    </div>
    <button type="button" data-fav="${esc(p.id)}" aria-pressed="${marcado}" aria-label="${esc(etiquetaCorazon(p, marcado))}"
            class="${BASE_CORAZON} ${marcado ? 'text-rose-500' : 'text-slate-400'}">${corazonDe(marcado)}</button>
    <div class="flex flex-1 flex-col gap-2 p-4">
      <h3 class="text-lg font-bold text-slate-900 dark:text-white">${esc(p.name)}</h3>
      <span class="w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${estado.clases}">● ${esc(estado.texto)}</span>
      <p class="text-sm text-slate-500 dark:text-slate-400">${esc(p.species)} · ${esc(p.origin?.name)}</p>
      <button type="button" data-id="${esc(p.id)}"
              class="mt-auto rounded-lg bg-indigo-600 py-2 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        Ver detalle
      </button>
    </div>
  </article>`;
};

const CAJA_MENSAJE = 'col-span-full rounded-2xl bg-white p-8 text-center shadow dark:bg-slate-800';
const BOTON_ACCION = 'mt-4 rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-700 active:scale-95';

const cargandoHTML = `
  <p role="status" class="${CAJA_MENSAJE} text-slate-500 dark:text-slate-400">
    Cargando personajes…
  </p>`;

const errorHTML = `
  <div role="alert" class="${CAJA_MENSAJE}">
    <p class="font-semibold text-rose-600 dark:text-rose-400">No pudimos cargar los personajes.</p>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Revisa tu conexión e inténtalo de nuevo.</p>
    <button type="button" data-accion="reintentar" class="${BOTON_ACCION}">Reintentar</button>
  </div>`;

const vacioHTML = `
  <p class="${CAJA_MENSAJE} text-slate-500 dark:text-slate-400">
    No se encontró ningún personaje con esos filtros. Prueba con otro nombre o borra el filtro de estado.
  </p>`;

const sinFavoritosHTML = `
  <div class="${CAJA_MENSAJE}">
    <p class="font-semibold text-slate-700 dark:text-slate-200">Aún no tienes favoritos.</p>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Pulsa el corazón ♡ de cualquier personaje para guardarlo aquí.</p>
    <button type="button" data-vista-ir="personajes" class="${BOTON_ACCION}">Explorar personajes</button>
  </div>`;

const favoritosSinCoincidenciasHTML = `
  <p class="${CAJA_MENSAJE} text-slate-500 dark:text-slate-400">
    Ninguno de tus favoritos coincide con esos filtros. Prueba con otro nombre o borra el filtro de estado.
  </p>`;

// --- render: pinta según la vista y la fase. NUNCA deja la pantalla en blanco ---
const render = () => {
  const enFavoritos = app.vista === 'favoritos';
  titulo.textContent = enFavoritos ? 'Tus personajes favoritos' : 'Personajes de Rick and Morty';
  enlacesVista.forEach((a) => {
    if (a.dataset.vista === app.vista) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  if (enFavoritos) {
    const todos = listaFavoritos();
    const visibles = filtrarPersonajes(todos, filtros);
    contador.textContent = `${visibles.length} de ${todos.length} favoritos`;
    grilla.innerHTML = todos.length === 0
      ? sinFavoritosHTML
      : visibles.length === 0 ? favoritosSinCoincidenciasHTML : visibles.map(tarjetaHTML).join('');
    btnMas.hidden = true;
    errorMas.hidden = true;
    return;
  }

  if (app.fase === 'cargando') {
    contador.textContent = 'Cargando…';
    grilla.innerHTML = cargandoHTML;
  } else if (app.fase === 'error') {
    contador.textContent = '';
    grilla.innerHTML = errorHTML;
  } else {
    contador.textContent = `${app.lista.length} de ${app.total} personajes`;
    grilla.innerHTML = app.lista.length === 0 ? vacioHTML : app.lista.map(tarjetaHTML).join('');
  }

  // "Cargar más": solo existe si hay página siguiente (info.next !== null)
  const hayMas = app.fase === 'listo' && app.siguiente !== null;
  btnMas.hidden = !hayMas;
  btnMas.disabled = app.cargandoMas;
  btnMas.textContent = app.cargandoMas ? 'Cargando…' : app.falloMas ? 'Reintentar' : 'Cargar más';
  errorMas.hidden = !(hayMas && app.falloMas);
};

// --- cargar: primera página (o primera página de una búsqueda nueva) ---
const cargar = async () => {
  const mia = ++peticionActual;
  app.url = urlLista(filtros);
  Object.assign(app, { fase: 'cargando', lista: [], siguiente: null, total: 0, cargandoMas: false, falloMas: false });
  render();
  try {
    const { personajes, siguiente, total } = await obtenerPersonajes(app.url);
    if (mia !== peticionActual) return;   // llegó tarde: ya hay una búsqueda más nueva
    Object.assign(app, { fase: 'listo', lista: personajes, siguiente, total });
  } catch (error) {
    if (mia !== peticionActual) return;
    console.error(error);
    app.fase = 'error';
  }
  render();
};

// --- cargarMas: pide info.next y AÑADE los resultados a la lista ---
const cargarMas = async () => {
  if (!app.siguiente || app.cargandoMas) return;
  const mia = peticionActual;
  Object.assign(app, { cargandoMas: true, falloMas: false });
  render();
  try {
    const { personajes, siguiente } = await obtenerPersonajes(app.siguiente);
    if (mia !== peticionActual) return;
    app.lista = [...app.lista, ...personajes];
    app.siguiente = siguiente;
  } catch (error) {
    if (mia !== peticionActual) return;
    console.error(error);
    app.falloMas = true;   // las tarjetas ya cargadas se quedan
  }
  app.cargandoMas = false;
  render();
};

// --- Buscador y filtro ---
// Vista personajes: la búsqueda va a la API (con una pausa para no pedir en cada tecla).
// Vista favoritos: se filtran los favoritos guardados, al instante.
let pausa;
const buscar = () => {
  clearTimeout(pausa);
  if (app.vista === 'favoritos') render();
  else cargar();
};
inputBusqueda.addEventListener('input', () => {
  filtros.texto = inputBusqueda.value;
  clearTimeout(pausa);
  if (app.vista === 'favoritos') render();
  else pausa = setTimeout(cargar, 350);
});
selectEstado.addEventListener('change', () => {
  filtros.estado = selectEstado.value;
  buscar();
});
// Enter dentro del formulario no debe recargar la página: busca ya, sin esperar la pausa
formulario.addEventListener('submit', (e) => {
  e.preventDefault();
  filtros.texto = inputBusqueda.value;
  buscar();
});

btnMas.addEventListener('click', cargarMas);

// --- Delegación en la grilla: UN listener para corazones, detalle y reintentar ---
const modal = document.getElementById('modal-detalle');
const buscarPersonaje = (id) =>
  app.lista.find((x) => x.id === id) ?? listaFavoritos().find((x) => x.id === id);

grilla.addEventListener('click', (e) => {
  const corazon = e.target.closest('button[data-fav]');
  if (corazon) {
    const p = buscarPersonaje(Number(corazon.dataset.fav));   // dataset siempre es texto
    if (!p) return;
    const marcado = alternarFavorito(p);
    if (app.vista === 'favoritos') {
      render();   // en Favoritos, desmarcar hace desaparecer la tarjeta
    } else {
      // Se actualiza el mismo botón (no se repinta la grilla) para no perder el foco del teclado
      corazon.textContent = corazonDe(marcado);
      corazon.setAttribute('aria-pressed', marcado);
      corazon.setAttribute('aria-label', etiquetaCorazon(p, marcado));
      corazon.classList.toggle('text-rose-500', marcado);
      corazon.classList.toggle('text-slate-400', !marcado);
    }
    return;
  }

  if (e.target.closest('button[data-accion="reintentar"]')) {
    cargar();
    return;
  }

  const irA = e.target.closest('button[data-vista-ir]');
  if (irA) {
    cambiarVista(irA.dataset.vistaIr);
    return;
  }

  const boton = e.target.closest('button[data-id]');   // clic en imagen o en el espacio entre tarjetas → null
  if (!boton) return;
  const p = buscarPersonaje(Number(boton.dataset.id));
  if (!p) return;
  document.getElementById('modal-nombre').textContent = p.name;
  document.getElementById('modal-img').src = p.image;
  document.getElementById('modal-img').alt = p.name;
  document.getElementById('modal-estado').textContent = estadoDe(p).texto;
  document.getElementById('modal-especie').textContent = p.species;
  document.getElementById('modal-origen').textContent = p.origin?.name ?? 'unknown';
  document.getElementById('modal-ubicacion').textContent = p.location?.name ?? 'unknown';
  modal.showModal();   // fondo oscuro + Esc + foco atrapado, gratis
});
// Clic en el fondo oscuro: el target es el propio <dialog>, no algo de adentro
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

// --- Menú: móvil (abrir/cerrar) y enlaces de vista (Personajes / Favoritos) ---
const btnMenu = document.getElementById('btn-menu');
const menu = document.getElementById('menu');
btnMenu.addEventListener('click', () => {
  menu.classList.toggle('hidden');
  btnMenu.setAttribute('aria-expanded', !menu.classList.contains('hidden'));
});

const cambiarVista = (vista) => {
  app.vista = vista;
  // Si los filtros cambiaron mientras mirabas Favoritos, la lista de personajes quedó vieja
  if (vista === 'personajes' && app.url !== urlLista(filtros)) cargar();
  else render();
  menu.classList.add('hidden');   // en móvil, cierra el menú tras elegir
  btnMenu.setAttribute('aria-expanded', 'false');
};
menu.addEventListener('click', (e) => {
  const enlace = e.target.closest('a[data-vista]');
  if (!enlace) return;
  e.preventDefault();
  cambiarVista(enlace.dataset.vista);
});

// --- Primer pintado ---
cargar();
