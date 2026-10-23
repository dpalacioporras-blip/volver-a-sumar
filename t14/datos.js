// Formulario único de reubicación · Modelo T-14
// Contenido y reglas del juego de asignación. Lo usan la página (/t14) y la función de Supabase "t14".
// Si cambias este archivo, copia el mismo archivo a supabase/functions/t14/datos.js y vuelve a publicar la función.
//
// Canon (biblia y capítulos 37 y 45):
// - Categoría A, traslado inmediato y financiado: personal esencial de medicina, ingeniería civil y energética,
//   saneamiento, agricultura certificada y seguridad. Incluye cónyuge y descendencia directa.
// - Categoría B, traslado autorizado con costo a cargo del solicitante, sin importar su oficio.
// - Lista de espera abierta: los demás. Ese nombre ("Categoría C") no aparece en ningún formulario.
// - El orden de la ventanilla: ocupación registrada → dependiente con ocupación de categoría uno → capacidad de pago.
// Decisiones del autor (23 oct 2026): sin cifras de población ni porcentajes, sin personajes ni trama;
// 14 preguntas; la solicitud se radica una sola vez; seguridad → Cuerpo de Seguridad de la Fertilidad.

export const CENTROS = {
  norteamerica: { nombre: "Norteamérica", de: "de Norteamérica", sede: "Chicago" },
  mesoamerica: { nombre: "Mesoamérica y el Caribe", de: "de Mesoamérica y el Caribe", sede: "Ciudad de Panamá" },
  suramerica: { nombre: "Suramérica", de: "de Suramérica", sede: "São Paulo" },
  europa_occidental: { nombre: "Europa Occidental", de: "de Europa Occidental", sede: "Lyon" },
  europa_oriental: { nombre: "Europa Oriental y Asia Central", de: "de Europa Oriental y Asia Central", sede: "Novosibirsk" },
  magreb: { nombre: "Magreb y Mediterráneo Oriental", de: "del Magreb y Mediterráneo Oriental", sede: "Konya" },
  africa_occidental: { nombre: "África Occidental", de: "de África Occidental", sede: "Lagos" },
  africa_oriental: { nombre: "África Oriental", de: "de África Oriental", sede: "Nairobi" },
  africa_austral: { nombre: "África Austral", de: "de África Austral", sede: "Bulawayo" },
  asia_occidental: { nombre: "Asia Occidental", de: "de Asia Occidental", sede: "Shiraz" },
  asia_meridional: { nombre: "Asia Meridional", de: "de Asia Meridional", sede: "Hyderabad" },
  asia_oriental: { nombre: "Asia Oriental", de: "de Asia Oriental", sede: "Chengdú" },
  sudeste_asiatico: { nombre: "Sudeste Asiático", de: "del Sudeste Asiático", sede: "Yakarta" },
  oceania: { nombre: "Oceanía", de: "de Oceanía", sede: "Adelaida" },
};

