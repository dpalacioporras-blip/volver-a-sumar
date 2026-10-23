// Formulario único de reubicación · Modelo T-14
// Contenido y reglas del juego de asignación. Lo usan la página (/t14) y la función de Supabase "t14".
// Si cambias este archivo, copia el mismo archivo a supabase/functions/t14/datos.js y vuelve a publicar la función.
//
// Canon (biblia y capítulos 37 y 45):
// - Categoría A, traslado inmediato y financiado: personal esencial de medicina, ingeniería civil y energética,
//   saneamiento, agricultura certificada y seguridad.
// - Categoría B, traslado autorizado con costo a cargo del solicitante, sin importar su oficio.
// - Lista de espera abierta: los demás. Ese nombre ("Categoría C") no aparece en ningún formulario.
// Decisiones del autor (23 oct 2026): sin cifras de población ni porcentajes, sin personajes ni trama;
// la solicitud se radica una sola vez; seguridad → Cuerpo de Seguridad de la Fertilidad;
// 8 preguntas hipotéticas (qué harías si…), no datos personales; cerca de la mitad asignados (no tiene que ser exacto).

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

// Funciones del Centro. "sectores" aplica la fórmula de vivienda del libro: rol laboral +
// «proximidad funcional a la infraestructura crítica» (los trabajos que nadie quiere viven cerca de lo que nadie quiere tener cerca).
export const FUNCIONES = {
  med: { funcion: "Medicina", sectores: [1, 2] },
  ing: { funcion: "Ingeniería civil y energética", sectores: [6, 7, 8] },
  san: { funcion: "Sanidad y Mantenimiento", sectores: [4, 9, 11] },
  agr: { funcion: "Agricultura certificada", sectores: [10, 12] },
  seg: { funcion: "Cuerpo de Seguridad de la Fertilidad", sectores: [2, 3, 5] },
};
const SECTORES_PAGO = [3, 4, 5];

// Cada opción suma puntos (no se muestran): med, ing, san, agr, seg = funciones; afuera = no se deja ordenar;
// paga = acepta pagar el traslado.
const op = (id, texto, p = {}) => ({ id, texto, p });

export const PREGUNTAS = [
  { id: "luz", texto: "Se va la luz en todo el barrio por tres días. ¿Qué hace primero?", opciones: [
    op("tablero", "Busco la falla en el tablero", { ing: 2 }),
    op("casas", "Voy casa por casa a ver si alguien está enfermo", { med: 2 }),
    op("agua", "Saco el agua guardada y organizo turnos", { san: 2 }),
    op("tienda", "Cuido que nadie saquee la tienda", { seg: 2 }),
    op("dormir", "Me voy a dormir. Mañana será otro día", { afuera: 1 }),
  ] },
  { id: "maleta", texto: "Solo puede llevar una maleta al traslado. ¿Qué no puede faltar?", opciones: [
    op("herramientas", "Herramientas", { ing: 2 }),
    op("botiquin", "Un botiquín", { med: 2 }),
    op("filtro", "Un filtro de agua", { san: 2 }),
    op("semillas", "Semillas", { agr: 2 }),
    op("fotos", "Fotos y cartas", { afuera: 1 }),
  ] },
  { id: "ventanilla", texto: "La ventanilla le ofrece un cupo a cambio de todo lo que tiene de valor.", opciones: [
    op("entrego", "Lo entrego sin pensarlo", { paga: 1 }),
    op("negocio", "Intento negociar"),
    op("niego", "Me niego", { afuera: 1 }),
  ] },
  { id: "cupo", texto: "El cupo es solo para usted. Su familia queda en lista de espera.", opciones: [
    op("tomo", "Lo tomo. Después veré cómo sacarlos"),
    op("quedo", "Me quedo con ellos", { afuera: 1 }),
    op("cedo", "Se lo cedo a otra persona", { afuera: 1, med: 1 }),
  ] },
  { id: "planta", texto: "Encuentra una planta reventando el concreto, en un lugar donde nadie la riega.", opciones: [
    op("reporto", "La reporto", { seg: 1 }),
    op("riego", "La riego en secreto", { agr: 2 }),
    op("dejo", "La dejo en paz y no le digo a nadie", { afuera: 1 }),
  ] },
  { id: "vecino", texto: "Un vecino le cuenta que en el perímetro desafectado todavía vive gente.", opciones: [
    op("reporto", "Lo reporto", { seg: 1 }),
    op("voy", "Voy a ver con mis propios ojos", { afuera: 1 }),
    op("callo", "No digo nada"),
  ] },
  { id: "fila", texto: "En la fila del traslado, alguien se cuela con un niño enfermo.", opciones: [
    op("paso", "Lo dejo pasar", { med: 1 }),
    op("guardia", "Llamo al guardia", { seg: 1 }),
    op("turno", "Le cedo mi turno y me voy", { afuera: 1 }),
  ] },
  { id: "turno", texto: "En el Centro le piden escoger un turno de trabajo. ¿Cuál pide?", opciones: [
    op("tanques", "Limpiar los tanques de agua", { san: 2 }),
    op("red", "Reparar la red eléctrica", { ing: 2 }),
    op("cultivo", "Cultivar bajo techo", { agr: 2 }),
    op("reparto", "Vigilar el reparto", { seg: 2 }),
    op("clinica", "Atender en la clínica", { med: 2 }),
  ] },
];

