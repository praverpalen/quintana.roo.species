import type { CatKey, ColourKey, HabitatKey, Iucn, Lang } from './data/types';

const en = {
  lang: 'en' as Lang,
  greeting: '¡Hola! · Quintana Roo',
  homeTitle: 'What will you spot today?', searchPh: 'Search a species…', progressTitle: 'Your collection', of: 'of', spottedWord: 'spotted',
  byCat: 'By category', recent: 'Recently spotted', seeAll: 'See all', tabHome: 'Home', tabCards: 'Cards', tabCol: 'Collection',
  cardsTitle: 'All cards', all: 'All', spottedF: 'Spotted', toFind: 'To find', filters: 'Filters', origin: 'Origin', colour: 'Colour', sort: 'Sort',
  any: 'Any', number: 'Number', native: 'Native', introduced: 'Introduced', recentSort: 'Recent',
  results: 'species', clear: 'Clear filters', empty: 'No species match. Try another search.', colTitle: 'My collection', colEmpty: 'No cards here yet. Go explore!', explore: 'Explore cards',
  fact: 'FUN FACT', about: 'About', size: 'Size', rarity: 'Rarity', status: 'Conservation status', colours: 'Colours', habitat: 'Habitat', where: 'Where to spot it',
  markSpotted: 'I spotted it!', undo: 'Undo', notYet: "You haven't seen it yet. See below for where to look.",
  sizeShort: 'SIZE', spotted: 'Spotted', notSpotted: 'Not yet spotted', unlock: "You haven't seen this one yet. Spot it to unlock the card!",
  unlocked: 'Card unlocked!', spottedOn: 'Spotted on ', notEvaluated: 'Not yet evaluated by the IUCN.', onRedList: ' on the IUCN Red List.',
  back: 'Back', clearSearch: 'Clear search', photo: 'Photo', text: 'Text', autoNote: 'Fun fact, size, colours and habitat were written by Claude (AI) and may contain mistakes.', loading: 'Loading species…', loadError: "Couldn't load the species list. Check your connection.", retry: 'Try again', showMore: 'Show more', myPhotos: 'My photos', addPhoto: 'Add my photo', yourPhoto: 'Your photo', deletePhoto: 'Delete', close: 'Close', confirmDelete: 'Delete this photo?', photoLocal: 'Saved only on this phone. Adding a photo marks the species as spotted.', enlarge: 'Show photo full screen',
};
export type Labels = typeof en;

const es: Labels = {
  lang: 'es',
  greeting: '¡Hola! · Quintana Roo',
  homeTitle: '¿Qué descubrirás hoy?', searchPh: 'Busca una especie…', progressTitle: 'Tu colección', of: 'de', spottedWord: 'avistadas',
  byCat: 'Por categoría', recent: 'Avistadas recientemente', seeAll: 'Ver todo', tabHome: 'Inicio', tabCards: 'Cartas', tabCol: 'Colección',
  cardsTitle: 'Todas las cartas', all: 'Todas', spottedF: 'Avistadas', toFind: 'Por encontrar', filters: 'Filtros', origin: 'Origen', colour: 'Color', sort: 'Ordenar',
  any: 'Todos', number: 'Número', native: 'Nativa', introduced: 'Introducida', recentSort: 'Recientes',
  results: 'especies', clear: 'Limpiar filtros', empty: 'Ninguna especie coincide. Prueba otra búsqueda.', colTitle: 'Mi colección', colEmpty: 'Aún no hay cartas aquí. ¡Sal a explorar!', explore: 'Explorar cartas',
  fact: 'DATO CURIOSO', about: 'Acerca de', size: 'Tamaño', rarity: 'Rareza', status: 'Estado de conservación', colours: 'Colores', habitat: 'Hábitat', where: 'Dónde verlo',
  markSpotted: '¡Lo vi!', undo: 'Deshacer', notYet: 'Aún no lo has visto. Abajo tienes dónde buscarlo.',
  sizeShort: 'TAMAÑO', spotted: 'Avistado', notSpotted: 'Por descubrir', unlock: 'Aún no lo has visto. ¡Encuéntralo para desbloquear la carta!',
  unlocked: '¡Carta desbloqueada!', spottedOn: 'Avistado el ', notEvaluated: 'Aún no evaluada por la UICN.', onRedList: ' según la Lista Roja de la UICN.',
  back: 'Volver', clearSearch: 'Borrar búsqueda', photo: 'Foto', text: 'Texto', autoNote: 'El dato curioso, tamaño, colores y hábitat los escribió Claude (IA) y pueden tener errores.', loading: 'Cargando especies…', loadError: 'No se pudo cargar la lista de especies. Revisa tu conexión.', retry: 'Reintentar', showMore: 'Ver más', myPhotos: 'Mis fotos', addPhoto: 'Agregar mi foto', yourPhoto: 'Tu foto', deletePhoto: 'Borrar', close: 'Cerrar', confirmDelete: '¿Borrar esta foto?', photoLocal: 'Se guarda solo en este teléfono. Agregar una foto marca la especie como avistada.', enlarge: 'Ver foto en pantalla completa',
};

