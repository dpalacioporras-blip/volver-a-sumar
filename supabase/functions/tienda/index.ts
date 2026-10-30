// Tienda de Volver a sumar: pagos con Wompi y descargas personalizadas.
//
// POST (JSON, desde las páginas /comprar, /comprar/gracias y /descargas):
//   info       { t? }                          → precios, fechas y, con enlace personal, el titular
//   crear      { nombre, correo, acepta, t? }  → crea el pedido y devuelve la URL del checkout de Wompi
//   estado     { referencia?, id? }            → consulta la transacción en Wompi y actualiza el pedido
//   descargas  { d }                           → archivos disponibles para un enlace de descarga
// POST de Wompi (evento "transaction.updated", firmado con el secreto de eventos).
// GET ?d=<token>&f=epub|pdf → genera (la primera vez) el archivo marcado y redirige a la descarga.
//
// Secretos: WOMPI_PUBLIC_KEY, WOMPI_INTEGRITY_SECRET, WOMPI_EVENTS_SECRET, BREVO_API_KEY, SENDER_EMAIL.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { type Comprador, marcarEpub, marcarPdf } from "./marca.ts";

const WOMPI_PUBLIC_KEY = Deno.env.get("WOMPI_PUBLIC_KEY") ?? "";
const WOMPI_INTEGRITY_SECRET = Deno.env.get("WOMPI_INTEGRITY_SECRET") ?? "";
const WOMPI_EVENTS_SECRET = Deno.env.get("WOMPI_EVENTS_SECRET") ?? "";
const WOMPI_API = WOMPI_PUBLIC_KEY.startsWith("pub_test_") ? "https://sandbox.wompi.co/v1" : "https://production.wompi.co/v1";
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") ?? "tvpandemonium@gmail.com";
const SENDER_NAME = Deno.env.get("SENDER_NAME") ?? "Daniel Palacio P. · Volver a sumar";
const SITE = Deno.env.get("T14_SITE_URL") ?? "https://volverasumar.pandemoniumpodcast.com";
const CONTACTO = "tvpandemonium@gmail.com";
const BUCKET = "libro";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const ARCHIVOS = {
  epub: { origen: "originales/volver-a-sumar.epub", nombre: "Volver a sumar - Daniel Palacio P.epub", titulo: "Novela · EPUB", marca: "epub" },
  pdf: { origen: "originales/volver-a-sumar.pdf", nombre: "Volver a sumar - Daniel Palacio P.pdf", titulo: "Novela · PDF", marca: "pdf" },
} as const;
type ClaveArchivo = keyof typeof ARCHIVOS;

const ORIGENES = [
  /^https:\/\/volverasumar\.pandemoniumpodcast\.com$/,
  /^https:\/\/volver-a-sumar[a-z0-9-]*\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DE_PRUEBA = /@example\.(com|org|net)$/i;

function cabeceras(req: Request) {
  const origen = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.some((r) => r.test(origen)) ? origen : SITE,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

async function sha256(texto: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function pesos(n: number) {
  return "$" + n.toLocaleString("es-CO").replace(/,/g, ".");
}

function fechaLarga(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }).format(new Date(iso));
}

// ---------- Configuración ----------

async function config() {
  const { data } = await db.from("tienda_config").select("clave, valor");
  const c = Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor]));
  const ahora = Date.now();
  return {
    precioNormal: Number(c.precio_normal),
    precioLanzamiento: Number(c.precio_lanzamiento),
    apertura: c.apertura as string,
    lanzamientoHasta: c.lanzamiento_hasta as string,
    limite: Number(c.limite_descargas || 5),
    abierta: ahora >= new Date(c.apertura).getTime(),
    lanzamientoVigente: ahora <= new Date(c.lanzamiento_hasta).getTime(),
  };
}

// ---------- Registro (inscritos) ----------

async function registroPorToken(t: unknown) {
  if (typeof t !== "string" || !UUID.test(t)) return null;
  const { data } = await db.from("registros").select("id, nombre, correo").eq("token", t).maybeSingle();
  return data;
}

async function registroPorCorreo(correo: string) {
  const patron = correo.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data } = await db.from("registros").select("id, nombre, correo").ilike("correo", patron).limit(1).maybeSingle();
  return data;
}

// ---------- Brevo ----------