// Reglas calibradas con simulación (scripts de prueba): con respuestas al azar, cerca de la mitad queda asignada.
export const UMBRAL_AFUERA = 3;   // desde aquí, la persona no se deja ordenar: lista de espera…
export const UMBRAL_VOCACION = 5; // …salvo que su vocación por una función sea así de fuerte
export const UMBRAL_FUNCION = 4;  // puntos mínimos para que una función sea imprescindible (Categoría A)

export const NOMBRE_MAX = 60;

// Devuelve un mensaje de error o null.
export function validar(r) {
  if (!r || typeof r !== "object") return "Respuestas inválidas";
  if (typeof r.nombre !== "string" || r.nombre.trim().length < 1 || r.nombre.trim().length > NOMBRE_MAX) return "El nombre debe tener entre 1 y 60 caracteres";
  if (typeof r.pais !== "string" || !paisPorCodigo(r.pais)) return "Jurisdicción no reconocida";
  for (const p of PREGUNTAS) {
    if (!p.opciones.some((o) => o.id === r[p.id])) return `Respuesta no válida: ${p.texto}`;
  }
  return null;
}

// Copia limpia con solo las claves del formulario.
export function limpiar(r) {
  const out = { nombre: String(r.nombre).trim().replace(/\s+/g, " "), pais: r.pais };
  for (const p of PREGUNTAS) out[p.id] = r[p.id];
  return out;
}

export function textoRespuesta(p, v) {
  return p.opciones.find((o) => o.id === v)?.texto ?? v;
}

export function puntaje(r) {
  const t = { med: 0, ing: 0, san: 0, agr: 0, seg: 0, afuera: 0, paga: 0 };
  for (const p of PREGUNTAS) {
    const o = p.opciones.find((x) => x.id === r[p.id]);
    if (o) for (const [k, v] of Object.entries(o.p)) t[k] += v;
  }
  return t;
}

const DE_TURNO = { tanques: "san", red: "ing", cultivo: "agr", reparto: "seg", clinica: "med" };

