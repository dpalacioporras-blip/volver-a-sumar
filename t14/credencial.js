// Credencial del formulario T-14: imagen de 1080×1920 para historias de Instagram.
// Todo se dibuja en el navegador con las tipografías de la página (Unbounded, Saira, IBM Plex Sans).
import { CENTROS, RESULTADOS } from "/t14/datos.js";

const W = 1080, H = 1920;
const C = {
  bg: "#1F2235", panel: "#282C44", line: "#3A3F5C",
  text: "#F1ECE2", soft: "#D3D1D9", muted: "#A9AEC4",
  warm: "#E0806C", cool: "#4FA3C7", sprout: "#7FC4B4",
};
const SITIO = "volverasumar.pandemoniumpodcast.com/t14";

export async function cargarFuentes() {
  if (!document.fonts || !document.fonts.load) return;
  const fuentes = [
    "800 60px Unbounded", "600 40px Saira", "500 30px Saira",
    '400 30px "IBM Plex Sans"', '500 30px "IBM Plex Sans"', '600 30px "IBM Plex Sans"', 'italic 400 30px "IBM Plex Sans"',
  ];
  await Promise.all(fuentes.map((f) => document.fonts.load(f).catch(() => null)));
}

// Generador pseudoaleatorio con semilla: el sello y el código de barras salen iguales cada vez.
function azar(semilla) {
  let s = (semilla >>> 0) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function espaciado(ctx, texto, x, y, esp, alinear = "left") {
  const letras = [...texto];
  const anchos = letras.map((l) => ctx.measureText(l).width);
  const total = anchos.reduce((a, b) => a + b, 0) + esp * (letras.length - 1);
  let cx = alinear === "center" ? x - total / 2 : alinear === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  letras.forEach((l, i) => { ctx.fillText(l, cx, y); cx += anchos[i] + esp; });
  ctx.textAlign = prev;
  return total;
}

function lineas(ctx, texto, ancho) {
  const palabras = String(texto).split(/\s+/);
  const out = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? actual + " " + p : p;
    if (ctx.measureText(prueba).width <= ancho || !actual) actual = prueba;
    else { out.push(actual); actual = p; }
  }
  if (actual) out.push(actual);
  return out;
}

// Ajusta el tamaño para que el texto quepa en un máximo de líneas.
function ajustar(ctx, texto, { peso, familia, tam, min, ancho, max }) {
  let t = tam, ls;
  do {
    ctx.font = `${peso} ${t}px ${familia}`;
    ls = lineas(ctx, texto, ancho);
    if (ls.length <= max && ls.every((l) => ctx.measureText(l).width <= ancho)) break;
    t -= 2;
  } while (t > min);
  return { tam: t, lineas: ls.slice(0, max) };
}

function rect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function etiqueta(ctx, texto, x, y, color = C.muted) {
  ctx.fillStyle = color;
  ctx.font = "500 21px Saira";
  espaciado(ctx, texto.toUpperCase(), x, y, 5);
}

function fondo(ctx) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  const h = ctx.createLinearGradient(0, 0, W, 0);
  h.addColorStop(0, "rgba(172,80,82,0.55)");
  h.addColorStop(0.45, "rgba(31,34,53,0)");
  h.addColorStop(0.55, "rgba(31,34,53,0)");
  h.addColorStop(1, "rgba(45,120,150,0.58)");
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, W, H);
  const v = ctx.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, "rgba(31,34,53,0)");
  v.addColorStop(0.38, "rgba(31,34,53,0.92)");
  v.addColorStop(0.75, "rgba(31,34,53,1)");
  v.addColorStop(1, "rgba(31,34,53,0.80)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function sello(ctx, { texto, sub, color, cx, cy, semilla, derecha }) {
  const off = document.createElement("canvas");
  const s = off.getContext("2d");
  s.font = "800 58px Unbounded";
  const w = Math.max(s.measureText(texto.toUpperCase()).width + 90, 380);
  const h = 170;
  off.width = w + 20; off.height = h + 20;
  s.translate(10, 10);
  s.strokeStyle = color; s.fillStyle = color;
  s.lineWidth = 6; rect(s, 3, 3, w - 6, h - 6, 12); s.stroke();
  s.lineWidth = 2; rect(s, 16, 16, w - 32, h - 32, 6); s.stroke();
  s.textBaseline = "alphabetic";
  s.textAlign = "center";
  s.font = "800 58px Unbounded";
  s.fillText(texto.toUpperCase(), w / 2, 92);
  s.font = "600 21px Saira";
  espaciado(s, sub.toUpperCase(), w / 2, 132, 4, "center");
  // Tinta gastada: pequeños huecos al azar.
  const r = azar(semilla);
  s.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 420; i++) {
    s.globalAlpha = 0.25 + r() * 0.6;
    s.beginPath();
    s.arc(r() * w, r() * h, 0.6 + r() * 2.4, 0, Math.PI * 2);
    s.fill();
  }
  ctx.save();
  ctx.translate(Math.min(cx, derecha - off.width / 2 + 4), cy);
  ctx.rotate(-0.13);
  ctx.globalAlpha = 0.93;
  ctx.drawImage(off, -off.width / 2, -off.height / 2);
  ctx.restore();
}