// Jurisdicción de residencia → Centro de Reunión que recibe a su perímetro (consolidación continental).
const POR_CENTRO = {
  suramerica: "AR Argentina|BO Bolivia|BR Brasil|CL Chile|CO Colombia|EC Ecuador|GF Guayana Francesa|GY Guyana|PY Paraguay|PE Perú|SR Surinam|UY Uruguay|VE Venezuela",
  mesoamerica: "AG Antigua y Barbuda|AW Aruba|BS Bahamas|BB Barbados|BZ Belice|CR Costa Rica|CU Cuba|CW Curazao|DM Dominica|SV El Salvador|GD Granada|GT Guatemala|HT Haití|HN Honduras|JM Jamaica|MX México|NI Nicaragua|PA Panamá|PR Puerto Rico|DO República Dominicana|KN San Cristóbal y Nieves|VC San Vicente y las Granadinas|LC Santa Lucía|TT Trinidad y Tobago",
  norteamerica: "CA Canadá|US Estados Unidos|GL Groenlandia",
  europa_occidental: "DE Alemania|AD Andorra|AT Austria|BE Bélgica|VA Ciudad del Vaticano|HR Croacia|DK Dinamarca|SI Eslovenia|ES España|FI Finlandia|FR Francia|IE Irlanda|IS Islandia|IT Italia|LI Liechtenstein|LU Luxemburgo|MT Malta|MC Mónaco|NO Noruega|NL Países Bajos|PT Portugal|GB Reino Unido|SM San Marino|SE Suecia|CH Suiza",
  europa_oriental: "AL Albania|BY Bielorrusia|BA Bosnia y Herzegovina|BG Bulgaria|CZ Chequia|SK Eslovaquia|EE Estonia|HU Hungría|KZ Kazajistán|KG Kirguistán|XK Kosovo|LV Letonia|LT Lituania|MK Macedonia del Norte|MD Moldavia|ME Montenegro|PL Polonia|RO Rumania|RU Rusia|RS Serbia|TJ Tayikistán|TM Turkmenistán|UA Ucrania|UZ Uzbekistán",
  magreb: "DZ Argelia|AM Armenia|CY Chipre|EG Egipto|GE Georgia|GR Grecia|IL Israel|JO Jordania|LB Líbano|LY Libia|MA Marruecos|MR Mauritania|PS Palestina|EH Sahara Occidental|SY Siria|TN Túnez|TR Turquía",
  africa_occidental: "BJ Benín|BF Burkina Faso|CV Cabo Verde|CM Camerún|TD Chad|CI Costa de Marfil|GA Gabón|GM Gambia|GH Ghana|GN Guinea|GQ Guinea Ecuatorial|GW Guinea-Bisáu|LR Liberia|ML Malí|NE Níger|NG Nigeria|CF República Centroafricana|CG República del Congo|ST Santo Tomé y Príncipe|SN Senegal|SL Sierra Leona|TG Togo",
  africa_oriental: "BI Burundi|KM Comoras|ER Eritrea|ET Etiopía|KE Kenia|CD República Democrática del Congo|RW Ruanda|SC Seychelles|SO Somalia|SD Sudán|SS Sudán del Sur|TZ Tanzania|UG Uganda|DJ Yibuti",
  africa_austral: "AO Angola|BW Botsuana|SZ Esuatini|LS Lesoto|MG Madagascar|MW Malaui|MU Mauricio|MZ Mozambique|NA Namibia|ZA Sudáfrica|ZM Zambia|ZW Zimbabue",
  asia_occidental: "AF Afganistán|SA Arabia Saudita|AZ Azerbaiyán|BH Baréin|QA Catar|AE Emiratos Árabes Unidos|IQ Irak|IR Irán|KW Kuwait|OM Omán|YE Yemen",
  asia_meridional: "BD Bangladés|BT Bután|IN India|MV Maldivas|NP Nepal|PK Pakistán|LK Sri Lanka",
  asia_oriental: "CN China|KP Corea del Norte|KR Corea del Sur|HK Hong Kong|JP Japón|MO Macao|MN Mongolia|TW Taiwán",
  sudeste_asiatico: "BN Brunéi|KH Camboya|PH Filipinas|ID Indonesia|LA Laos|MY Malasia|MM Myanmar|SG Singapur|TH Tailandia|TL Timor Oriental|VN Vietnam",
  oceania: "AU Australia|FJ Fiyi|MH Islas Marshall|SB Islas Salomón|KI Kiribati|FM Micronesia|NR Nauru|NZ Nueva Zelanda|PW Palaos|PG Papúa Nueva Guinea|WS Samoa|TO Tonga|TV Tuvalu|VU Vanuatu",
};

// [código, nombre, centro], en orden alfabético.
export const PAISES = Object.entries(POR_CENTRO)
  .flatMap(([centro, lista]) => lista.split("|").map((p) => [p.slice(0, 2), p.slice(3), centro]))
  .sort((a, b) => a[1].localeCompare(b[1], "es"));

export function paisPorCodigo(codigo) {
  return PAISES.find((p) => p[0] === codigo) ?? null;
}