async function enviarCorreo(correo: string, nombre: string, asunto: string, html: string, texto: string, etiqueta: string) {
  if (DE_PRUEBA.test(correo)) { console.log("Correo de prueba omitido", etiqueta, correo); return true; }
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: SENDER_EMAIL, name: SENDER_NAME },
      to: [{ email: correo, name: nombre }],
      replyTo: { email: CONTACTO, name: "Daniel Palacio P." },
      subject: asunto, htmlContent: html, textContent: texto, tags: ["volver-a-sumar", etiqueta],
    }),
  });
  if (!r.ok) console.error("Brevo correo", etiqueta, r.status, await r.text());
  return r.ok;
}

function correoCompra(v: { nombre: string; referencia: string; token_descarga: string; monto_centavos: number }, limite: number) {
  const n = esc(v.nombre.trim().split(/\s+/)[0] ?? "");
  const url = `${SITE}/descargas?d=${v.token_descarga}`;
  const P = (t: string) => `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:#D3D1D9;">${t}</p>`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>Tu compra de Volver a sumar</title></head>
<body style="margin:0;padding:0;background:#1F2235;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Tus enlaces de descarga de Volver a sumar.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1F2235;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4FA3C7;">Pedido ${esc(v.referencia)}</td></tr>
<tr><td style="background:#282C44;border:1px solid #3A3F5C;border-radius:8px;padding:36px 32px;">
  <h1 style="margin:0 0 22px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:26px;line-height:1.15;text-transform:uppercase;color:#F1ECE2;">Gracias por<br><span style="color:#7FC4B4;">volver a sumar.</span></h1>
  ${P(`Hola${n ? " " + n : ""}:`)}
  ${P(`Tu pago de <strong style="color:#F1ECE2;">${pesos(v.monto_centavos / 100)}</strong> quedó aprobado. Aquí tienes <strong style="color:#F1ECE2;">Volver a sumar</strong> en EPUB y PDF. Muy pronto te escribo con la sorpresa del cómic <em>La Decisión</em>, solo para quienes compraron.`)}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:#E0806C;border-radius:6px;">
    <a href="${url}" style="display:inline-block;padding:16px 28px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#1F2235;text-decoration:none;">Descargar mi libro &rarr;</a>
  </td></tr></table>
  <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#D3D1D9;"><strong style="color:#F1ECE2;">¿Lees en Kindle?</strong> Descarga el EPUB y envíalo con la app o la página "Send to Kindle" de Amazon.</p>
  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#A9AEC4;">Cada archivo se puede descargar ${limite} veces y lleva tu nombre: es tu ejemplar. Guarda este correo.</p>
  <p style="margin:30px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#F1ECE2;">Daniel Palacio P.</p>
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#A9AEC4;">
  ¿Algún problema con tu descarga? Responde a este correo o escribe a <a href="mailto:${CONTACTO}" style="color:#A9AEC4;">${CONTACTO}</a>.
  <a href="${SITE}/terminos" style="color:#A9AEC4;">Términos de compra</a> · <a href="${SITE}/privacidad" style="color:#A9AEC4;">Privacidad</a>.
</td></tr>
</table></td></tr></table></body></html>`;
  const texto = `Hola${n ? " " + v.nombre.trim().split(/\s+/)[0] : ""}:

Tu pago de ${pesos(v.monto_centavos / 100)} quedó aprobado (pedido ${v.referencia}).
Descarga Volver a sumar (EPUB y PDF) aquí:

${url}

¿Lees en Kindle? Descarga el EPUB y envíalo con "Send to Kindle" de Amazon.
Cada archivo se puede descargar ${limite} veces y lleva tu nombre. Guarda este correo.

Daniel Palacio P.
¿Algún problema? Escribe a ${CONTACTO}.`;
  return { asunto: "Tu compra de Volver a sumar: enlaces de descarga", html, texto };
}

// ---------- Pedidos ----------

type Venta = {
  id: number; referencia: string; nombre: string; correo: string; monto_centavos: number; estado: string;
  token_descarga: string; descargas: Record<string, number>; aprobado_en: string | null; correo_enviado_en: string | null;
};
const CAMPOS = "id, referencia, nombre, correo, monto_centavos, estado, token_descarga, descargas, aprobado_en, correo_enviado_en";

function nuevaReferencia() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(10));
  return "VAS-" + [...b].map((x) => abc[x % abc.length]).join("");
}

type Tx = { id?: string; status?: string; reference?: string; amount_in_cents?: number; currency?: string; payment_method_type?: string };

// Aplica una transacción de Wompi (del evento firmado o de la consulta a la API) al pedido.
async function aplicar(tx: Tx) {
  if (!tx.reference) return null;
  const { data: v } = await db.from("ventas").select(CAMPOS).eq("referencia", tx.reference).maybeSingle<Venta>();
  if (!v) return null;
  let estado = String(tx.status ?? "PENDING").toUpperCase();
  if (estado === "PENDING") estado = "PENDIENTE";
  if (!["PENDIENTE", "APPROVED", "DECLINED", "VOIDED", "ERROR"].includes(estado)) estado = "ERROR";
  if (estado === "APPROVED" && (Number(tx.amount_in_cents) !== Number(v.monto_centavos) || tx.currency !== "COP")) {
    console.error("Monto o moneda no coinciden", tx.reference, tx.amount_in_cents, v.monto_centavos, tx.currency);
    estado = "ERROR";
  }
  // Un pedido aprobado solo cambia si Wompi lo anula.
  if (v.estado === "APPROVED" && estado !== "VOIDED") estado = "APPROVED";
  const cambios: Record<string, unknown> = { estado, wompi_id: tx.id ?? null, metodo: tx.payment_method_type ?? null };
  if (estado === "APPROVED" && !v.aprobado_en) cambios.aprobado_en = new Date().toISOString();
  const { data: act } = await db.from("ventas").update(cambios).eq("id", v.id).select(CAMPOS).single<Venta>();
  if (act?.estado === "APPROVED") await entregar(act);
  return act;
}

// Envía el correo de compra una sola vez, aunque lleguen el evento y la consulta al tiempo.
async function entregar(v: Venta) {
  if (v.correo_enviado_en) return;
  const { data: tomado } = await db.from("ventas").update({ correo_enviado_en: new Date().toISOString() })
    .eq("id", v.id).is("correo_enviado_en", null).select("id").maybeSingle();
  if (!tomado) return;
  const cfg = await config();
  const c = correoCompra(v, cfg.limite);
  const ok = await enviarCorreo(v.correo, v.nombre, c.asunto, c.html, c.texto, "compra");
  if (!ok) await db.from("ventas").update({ correo_enviado_en: null }).eq("id", v.id);
}

async function consultarWompi(id: string): Promise<Tx | null> {
  const r = await fetch(`${WOMPI_API}/transactions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${WOMPI_PUBLIC_KEY}` },
  });
  if (!r.ok) { console.error("Wompi consulta", id, r.status); return null; }
  const j = await r.json();
  return j?.data ?? null;
}

// ---------- Acciones ----------

async function info(body: Record<string, unknown>) {
  const cfg = await config();
  const reg = await registroPorToken(body.t);
  return [200, {
    ok: true,
    abierta: cfg.abierta,
    apertura: cfg.apertura,
    precio_normal: cfg.precioNormal,
    precio_lanzamiento: cfg.precioLanzamiento,
    lanzamiento_hasta: cfg.lanzamientoHasta,
    lanzamiento_vigente: cfg.lanzamientoVigente,
    titular: reg ? { nombre: reg.nombre, correo: reg.correo } : null,
  }] as const;
}

async function crear(body: Record<string, unknown>) {
  if (!WOMPI_PUBLIC_KEY || !WOMPI_INTEGRITY_SECRET) return [500, { ok: false, error: "Falta configurar Wompi" }] as const;
  const cfg = await config();
  if (!cfg.abierta) return [403, { ok: false, error: "cerrada" }] as const;
  const nombre = typeof body.nombre === "string" ? body.nombre.trim().replace(/\s+/g, " ") : "";
  const correo = typeof body.correo === "string" ? body.correo.trim().toLowerCase() : "";
  if (!nombre || nombre.length > 100) return [400, { ok: false, error: "nombre" }] as const;
  if (!CORREO.test(correo) || correo.length > 254) return [400, { ok: false, error: "correo" }] as const;
  if (body.acepta !== true) return [400, { ok: false, error: "acepta" }] as const;

  // Precio de lanzamiento: correo inscrito en el registro (los libros llegan a ese correo) o enlace personal.
  const reg = (await registroPorCorreo(correo)) ?? null;
  const porToken = await registroPorToken(body.t);
  const inscrito = reg ?? (porToken && porToken.correo.toLowerCase() === correo ? porToken : null);
  const tipo = inscrito && cfg.lanzamientoVigente ? "lanzamiento" : "normal";
  const monto = (tipo === "lanzamiento" ? cfg.precioLanzamiento : cfg.precioNormal) * 100;

  const referencia = nuevaReferencia();
  const { error } = await db.from("ventas").insert({
    referencia, registro_id: inscrito?.id ?? null, nombre, correo, monto_centavos: monto, tipo_precio: tipo,
  });
  if (error) { console.error("Crear pedido", error); return [500, { ok: false, error: "pedido" }] as const; }

  const firma = await sha256(`${referencia}${monto}COP${WOMPI_INTEGRITY_SECRET}`);
  const q = new URLSearchParams({
    "public-key": WOMPI_PUBLIC_KEY,
    currency: "COP",
    "amount-in-cents": String(monto),
    reference: referencia,
    "signature:integrity": firma,
    "redirect-url": `${SITE}/comprar/gracias`,
    "customer-data:email": correo,
    "customer-data:full-name": nombre,
  });
  return [200, { ok: true, referencia, monto: monto / 100, tipo, url: `https://checkout.wompi.co/p/?${q}` }] as const;
}

