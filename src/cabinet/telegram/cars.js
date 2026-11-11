// Makes and models common in Uzbekistan, used for autocomplete suggestions only.
// Any other make or model can still be typed freely.
export const carCatalog = {
  Chevrolet: ['Damas', 'Labo', 'Matiz', 'Spark', 'Nexia', 'Nexia 3', 'Cobalt', 'Lacetti', 'Gentra', 'Malibu', 'Malibu 2', 'Tracker', 'Tracker 2', 'Captiva', 'Equinox', 'Onix', 'Monza', 'Orlando', 'Epica', 'Trailblazer', 'Traverse', 'Tahoe'],
  Daewoo: ['Tico', 'Damas', 'Labo', 'Matiz', 'Nexia', 'Lacetti', 'Gentra', 'Espero'],
  Ravon: ['R2', 'R3', 'R4', 'Nexia R3', 'Gentra'],
  Kia: ['K5', 'K8', 'Sonet', 'Seltos', 'Sportage', 'Sorento', 'Carnival', 'Cerato', 'Rio', 'EV6'],
  Hyundai: ['Accent', 'Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Creta', 'Palisade', 'Staria'],
  Toyota: ['Camry', 'Corolla', 'RAV4', 'Land Cruiser', 'Land Cruiser Prado', 'Highlander', 'Hilux', 'Yaris'],
  BYD: ['Song Plus', 'Han', 'Chazor', 'Seal', 'Tang', 'Qin Plus', 'Yuan Plus', 'Destroyer 05', 'Seagull', 'Dolphin'],
  Chery: ['Tiggo 4', 'Tiggo 4 Pro', 'Tiggo 7', 'Tiggo 7 Pro', 'Tiggo 8', 'Tiggo 8 Pro', 'Arrizo 6', 'Arrizo 8'],
  Haval: ['Jolion', 'H6', 'Dargo', 'F7', 'M6'],
  Geely: ['Coolray', 'Monjaro', 'Atlas', 'Tugella', 'Emgrand'],
  Changan: ['CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'UNI-K', 'UNI-T', 'Alsvin'],
  Jetour: ['X70', 'X90', 'Dashing'],
  Lada: ['Granta', 'Vesta', 'Niva', 'Niva Travel', 'Largus', '2107'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLS', 'Sprinter'],
  BMW: ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7'],
  Lexus: ['ES', 'RX', 'LX', 'NX', 'GX'],
  Volkswagen: ['Polo', 'Jetta', 'Passat', 'Tiguan', 'ID.4', 'ID.6'],
  Nissan: ['Almera', 'Qashqai', 'X-Trail', 'Patrol'],
  Honda: ['Civic', 'Accord', 'CR-V'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
  Zeekr: ['001', '007', 'X'],
  'Li Auto': ['L7', 'L8', 'L9'],
  Isuzu: ['NPR', 'D-Max'],
};

const makes = Object.keys(carCatalog);
const normalize = value => (value || '').toLowerCase().replace(/[\s-]+/g, '');

function rank(label, query) {
  const a = normalize(label); const q = normalize(query);
  if (!q) return -1;
  if (a.startsWith(q)) return 0;
  return a.includes(q) ? 1 : -1;
}

// Suggestions for the "Markasi" field. Typing a model name also suggests it ("dam" -> Damas · Chevrolet),
// so choosing it fills both fields at once.
export function makeSuggestions(query, limit = 6) {
  const byMake = makes.map(make => ({ make, model: '', label: make, hint: '', score: rank(make, query) })).filter(item => item.score >= 0);
  const byModel = makes.flatMap(make => carCatalog[make].map(model => ({ make, model, label: model, hint: make, score: rank(model, query) + 0.5 }))).filter(item => item.score >= 0.5);
  return [...byMake, ...byModel].sort((a, b) => a.score - b.score || a.label.localeCompare(b.label)).slice(0, limit);
}

// Suggestions for the "Modeli" field, narrowed to the chosen make when it is known.
export function modelSuggestions(query, make, limit = 6) {
  const known = makes.find(item => normalize(item) === normalize(make));
  const pool = known ? carCatalog[known].map(model => ({ make: known, model })) : makes.flatMap(item => carCatalog[item].map(model => ({ make: item, model })));
  return pool.map(item => ({ ...item, label: item.model, hint: known ? '' : item.make, score: query ? rank(item.model, query) : 0 }))
    .filter(item => item.score >= 0).sort((a, b) => a.score - b.score).slice(0, limit);
}