// Ocupación registrada. "esencial" = categoría uno. "sectores" aplica la fórmula de vivienda del libro:
// rol laboral + tamaño de la familia + «proximidad funcional a la infraestructura crítica»
// (los trabajos que nadie quiere viven cerca de lo que nadie quiere tener cerca).
export const OFICIOS = {
  medicina: { texto: "Medicina o atención en salud", corto: "Salud", esencial: true, funcion: "Medicina", sectores: [1, 2] },
  ingenieria: { texto: "Ingeniería civil, eléctrica o energética", corto: "Ingeniería", esencial: true, funcion: "Ingeniería civil y energética", sectores: [6, 7, 8] },
  saneamiento: { texto: "Agua, saneamiento, aseo o mantenimiento", corto: "Saneamiento", esencial: true, funcion: "Sanidad y Mantenimiento", sectores: [4, 9, 11] },
  agricultura: { texto: "Agricultura o producción de alimentos", corto: "Agricultura", esencial: true, funcion: "Agricultura certificada", sectores: [10, 12] },
  seguridad: { texto: "Policía, fuerzas armadas o seguridad", corto: "Seguridad", esencial: true, funcion: "Cuerpo de Seguridad de la Fertilidad", sectores: [2, 3, 5] },
  educacion: { texto: "Educación", corto: "Educación", esencial: false },
  comunicacion: { texto: "Comunicación, artes o cultura", corto: "Comunicación y cultura", esencial: false },
  tecnologia: { texto: "Tecnología o ciencia", corto: "Tecnología y ciencia", esencial: false },
  administracion: { texto: "Comercio, administración o finanzas", corto: "Comercio y administración", esencial: false },
  oficios: { texto: "Construcción, transporte u otro oficio técnico", corto: "Oficio técnico", esencial: false },
  otra: { texto: "Otra ocupación", corto: "Ocupación no prioritaria", esencial: false },
  ninguna: { texto: "Estudiante, hogar o sin ocupación remunerada", corto: "Sin ocupación registrada", esencial: false },
};

const SECTORES_FAMILIA = [4, 5, 6];
const SECTORES_PAGO = [3, 4, 5];

const op = (id, texto) => ({ id, texto });

export const SECCIONES = [
  "I. Identificación del solicitante",
  "II. Ocupación",
  "III. Núcleo familiar",
  "IV. Situación económica",
  "V. Declaraciones",
];

export const PREGUNTAS = [
  { id: "nombre", seccion: 0, tipo: "texto", texto: "Nombre completo del solicitante", ayuda: "Así aparecerá en su credencial." },
  { id: "pais", seccion: 0, tipo: "pais", texto: "Jurisdicción de residencia", ayuda: "Determina el Centro de Reunión que recibe a su perímetro." },
  { id: "edad", seccion: 0, tipo: "opciones", texto: "Rango de edad", opciones: [
    op("18-29", "De 18 a 29 años"), op("30-44", "De 30 a 44 años"), op("45-59", "De 45 a 59 años"), op("60+", "60 años o más"),
  ] },
  { id: "oficio", seccion: 1, tipo: "opciones", texto: "Ocupación registrada", ayuda: "Seleccione la que ejerce hoy.",
    opciones: Object.entries(OFICIOS).map(([id, o]) => op(id, o.texto)) },
  { id: "acredita", seccion: 1, tipo: "opciones", texto: "¿Puede acreditar su ocupación con título, tarjeta profesional o certificado vigente?", opciones: [
    op("si", "Sí, con documento vigente"), op("tramite", "Está en trámite"), op("no", "No"),
  ] },
  { id: "anios", seccion: 1, tipo: "opciones", texto: "Años de ejercicio de la ocupación", opciones: [
    op("0-2", "Menos de 2"), op("2-10", "Entre 2 y 10"), op("10+", "Más de 10"),
  ] },
  { id: "conyuge", seccion: 2, tipo: "opciones", texto: "¿Tiene cónyuge o compañero permanente?", opciones: [
    op("si", "Sí"), op("no", "No"),
  ] },
  { id: "dependientes", seccion: 2, tipo: "opciones", texto: "Dependientes a cargo", opciones: [
    op("0", "Ninguno"), op("1", "1"), op("2", "2"), op("3+", "3 o más"),
  ] },
  { id: "familiar", seccion: 2, tipo: "opciones", texto: "¿Su cónyuge o alguno de sus dependientes ejerce una ocupación de categoría uno?",
    ayuda: "Medicina, ingeniería de infraestructura, agua y saneamiento, agricultura certificada o cuerpos de seguridad, con documento vigente.", opciones: [
    op("si", "Sí, y la puede acreditar"), op("no", "No"), op("na", "No aplica"),
  ] },
  { id: "prevision", seccion: 3, tipo: "opciones", texto: "¿Cuenta con cobertura previsional vigente?", ayuda: "Pensión o seguridad social.", opciones: [
    op("si", "Sí"), op("no", "No"), op("ns", "No sabe"),
  ] },
  { id: "pago", seccion: 3, tipo: "opciones", texto: "¿Puede cubrir el transporte, los trámites, la cuota de reasentamiento y los primeros noventa días de alojamiento?",
    ayuda: "Con recursos propios o con su cobertura previsional.", opciones: [
    op("total", "Sí, en su totalidad"), op("parcial", "Solo una parte"), op("no", "No"),
  ] },
  { id: "plantas", seccion: 4, tipo: "opciones", texto: "¿Mantiene plantas ornamentales en su domicilio?", ayuda: "El riego ornamental está racionado.", opciones: [
    op("si", "Sí"), op("no", "No"),
  ] },
  { id: "grupos", seccion: 4, tipo: "opciones", texto: "¿Ha participado en reuniones o grupos que cuestionen la Decisión?", opciones: [
    op("no", "No"), op("si", "Sí"), op("nr", "Prefiere no responder"),
  ] },
  { id: "traslado", seccion: 4, tipo: "opciones", texto: "Disponibilidad para el traslado", opciones: [
    op("inmediata", "Inmediata"), op("30", "Dentro de treinta días"), op("mas", "Necesita más tiempo"),
  ] },
];