export const LABELS: Record<Lang, Labels> = { en, es };

/** Card numbers follow this order. Hue drives every category colour. */
export const CATS: { key: CatKey; en: string; es: string; one: [string, string]; h: number }[] = [
  { key: 'tree', en: 'Trees', es: 'Árboles', one: ['Tree', 'Árbol'], h: 140 },
  { key: 'plant', en: 'Plants & flowers', es: 'Plantas y flores', one: ['Plant', 'Planta'], h: 350 },
  { key: 'bird', en: 'Birds', es: 'Aves', one: ['Bird', 'Ave'], h: 185 },
  { key: 'mammal', en: 'Mammals', es: 'Mamíferos', one: ['Mammal', 'Mamífero'], h: 45 },
  { key: 'reptile', en: 'Reptiles & amphibians', es: 'Reptiles y anfibios', one: ['Reptile', 'Reptil'], h: 105 },
  { key: 'fish', en: 'Fish', es: 'Peces', one: ['Fish', 'Pez'], h: 250 },
  { key: 'marine', en: 'Other marine', es: 'Otros marinos', one: ['Marine', 'Marino'], h: 215 },
  { key: 'insect', en: 'Insects', es: 'Insectos', one: ['Insect', 'Insecto'], h: 305 },
];

export const catColours = (h: number) => ({
  col: `oklch(0.62 0.11 ${h})`,
  deep: `oklch(0.42 0.09 ${h})`,
  tint: `oklch(0.94 0.035 ${h})`,
  stripe: `oklch(0.87 0.05 ${h})`,
  /** Home "By category" count circle uses a slightly stronger tint. */
  tintStrong: `oklch(0.92 0.045 ${h})`,
});

export const COLOURS: Record<ColourKey, [string, string, string]> = {
  green: ['Green', 'Verde', 'oklch(0.6 0.12 145)'], brown: ['Brown', 'Café', 'oklch(0.5 0.07 60)'], yellow: ['Yellow', 'Amarillo', 'oklch(0.86 0.15 95)'],
  orange: ['Orange', 'Naranja', 'oklch(0.72 0.15 55)'], red: ['Red', 'Rojo', 'oklch(0.58 0.17 28)'], pink: ['Pink', 'Rosa', 'oklch(0.78 0.11 355)'],
  purple: ['Purple', 'Morado', 'oklch(0.55 0.13 310)'], blue: ['Blue', 'Azul', 'oklch(0.6 0.12 240)'], black: ['Black', 'Negro', 'oklch(0.25 0.01 60)'],
  white: ['White', 'Blanco', 'oklch(0.97 0.01 80)'], grey: ['Grey', 'Gris', 'oklch(0.65 0.01 70)'],
};
export const ANY_SWATCH = 'conic-gradient(oklch(0.6 0.12 145), oklch(0.86 0.15 95), oklch(0.58 0.17 28), oklch(0.6 0.12 240), oklch(0.6 0.12 145))';

export const HABITATS: Record<HabitatKey, [string, string]> = {
  jungle: ['Jungle', 'Selva'], coast: ['Coast & beach', 'Costa y playa'], mangrove: ['Mangrove', 'Manglar'], reef: ['Reef', 'Arrecife'],
  sea: ['Open sea', 'Mar abierto'], town: ['Towns & gardens', 'Pueblos y jardines'], cenote: ['Cenotes & lagoons', 'Cenotes y lagunas'],
};

export const IUCN: Record<Iucn, [string, string]> = {
  LC: ['Least concern', 'Preocupación menor'], NT: ['Near threatened', 'Casi amenazada'], VU: ['Vulnerable', 'Vulnerable'],
  EN: ['Endangered', 'En peligro'], CR: ['Critically endangered', 'En peligro crítico'], EW: ['Extinct in the wild', 'Extinta en estado silvestre'],
  EX: ['Extinct', 'Extinta'], NE: ['Not evaluated', 'No evaluada'], DD: ['Data deficient', 'Datos insuficientes'],
};
export const IUCN_SCALE: Iucn[] = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'];

export const RARITY: Record<Lang, string[]> = {
  en: ['Common', 'Uncommon', 'Rare', 'Legendary'],
  es: ['Común', 'Poco común', 'Rara', 'Legendaria'],
};

export const fmtDate = (iso: string, lang: Lang) =>
  new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