async function estado(body: Record<string, unknown>) {
  const id = typeof body.id === "string" && /^[\w-]{4,80}$/.test(body.id) ? body.id : null;
  let v: Venta | null = null;
  if (id) {
    const tx = await consultarWompi(id);
    if (tx) v = await aplicar(tx);
  }
  if (!v && typeof body.referencia === "string" && /^VAS-[A-Z0-9]{10}$/.test(body.referencia)) {
    const { data } = await db.from("ventas").select(CAMPOS).eq("referencia", body.referencia).maybeSingle<Venta>();
    v = data;
  }
  if (!v) return [404, { ok: false, error: "pedido" }] as const;
  return [200, {
    ok: true, referencia: v.referencia, estado: v.estado, nombre: v.nombre,
    correo: v.correo.replace(/^(.{2}).*(@.*)$/, "$1•••$2"),
    descargas: v.estado === "APPROVED" ? `${SITE}/descargas?d=${v.token_descarga}` : null,
  }] as const;
}

async function ventaPorToken(d: unknown) {
  if (typeof d !== "string" || !UUID.test(d)) return null;
  const { data } = await db.from("ventas").select(CAMPOS).eq("token_descarga", d).maybeSingle<Venta>();
  return data;
}

async function descargas(body: Record<string, unknown>) {
  const v = await ventaPorToken(body.d);
  if (!v || v.estado !== "APPROVED") return [404, { ok: false, error: "enlace" }] as const;
  const cfg = await config();
  return [200, {
    ok: true, nombre: v.nombre, referencia: v.referencia, limite: cfg.limite,
    archivos: (Object.keys(ARCHIVOS) as ClaveArchivo[]).map((f) => ({
      f, titulo: ARCHIVOS[f].titulo, restantes: Math.max(0, cfg.limite - (v.descargas?.[f] ?? 0)),
    })),
  }] as const;
}