export const NOMBRE_MAX = 60;

// Devuelve un mensaje de error o null.
export function validar(r) {
  if (!r || typeof r !== "object") return "Respuestas inválidas";
  for (const p of PREGUNTAS) {
    const v = r[p.id];
    if (typeof v !== "string") return `Falta la respuesta: ${p.texto}`;
    if (p.tipo === "texto") {
      const t = v.trim();
      if (t.length < 1 || t.length > NOMBRE_MAX) return "El nombre debe tener entre 1 y 60 caracteres";
    } else if (p.tipo === "pais") {
      if (!paisPorCodigo(v)) return "Jurisdicción no reconocida";
    } else if (!p.opciones.some((o) => o.id === v)) {
      return `Respuesta no válida: ${p.texto}`;
    }
  }
  return null;
}

// Copia limpia con solo las claves del formulario.
export function limpiar(r) {
  const out = {};
  for (const p of PREGUNTAS) out[p.id] = p.tipo === "texto" ? String(r[p.id]).trim().replace(/\s+/g, " ") : r[p.id];
  return out;
}

export function textoRespuesta(p, v) {
  if (p.tipo === "texto") return v;
  if (p.tipo === "pais") return paisPorCodigo(v)?.[1] ?? v;
  return p.opciones.find((o) => o.id === v)?.texto ?? v;
}