function barras(ctx, x, y, ancho, alto, semilla, texto) {
  const r = azar(semilla * 7919 + 17);
  ctx.fillStyle = "rgba(241,236,226,0.78)";
  let cx = x;
  while (cx < x + ancho) {
    const b = 2 + Math.floor(r() * 4);
    if (r() > 0.42) ctx.fillRect(cx, y, b, alto);
    cx += b + 1 + Math.floor(r() * 3);
  }
  ctx.fillStyle = C.muted;
  ctx.font = "500 20px Saira";
  espaciado(ctx, texto, x, y + alto + 30, 6);
}

function fechaCorta(iso) {
  const d = iso ? new Date(iso) : new Date();
  const f = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Bogota" });
  return f.format(d).replace(/\//g, ".");
}

// res: resultado devuelto por la función (categoria, centro, funcion, sector, nombre, pais, observacion, expediente, radicado_en)
export async function dibujarCredencial(res) {
  await cargarFuentes();
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";
  const espera = res.categoria === "ESPERA";
  const R = RESULTADOS[res.categoria];
  const num = Number(String(res.expediente || "").replace(/\D/g, "")) || 1;
  const fecha = fechaCorta(res.radicado_en);

  fondo(ctx);

  // Marca
  ctx.fillStyle = C.text;
  ctx.font = "600 30px Saira";
  const a = espaciado(ctx, "VOLVER A", 80, 160, 12);
  ctx.font = "800 38px Unbounded";
  ctx.fillText("SUMAR", 80 + a + 18, 162);
  ctx.fillStyle = C.cool;
  ctx.font = "500 24px Saira";
  espaciado(ctx, "MODELO T-14", 1000, 160, 7, "right");

  // Hoja
  const hx = 60, hy = 230, hw = 960, hh = 1350;
  ctx.save();
  ctx.shadowColor = "rgba(8,10,20,0.55)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  rect(ctx, hx, hy, hw, hh, 18);
  ctx.fillStyle = C.panel; ctx.fill();
  ctx.restore();
  rect(ctx, hx, hy, hw, hh, 18);
  ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
  ctx.save();
  rect(ctx, hx, hy, hw, hh, 18); ctx.clip();
  const franja = ctx.createLinearGradient(hx, 0, hx + hw, 0);
  franja.addColorStop(0, C.warm); franja.addColorStop(0.5, "#C9A2A2"); franja.addColorStop(1, C.cool);
  ctx.fillStyle = franja; ctx.fillRect(hx, hy, hw, 10);
  ctx.restore();

  const x0 = 120, ancho = 840;
  let y = 300;

  // Membrete
  ctx.fillStyle = C.muted;
  ctx.font = "500 20px Saira";
  espaciado(ctx, "ADMINISTRACIÓN CENTRAL DE PERÍMETROS ADMINISTRADOS", x0, y, 3.2);
  y += 36;
  ctx.font = "400 24px 'IBM Plex Sans'";
  ctx.fillText("Dirección de Ordenamiento Poblacional", x0, y);

  // Título del documento
  y += 84;
  ctx.fillStyle = C.text;
  const doc = R.documento.toUpperCase().split(" ");
  const titulo = [doc.slice(0, 2).join(" "), doc.slice(2).join(" ")];
  ctx.font = "800 56px Unbounded";
  titulo.forEach((t, i) => ctx.fillText(t, x0, y + i * 64));
  y += 64 + 56;
  ctx.fillStyle = C.cool;
  ctx.font = "500 25px Saira";
  espaciado(ctx, `FORMULARIO ÚNICO DE REUBICACIÓN · ${res.expediente}`, x0, y, 3);
  y += 28;
  ctx.fillStyle = C.line; ctx.fillRect(x0, y, ancho, 2);

  // Titular
  y += 58;
  etiqueta(ctx, "Titular", x0, y);
  const nom = ajustar(ctx, String(res.nombre).toUpperCase(), { peso: 800, familia: "Unbounded", tam: 50, min: 32, ancho, max: 2 });
  ctx.fillStyle = C.text;
  y += 14;
  nom.lineas.forEach((l) => { y += nom.tam + 10; ctx.fillText(l, x0, y); });

  if (!espera) {
    const centro = CENTROS[res.centro];
    y += 56;
    etiqueta(ctx, "Centro de Reunión", x0, y);
    const cen = ajustar(ctx, centro.nombre, { peso: 800, familia: "Unbounded", tam: 46, min: 32, ancho, max: 2 });
    ctx.fillStyle = C.text;
    y += 8;
    cen.lineas.forEach((l) => { y += cen.tam + 10; ctx.fillText(l, x0, y); });
    y += 46;
    ctx.fillStyle = C.soft; ctx.font = "500 30px 'IBM Plex Sans'";
    ctx.fillText(`Sede ${centro.sede}`, x0, y);

    // Función y sector
    y += 58;
    const yFila = y;
    etiqueta(ctx, "Función", x0, y);
    etiqueta(ctx, "Sector", x0 + 640, y);
    const fun = ajustar(ctx, res.funcion, { peso: 600, familia: "'IBM Plex Sans'", tam: 38, min: 28, ancho: 580, max: 3 });
    ctx.fillStyle = C.text;
    let yf = yFila + 6;
    fun.lineas.forEach((l) => { yf += fun.tam + 10; ctx.fillText(l, x0, yf); });
    ctx.fillStyle = res.categoria === "A" ? C.warm : C.cool;
    ctx.font = "600 128px Saira";
    ctx.fillText(String(res.sector).padStart(2, "0"), x0 + 632, yFila + 118);
    y = Math.max(yf, yFila + 118);

    y += 58;
    etiqueta(ctx, "Categoría", x0, y);
    y += 46;
    ctx.fillStyle = C.text; ctx.font = "500 30px 'IBM Plex Sans'";
    ctx.fillText(R.categoria, x0, y);
  } else {
    y += 56;
    etiqueta(ctx, "Estado", x0, y);
    y += 56;
    ctx.fillStyle = C.warm;
    const est = ajustar(ctx, "LISTA DE ESPERA ABIERTA", { peso: 800, familia: "Unbounded", tam: 44, min: 30, ancho, max: 1 });
    ctx.fillText(est.lineas[0], x0, y);

    y += 58;
    const yFila = y;
    etiqueta(ctx, "Perímetro de origen", x0, y);
    etiqueta(ctx, "Sector", x0 + 640, y);
    ctx.fillStyle = C.text; ctx.font = "600 36px 'IBM Plex Sans'";
    const pa = ajustar(ctx, res.pais, { peso: 600, familia: "'IBM Plex Sans'", tam: 36, min: 26, ancho: 580, max: 2 });
    let yp = yFila + 6;
    pa.lineas.forEach((l) => { yp += pa.tam + 10; ctx.fillText(l, x0, yp); });
    yp += 42;
    ctx.fillStyle = C.soft; ctx.font = "400 28px 'IBM Plex Sans'";
    ctx.fillText("Será desafectado", x0, yp);
    ctx.fillStyle = C.muted; ctx.font = "600 128px Saira";
    ctx.fillText("—", x0 + 632, yFila + 118);
    y = Math.max(yp, yFila + 118);

    y += 58;
    etiqueta(ctx, "Centro de Reunión · Función", x0, y);
    y += 46;
    ctx.fillStyle = C.text; ctx.font = "500 30px 'IBM Plex Sans'";
    ctx.fillText("Ninguno asignado · Ninguna registrada", x0, y);
  }

  // Observaciones o cita
  y += 56;
  if (!espera) {
    etiqueta(ctx, "Observaciones", x0, y);
    ctx.fillStyle = C.soft; ctx.font = "400 27px 'IBM Plex Sans'";
    const obs = lineas(ctx, res.observacion, 500);
    obs.slice(0, 2).forEach((l) => { y += 38; ctx.fillText(l, x0, y); });
  } else {
    y -= 8;
    ctx.fillStyle = C.text; ctx.font = "italic 400 34px 'IBM Plex Sans'";
    lineas(ctx, "Lo que nadie registra, nadie lo puede detener.", 820).forEach((l) => { y += 46; ctx.fillText(l, x0, y); });
  }

  // Código de barras y sello
  const yb = hy + hh - 128;
  barras(ctx, x0, yb, 400, 52, num, (res.expediente || "").replace("/", " · "));
  const colorSello = res.categoria === "A" ? C.sprout : res.categoria === "B" ? C.cool : C.warm;
  sello(ctx, {
    texto: R.sello,
    sub: espera ? `En espera · ${fecha}` : `Radicado · ${fecha}`,
    color: colorSello,
    cx: 778, cy: hy + hh - 104, derecha: hx + hw,
    semilla: num,
  });

  // Pie
  ctx.fillStyle = C.text;
  ctx.font = "800 40px Unbounded";
  ctx.textAlign = "center";
  ctx.fillText("¿TE ADMITIRÍAN?", W / 2, 1654);
  ctx.textAlign = "left";
  ctx.fillStyle = C.cool;
  ctx.font = "500 27px Saira";
  espaciado(ctx, SITIO.toUpperCase(), W / 2, 1700, 2.5, "center");
  ctx.fillStyle = C.muted;
  ctx.font = "400 24px 'IBM Plex Sans'";
  ctx.textAlign = "center";
  ctx.fillText("Volver a sumar · novela de Daniel Palacio P.", W / 2, 1742);
  ctx.textAlign = "left";

  return canvas;
}

export function nombreArchivo(res) {
  return `credencial-${String(res.expediente || "t14").replace(/\W+/g, "-").toLowerCase()}.png`;
}