// Resultado de la ventanilla. "semilla" (el id del registro) reparte el sector dentro del rango de cada función.
export function resolver(r, semilla) {
  const pais = paisPorCodigo(r.pais);
  const t = puntaje(r);
  // Función dominante; en empate decide el turno que pidió (pregunta 8).
  const orden = ["med", "ing", "san", "agr", "seg"].sort((a, b) =>
    (t[b] - t[a]) || ((DE_TURNO[r.turno] === b) - (DE_TURNO[r.turno] === a)));
  const top = orden[0];

  let categoria, via, funcion = null, sectores = null;
  if (t.afuera >= UMBRAL_AFUERA && t[top] < UMBRAL_VOCACION) {
    categoria = "ESPERA"; via = "afuera";
  } else if (t[top] >= UMBRAL_FUNCION) {
    categoria = "A"; via = "funcion"; funcion = FUNCIONES[top].funcion; sectores = FUNCIONES[top].sectores;
  } else if (t.paga > 0) {
    categoria = "B"; via = "pago"; funcion = "Por asignar · sin prioridad"; sectores = SECTORES_PAGO;
  } else {
    categoria = "ESPERA"; via = "sin_funcion";
  }
  const espera = categoria === "ESPERA";

  // Anotaciones del funcionario: no cambian el resultado, lo comentan.
  const a = [];
  if (r.ventanilla === "negocio") a.push("La ventanilla no negocia.");
  if (r.cupo === "tomo" && !espera) a.push("Su núcleo familiar queda en lista de espera.");
  if (r.cupo === "quedo") a.push("Su núcleo familiar queda en la misma lista que usted.");
  if (r.cupo === "cedo") a.push("Cedió su cupo. La cesión no se registra a nombre de nadie.");
  if (r.planta === "riego") a.push(espera ? "Sus plantas se quedan con usted. El agua, no." : "El riego ornamental está racionado. La planta no se incluye en el traslado.");
  if (r.planta === "reporto") a.push("Su reporte de vegetación no autorizada fue recibido.");
  if (r.maleta === "fotos") a.push("Los objetos personales no figuran en el inventario del traslado.");
  if (r.fila === "guardia") a.push("El incidente en la fila quedó registrado.");
  const anotaciones = a.slice(0, 3);

  let observacion = "Ninguna.";
  if (r.vecino === "voy") observacion = "Contacto declarado con perímetro desafectado. Remitida al Cuerpo de Seguridad de la Fertilidad.";
  else if (r.vecino === "reporto") observacion = "Informante voluntario.";

  const n = Math.abs(Number(semilla) || 0);
  const sector = sectores ? sectores[n % sectores.length] : null;

  return {
    nombre: r.nombre,
    categoria,
    via,
    centro: espera ? null : pais[2],
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
  if (res.categoria === "A") return [
    `La ventanilla evaluó sus respuestas. El Centro necesita a alguien como usted en ${res.funcion}. La Administración cubre el traslado y lo hace de inmediato.`,
    "Preséntese en el punto de control de traslado con esta credencial.",
  ];
  if (res.categoria === "B") return [
    "Ninguna de sus respuestas lo vuelve imprescindible. Su disposición a pagar, sí.",
    "El cupo queda reservado mientras acredite el pago del transporte, los trámites, la cuota de reasentamiento y los primeros noventa días de alojamiento. La función se le asignará al llegar.",
  ];
  const cola = [
    "Su perímetro de residencia será desafectado. Se retiran el agua, la energía, el transporte y la atención médica. Con los servicios se van también las cámaras, los controles y los conteos.",
    "Fuera del perímetro nadie lo va a registrar. Y lo que nadie registra, nadie lo puede detener.",
  ];
  if (res.via === "afuera") return [
    "Sus respuestas no son las de alguien que espera turno. La ventanilla lo anotó en lista de espera abierta, y usted no va a volver a preguntar.",
    ...cola,
  ];
  return [
    "La ventanilla no encontró en sus respuestas una función que el Centro necesite, ni una oferta de pago. Su solicitud quedó en lista de espera abierta: sin fecha de cierre, sin turno, sin respuesta prevista.",
    ...cola,
  ];
}

export const INSTAGRAM = "@IDanielPanda";

export function textoCompartir(res) {
  const cola = `¿A ti te admitirían? ${INSTAGRAM} #VolverASumar`;
  if (res.categoria === "ESPERA") return `No me asignaron. Quedé en lista de espera abierta, fuera del perímetro. ${cola}`;
  const c = CENTROS[res.centro];
  return `Me asignaron al Centro de Reunión ${c.de}, sector ${res.sector}: ${res.funcion}. ${cola}`;
}