async function evento(req: Request, body: Record<string, unknown>) {
  if (!WOMPI_EVENTS_SECRET) return [500, { ok: false }] as const;
  const firma = body.signature as { properties?: string[]; checksum?: string } | undefined;
  const data = body.data as Record<string, unknown> | undefined;
  const ts = body.timestamp ?? (firma as Record<string, unknown> | undefined)?.timestamp;
  if (!firma?.properties || !data || ts == null) return [400, { ok: false }] as const;
  const valores = firma.properties.map((p) => p.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], data));
  const calculada = await sha256(valores.map((x) => String(x ?? "")).join("") + String(ts) + WOMPI_EVENTS_SECRET);
  const recibida = String(firma.checksum ?? req.headers.get("x-event-checksum") ?? "").toLowerCase();
  if (calculada !== recibida) { console.error("Evento Wompi con firma inválida"); return [401, { ok: false }] as const; }
  if (body.event === "transaction.updated") await aplicar((data.transaction ?? {}) as Tx);
  return [200, { ok: true }] as const;
}

// ---------- Descarga (GET) ----------

function paginaError(titulo: string, texto: string, status: number) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="margin:0;background:#1F2235;color:#F1ECE2;font-family:Arial,Helvetica,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px">
<div style="max-width:480px"><h1 style="text-transform:uppercase;font-size:24px">${titulo}</h1><p style="color:#D3D1D9;line-height:1.6">${texto}</p>
<p><a style="color:#4FA3C7" href="mailto:${CONTACTO}">${CONTACTO}</a></p></div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function descargar(url: URL) {
  const f = url.searchParams.get("f") as ClaveArchivo | null;
  if (!f || !(f in ARCHIVOS)) return paginaError("Archivo no válido", "Revisa el enlace de tu correo de compra.", 400);
  const v = await ventaPorToken(url.searchParams.get("d"));
  if (!v || v.estado !== "APPROVED") return paginaError("Enlace no válido", "Este enlace de descarga no corresponde a una compra aprobada.", 404);
  const cfg = await config();
  const usadas = v.descargas?.[f] ?? 0;
  if (usadas >= cfg.limite) {
    return paginaError("Descargas agotadas", `Ya usaste las ${cfg.limite} descargas de este archivo. Si necesitas otra, escríbenos y te ayudamos.`, 403);
  }

  const a = ARCHIVOS[f];
  const ext = a.marca === "epub" ? "epub" : "pdf";
  const destino = `personalizados/${v.referencia}/${f}.${ext}`;
  const { data: existentes } = await db.storage.from(BUCKET).list(`personalizados/${v.referencia}`);
  if (!existentes?.some((o) => o.name === `${f}.${ext}`)) {
    const { data: original, error } = await db.storage.from(BUCKET).download(a.origen);
    if (error || !original) {
      console.error("Original no disponible", a.origen, error);
      return paginaError("Archivo en preparación", "Estamos terminando de preparar este archivo. Intenta de nuevo en unos minutos.", 503);
    }
    const quien: Comprador = { nombre: v.nombre, correo: v.correo, pedido: v.referencia, fecha: fechaLarga(v.aprobado_en ?? new Date().toISOString()) };
    const bytes = new Uint8Array(await original.arrayBuffer());
    const marcado = a.marca === "epub" ? marcarEpub(bytes, quien) : await marcarPdf(bytes, quien);
    const { error: e2 } = await db.storage.from(BUCKET).upload(destino, marcado, {
      contentType: a.marca === "epub" ? "application/epub+zip" : "application/pdf", upsert: true,
    });
    if (e2) { console.error("Subir personalizado", e2); return paginaError("No pudimos preparar tu archivo", "Intenta de nuevo en un minuto.", 500); }
  }
  const { data: firmado, error: e3 } = await db.storage.from(BUCKET).createSignedUrl(destino, 120, { download: a.nombre });
  if (e3 || !firmado) return paginaError("No pudimos preparar tu descarga", "Intenta de nuevo en un minuto.", 500);
  await db.from("ventas").update({ descargas: { ...(v.descargas ?? {}), [f]: usadas + 1 } }).eq("id", v.id);
  return new Response(null, { status: 302, headers: { Location: firmado.signedUrl, "Cache-Control": "no-store" } });
}

// ---------- Servidor ----------

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.has("d")) {
    try { return await descargar(url); } catch (e) {
      console.error("descargar", e);
      return paginaError("No pudimos preparar tu descarga", "Intenta de nuevo en un minuto.", 500);
    }
  }
  const h = cabeceras(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false }), { status: 405, headers: h });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* cuerpo vacío o inválido */ }

  try {
    let r: readonly [number, unknown];
    if (typeof body.event === "string") r = await evento(req, body);
    else switch (body.accion) {
      case "info": r = await info(body); break;
      case "crear": r = await crear(body); break;
      case "estado": r = await estado(body); break;
      case "descargas": r = await descargas(body); break;
      default: r = [400, { ok: false, error: "accion" }];
    }
    return new Response(JSON.stringify(r[1]), { status: r[0], headers: h });
  } catch (e) {
    console.error("tienda", e);
    return new Response(JSON.stringify({ ok: false, error: "interno" }), { status: 500, headers: h });
  }
});