// Resultado de la ventanilla. "semilla" (el id del registro) reparte el sector dentro del rango de cada función.
export function resolver(r, semilla) {
  const oficio = OFICIOS[r.oficio];
  const pais = paisPorCodigo(r.pais);
  const tieneFamilia = r.conyuge === "si" || r.dependientes !== "0";
  const acreditada = r.acredita === "si";
  const familiarEsencial = r.familiar === "si" && tieneFamilia;
  const anotaciones = [];

  let categoria, via, funcion = null, sectores = null;
  if (oficio.esencial && acreditada) {
    categoria = "A"; via = "oficio"; funcion = oficio.funcion; sectores = oficio.sectores;
  } else if (familiarEsencial) {
    categoria = "A"; via = "familia"; funcion = "Núcleo familiar de personal esencial"; sectores = SECTORES_FAMILIA;
  } else if (r.pago === "total") {
    categoria = "B"; via = "pago"; sectores = SECTORES_PAGO;
    funcion = `${oficio.corto} · sin prioridad`;
  } else {
    categoria = "ESPERA"; via = null;
  }

  // Anotaciones del funcionario: no cambian la categoría, solo la explican.
  if (oficio.esencial && !acreditada) {
    anotaciones.push(r.acredita === "tramite"
      ? "Su ocupación figura entre las prioritarias, pero no se admiten acreditaciones en trámite."
      : "Su ocupación figura entre las prioritarias, pero no la acreditó.");
  }
  if (r.familiar === "si" && !tieneFamilia) {
    anotaciones.push("Declaró un familiar de categoría uno sin declarar cónyuge ni dependientes. La declaración no se tuvo en cuenta.");
  }
  if (categoria === "A" && r.dependientes !== "0") {
    anotaciones.push("La admisión incluye al cónyuge y a la descendencia directa. Los demás dependientes deben presentar su propia solicitud.");
  }
  if (categoria === "ESPERA") {
    if (r.prevision === "si" && r.pago !== "total") anotaciones.push("Su cobertura previsional no alcanza para cubrir los costos del traslado.");
    if (r.pago === "parcial") anotaciones.push("El pago parcial no habilita un traslado con costo a cargo del solicitante.");
    if (tieneFamilia) anotaciones.push("Su núcleo familiar queda en la misma lista.");
    if (r.plantas === "si") anotaciones.push("Sus plantas se quedan con usted. El agua, no.");
  } else {
    if (r.plantas === "si") anotaciones.push("Las plantas ornamentales no se incluyen en el traslado.");
    if (r.traslado === "mas") anotaciones.push("La fecha de traslado no admite prórroga.");
  }

  let observacion = "Ninguna.";
  if (r.grupos === "si") observacion = "Remitida al Cuerpo de Seguridad de la Fertilidad para verificación.";
  else if (r.grupos === "nr") observacion = "Sección V incompleta.";

  const n = Math.abs(Number(semilla) || 0);
  const dep = { "0": 0, "1": 1, "2": 2, "3+": 3 }[r.dependientes] ?? 0;
  const sector = sectores ? sectores[(n + dep) % sectores.length] : null;
  const centro = categoria === "ESPERA" ? null : pais[2];

  return {
    nombre: r.nombre,
    categoria,
    via,
    centro,
    pais: pais[1],
    funcion,
    sector,
    observacion,
    anotaciones,
  };
}

export function expedienteDe(id) {
  return `T-14/${String(id).padStart(6, "0")}`;
}

// Textos del resultado, compartidos por la página y los correos.
export const RESULTADOS = {
  A: {
    estado: "Solicitud resuelta favorablemente",
    sello: "Admitido",
    categoria: "Categoría A · Traslado inmediato y financiado",
    documento: "Credencial de reubicación",
  },
  B: {
    estado: "Traslado autorizado",
    sello: "Autorizado",
    categoria: "Categoría B · Costo a cargo del solicitante",
    documento: "Credencial de reubicación",
  },
  ESPERA: {
    estado: "No asignado",
    sello: "No asignado",
    categoria: "Lista de espera abierta",
    documento: "Constancia de solicitud",
  },
};

export function explicacion(res) {
  if (res.categoria === "A" && res.via === "oficio") return [
    "Su ocupación figura entre las que el Centro necesita para sostenerse. La Administración cubre el traslado y lo hace de inmediato.",
    "Preséntese en el punto de control de traslado con esta credencial.",
  ];
  if (res.categoria === "A") return [
    "Su ocupación no califica por sí sola, pero su núcleo familiar incluye personal esencial. La admisión cubre al cónyuge y a la descendencia directa.",
    "Preséntese con su familiar en el punto de control de traslado.",
  ];
  if (res.categoria === "B") return [
    "Su ocupación no figura entre las prioritarias. Su capacidad de pago sí.",
    "El cupo queda reservado mientras acredite el pago del transporte, los trámites, la cuota de reasentamiento y los primeros noventa días de alojamiento.",
  ];
  return [
    "Su solicitud fue recibida y quedó en lista de espera abierta. La lista no tiene fecha de cierre, ni turno, ni respuesta prevista.",
    "Su perímetro de residencia será desafectado. Se retiran el agua, la energía, el transporte y la atención médica. Con los servicios se van también las cámaras, los controles y los conteos.",
    "Fuera del perímetro nadie lo va a registrar. Y lo que nadie registra, nadie lo puede detener.",
  ];
}

export function textoCompartir(res) {
  if (res.categoria === "ESPERA") return "No me asignaron. Quedé en lista de espera abierta, fuera del perímetro. ¿A ti te admitirían?";
  const c = CENTROS[res.centro];
  return `Me asignaron al Centro de Reunión ${c.de}, sector ${res.sector}: ${res.funcion}. ¿A ti te admitirían?`;
}
