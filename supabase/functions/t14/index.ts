// Formulario único de reubicación · Modelo T-14 (segunda entrega del registro).
// La página /t14 llama a esta función. Acciones públicas:
//   estado   { token }               → nombre del titular y resultado, si ya radicó
//   radicar  { token, respuestas }   → calcula y guarda el resultado (una sola vez) y lo copia a Brevo
//   enlace   { nombre, correo, ... } → inscribe a quien no está y envía el enlace personal por correo
// Acciones de administración (cabecera x-t14-admin, se llaman con public.t14_admin desde el editor SQL):
//   anunciar    { prueba?: correo, limite?: n } → correo de la segunda entrega a la lista
//   sincronizar { desde?: id, limite?: n }      → atributos T14_* en Brevo para toda la lista
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CENTROS, RESULTADOS, expedienteDe, limpiar, resolver, validar } from "./datos.js";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") ?? "tvpandemonium@gmail.com";
const SENDER_NAME = Deno.env.get("SENDER_NAME") ?? "Daniel Palacio P. · Volver a sumar";
const SITE = Deno.env.get("T14_SITE_URL") ?? "https://volverasumar.pandemoniumpodcast.com";
const CONTACTO = "tvpandemonium@gmail.com";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const ORIGENES = [
  /^https:\/\/volverasumar\.pandemoniumpodcast\.com$/,
  /^https:\/\/volver-a-sumar[a-z0-9-]*\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function cabeceras(req: Request) {
  const origen = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGENES.some((r) => r.test(origen)) ? origen : "https://volverasumar.pandemoniumpodcast.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function enlaceDe(token: string) {
  return `${SITE}/t14?t=${token}`;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function primerNombre(nombre: string) {
  return nombre.trim().split(/\s+/)[0] ?? "";
}

// ---------- Brevo ----------

async function brevo(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.brevo.com/v3${path}`, {
    method,
    headers: { "api-key": BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, text: await r.text() };
}

const ATRIBUTOS = ["T14_ENLACE", "T14_CATEGORIA", "T14_CENTRO", "T14_SEDE", "T14_FUNCION", "T14_SECTOR", "T14_EXPEDIENTE"];

async function crearAtributos() {
  for (const a of ATRIBUTOS) {
    const r = await brevo("POST", `/contacts/attributes/normal/${a}`, { type: "text" });
    if (!r.ok && r.status !== 400) console.error("Brevo atributo", a, r.status, r.text);
  }
}

// Correos de dominios reservados para pruebas (RFC 2606): nunca llegan a Brevo.
const DE_PRUEBA = /@example\.(com|org|net)$/i;

function atributosDe(token: string, asig?: { id: number; resultado: Record<string, unknown> } | null) {
  const at: Record<string, string> = {
    T14_ENLACE: enlaceDe(token), T14_CATEGORIA: "", T14_CENTRO: "", T14_SEDE: "", T14_FUNCION: "", T14_SECTOR: "", T14_EXPEDIENTE: "",
  };
  if (asig) {
    const r = asig.resultado as { categoria: string; centro: string | null; funcion: string | null; sector: number | null };
    const c = r.centro ? CENTROS[r.centro as keyof typeof CENTROS] : null;
    at.T14_CATEGORIA = r.categoria === "ESPERA" ? "LISTA DE ESPERA" : r.categoria;
    at.T14_CENTRO = c ? `Centro de Reunión ${c.de}` : "";
    at.T14_SEDE = c ? c.sede : "";
    at.T14_FUNCION = r.funcion ?? "";
    at.T14_SECTOR = r.sector ? String(r.sector) : "";
    at.T14_EXPEDIENTE = expedienteDe(asig.id);
  }
  return at;
}

async function actualizarContacto(correo: string, attributes: Record<string, string>) {
  if (DE_PRUEBA.test(correo)) return true;
  const ruta = `/contacts/${encodeURIComponent(correo)}?identifierType=email_id`;
  let r = await brevo("PUT", ruta, { attributes });
  if (!r.ok && r.status === 400 && /attribute/i.test(r.text)) {
    await crearAtributos();
    r = await brevo("PUT", ruta, { attributes });
  }
  if (!r.ok && r.status === 404) {
    // Contacto que aún no llegó a Brevo: se crea con sus atributos (la lista la agrega la función de bienvenida).
    r = await brevo("POST", "/contacts", { email: correo, attributes, updateEnabled: true });
  }
  if (!r.ok) console.error("Brevo contacto", correo, r.status, r.text);
  return r.ok;
}

// ---------- Correos ----------

function plantilla(opts: { titulo: string; preheader: string; etiqueta: string; encabezado: string; cuerpo: string; boton: string; url: string; nota: string }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>${opts.titulo}</title></head>
<body style="margin:0;padding:0;background:#1F2235;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1F2235;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4FA3C7;">${opts.etiqueta}</td></tr>
<tr><td style="background:#282C44;border:1px solid #3A3F5C;border-radius:8px;padding:36px 32px;">
  <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#A9AEC4;">Administración Central de Perímetros Administrados</p>
  <h1 style="margin:0 0 22px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:26px;line-height:1.15;text-transform:uppercase;color:#F1ECE2;">${opts.encabezado}</h1>
  ${opts.cuerpo}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;"><tr><td style="background:#E0806C;border-radius:6px;">
    <a href="${opts.url}" style="display:inline-block;padding:16px 28px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#1F2235;text-decoration:none;">${opts.boton} &rarr;</a>
  </td></tr></table>
  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#A9AEC4;">${opts.nota}</p>
  <p style="margin:30px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#F1ECE2;">Daniel Palacio P.</p>
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#A9AEC4;">
  Recibes este correo porque te inscribiste en el registro de elegibilidad de <a href="${SITE}" style="color:#A9AEC4;">Volver a sumar</a>.
  Si no quieres recibir más correos, escribe a <a href="mailto:${CONTACTO}" style="color:#A9AEC4;">${CONTACTO}</a>.
  <a href="${SITE}/privacidad" style="color:#A9AEC4;">Política de privacidad</a>.
</td></tr>
</table></td></tr></table></body></html>`;
}

const P = (t: string) => `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:#D3D1D9;">${t}</p>`;

function correoAnuncio(nombre: string, url: string) {
  const n = primerNombre(nombre);
  const html = plantilla({
    titulo: "Segunda entrega: tu formulario de reubicación T-14",
    preheader: "Tu perímetro será desafectado. Llena el formulario y averigua si te asignan a un Centro de Reunión.",
    etiqueta: "Registro de elegibilidad · Segunda entrega",
    encabezado: `Tu perímetro será desafectado.<br><span style="color:#E0806C;">Solicita tu reubicación.</span>`,
    cuerpo: P(`Hola${n ? " " + esc(n) : ""}:`) +
      P(`Esta es la segunda entrega para quienes están en el registro de <strong style="color:#F1ECE2;">Volver a sumar</strong>: el <strong style="color:#F1ECE2;">Formulario único de reubicación, modelo T-14</strong>.`) +
      P("Son catorce preguntas. Según tus respuestas, te asignan a uno de los catorce Centros de Reunión, con una función y un sector, o quedas en lista de espera abierta.") +
      P("Respóndelo con tus datos reales. Al final recibes tu credencial para compartir en tus historias."),
    boton: "Llenar mi formulario T-14",
    url,
    nota: "El enlace es personal. La solicitud se radica una sola vez.",
  });
  const texto = `Hola${n ? " " + n : ""}:

Esta es la segunda entrega para quienes están en el registro de Volver a sumar: el Formulario único de reubicación, modelo T-14.

Son catorce preguntas. Según tus respuestas, te asignan a uno de los catorce Centros de Reunión, con una función y un sector, o quedas en lista de espera abierta. Al final recibes tu credencial para compartir.

Tu enlace personal: ${url}
La solicitud se radica una sola vez.

Daniel Palacio P.

Si no quieres recibir más correos, escribe a ${CONTACTO}.`;
  return { asunto: "Segunda entrega: tu formulario de reubicación T-14", html, texto };
}

function correoEnlace(nombre: string, url: string) {
  const n = primerNombre(nombre);
  const html = plantilla({
    titulo: "Tu enlace al formulario T-14",
    preheader: "Tu enlace personal al Formulario único de reubicación, modelo T-14.",
    etiqueta: "Registro de elegibilidad · Formulario T-14",
    encabezado: "Tu expediente está abierto.",
    cuerpo: P(`Hola${n ? " " + esc(n) : ""}:`) +
      P("Aquí está tu enlace personal al <strong style=\"color:#F1ECE2;\">Formulario único de reubicación, modelo T-14</strong>. Son catorce preguntas y al final recibes tu credencial, o tu constancia si quedas en lista de espera."),
    boton: "Abrir mi formulario",
    url,
    nota: "El enlace es personal. La solicitud se radica una sola vez. Si no pediste este enlace, puedes ignorar este correo.",
  });
  const texto = `Hola${n ? " " + n : ""}:

Tu enlace personal al Formulario único de reubicación, modelo T-14:
${url}

La solicitud se radica una sola vez. Si no pediste este enlace, puedes ignorar este correo.

Daniel Palacio P.`;
  return { asunto: "Tu enlace al formulario T-14", html, texto };
}

async function enviar(correo: string, nombre: string, c: { asunto: string; html: string; texto: string }, etiqueta: string) {
  if (DE_PRUEBA.test(correo)) { console.log("Correo de prueba omitido", etiqueta, correo); return true; }
  const m = await brevo("POST", "/smtp/email", {
    sender: { email: SENDER_EMAIL, name: SENDER_NAME },
    to: [{ email: correo, name: nombre }],
    replyTo: { email: CONTACTO, name: "Daniel Palacio P." },
    subject: c.asunto,
    htmlContent: c.html,
    textContent: c.texto,
    tags: ["volver-a-sumar", etiqueta],
  });
  if (!m.ok) console.error("Brevo correo", etiqueta, m.status, m.text);
  return m.ok;
}

// ---------- Datos ----------

type Registro = { id: number; nombre: string; correo: string; token: string };

async function registroPorToken(token: unknown): Promise<Registro | null> {
  if (typeof token !== "string" || !UUID.test(token)) return null;
  const { data } = await db.from("registros").select("id, nombre, correo, token").eq("token", token).maybeSingle();
  return data;
}

async function registroPorCorreo(correo: string) {
  const patron = correo.replace(/[\\%_]/g, (c) => "\\" + c);
  const { data } = await db.from("registros")
    .select("id, nombre, correo, token, t14_enlace_enviado_en").ilike("correo", patron).limit(1).maybeSingle();
  return data;
}

async function asignacionDe(registroId: number) {
  const { data } = await db.from("asignaciones").select("id, resultado, creado_en").eq("registro_id", registroId).maybeSingle();
  return data;
}

function salida(asig: { id: number; resultado: Record<string, unknown>; creado_en: string }) {
  return { ...asig.resultado, expediente: expedienteDe(asig.id), radicado_en: asig.creado_en };
}

// ---------- Acciones ----------

async function estado(body: Record<string, unknown>) {
  const reg = await registroPorToken(body.token);
  if (!reg) return [404, { ok: false, error: "expediente" }] as const;
  const asig = await asignacionDe(reg.id);
  return [200, { ok: true, nombre: reg.nombre, resultado: asig ? salida(asig) : null }] as const;
}

async function radicar(body: Record<string, unknown>) {
  const reg = await registroPorToken(body.token);
  if (!reg) return [404, { ok: false, error: "expediente" }] as const;

  const previa = await asignacionDe(reg.id);
  if (previa) return [200, { ok: true, ya_radicada: true, resultado: salida(previa) }] as const;

  const error = validar(body.respuestas);
  if (error) return [400, { ok: false, error }] as const;
  const respuestas = limpiar(body.respuestas as Record<string, string>);
  const resultado = resolver(respuestas, reg.id);

  const { data, error: e } = await db.from("asignaciones").insert({
    registro_id: reg.id,
    respuestas,
    resultado,
    categoria: resultado.categoria,
    centro: resultado.centro,
    funcion: resultado.funcion,
    sector: resultado.sector,
  }).select("id, resultado, creado_en").single();

  if (e) {
    // Dos envíos a la vez: gana el primero.
    const otra = await asignacionDe(reg.id);
    if (otra) return [200, { ok: true, ya_radicada: true, resultado: salida(otra) }] as const;
    console.error("Insertar asignación", e);
    return [500, { ok: false, error: "No se pudo radicar" }] as const;
  }

  if (BREVO_API_KEY) {
    const ok = await actualizarContacto(reg.correo, atributosDe(reg.token, data));
    if (ok) await db.from("asignaciones").update({ brevo_sincronizado_en: new Date().toISOString() }).eq("id", data.id);
  }
  return [200, { ok: true, resultado: salida(data) }] as const;
}

async function enlace(body: Record<string, unknown>) {
  // Siempre la misma respuesta: no se revela si un correo ya estaba inscrito.
  const listo = [200, { ok: true }] as const;
  if (body.sitio) return listo; // campo trampa para bots
  const nombre = typeof body.nombre === "string" ? body.nombre.trim().replace(/\s+/g, " ") : "";
  const correo = typeof body.correo === "string" ? body.correo.trim().toLowerCase() : "";
  if (!nombre || nombre.length > 100) return [400, { ok: false, error: "nombre" }] as const;
  if (!CORREO.test(correo) || correo.length > 254) return [400, { ok: false, error: "correo" }] as const;
  if (body.acepta !== true) return [400, { ok: false, error: "acepta" }] as const;

  let reg = await registroPorCorreo(correo);
  if (reg?.t14_enlace_enviado_en && Date.now() - new Date(reg.t14_enlace_enviado_en).getTime() < 10 * 60 * 1000) {
    return listo; // ya se envió hace menos de diez minutos
  }
  if (!reg) {
    // Inscripción nueva: el disparador de "registros" le envía además el Capítulo 1.
    const { data, error } = await db.from("registros")
      .insert({ nombre, correo, acepta_datos: true })
      .select("id, nombre, correo, token, t14_enlace_enviado_en").single();
    if (error) reg = await registroPorCorreo(correo);
    else reg = data;
    if (!reg) {
      console.error("Inscribir desde T-14", error);
      return [500, { ok: false, error: "No se pudo inscribir" }] as const;
    }
  }

  if (await enviar(reg.correo, reg.nombre, correoEnlace(reg.nombre, enlaceDe(reg.token)), "t14-enlace")) {
    await db.from("registros").update({ t14_enlace_enviado_en: new Date().toISOString() }).eq("id", reg.id);
  }
  return listo;
}

async function esAdmin(req: Request) {
  const clave = req.headers.get("x-t14-admin") ?? "";
  if (clave.length < 32) return false;
  const { data } = await db.from("t14_config").select("valor").eq("clave", "admin_key").maybeSingle();
  return !!data && data.valor === clave;
}

async function anunciar(body: Record<string, unknown>) {
  if (typeof body.prueba === "string") {
    const reg = await registroPorCorreo(body.prueba.trim().toLowerCase());
    if (!reg) return [404, { ok: false, error: "Ese correo no está en el registro" }] as const;
    const ok = await enviar(reg.correo, reg.nombre, correoAnuncio(reg.nombre, enlaceDe(reg.token)), "t14-anuncio-prueba");
    return [200, { ok, prueba: reg.correo }] as const;
  }
  const limite = Math.min(Math.max(Number(body.limite) || 100, 1), 250);
  const { data: lista, error } = await db.from("registros")
    .select("id, nombre, correo, token").is("t14_anuncio_enviado_en", null).order("id").limit(limite);
  if (error) return [500, { ok: false, error: error.message }] as const;
  let enviados = 0, fallidos = 0;
  for (const reg of lista ?? []) {
    if (await enviar(reg.correo, reg.nombre, correoAnuncio(reg.nombre, enlaceDe(reg.token)), "t14-anuncio")) {
      await db.from("registros").update({ t14_anuncio_enviado_en: new Date().toISOString() }).eq("id", reg.id);
      enviados++;
    } else fallidos++;
  }
  const { count } = await db.from("registros").select("id", { count: "exact", head: true }).is("t14_anuncio_enviado_en", null);
  return [200, { ok: true, enviados, fallidos, pendientes: count }] as const;
}

async function sincronizar(body: Record<string, unknown>) {
  await crearAtributos();
  const desde = Number(body.desde) || 0;
  const limite = Math.min(Math.max(Number(body.limite) || 250, 1), 500);
  const { data: lista, error } = await db.from("registros")
    .select("id, correo, token, asignaciones(id, resultado)").gt("id", desde).order("id").limit(limite);
  if (error) return [500, { ok: false, error: error.message }] as const;
  let ok = 0, fallidos = 0, ultimo = desde;
  for (const reg of lista ?? []) {
    const asig = Array.isArray(reg.asignaciones) ? reg.asignaciones[0] : reg.asignaciones;
    if (await actualizarContacto(reg.correo, atributosDe(reg.token, asig ?? null))) ok++; else fallidos++;
    ultimo = reg.id;
  }
  return [200, { ok: true, actualizados: ok, fallidos, ultimo_id: ultimo, quedan_mas: (lista?.length ?? 0) === limite }] as const;
}

Deno.serve(async (req) => {
  const h = cabeceras(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false }), { status: 405, headers: h });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* cuerpo vacío o inválido */ }

  try {
    let r: readonly [number, unknown];
    switch (body.accion) {
      case "estado": r = await estado(body); break;
      case "radicar": r = await radicar(body); break;
      case "enlace": r = await enlace(body); break;
      case "anunciar":
      case "sincronizar":
        if (!(await esAdmin(req))) { r = [403, { ok: false }]; break; }
        if (!BREVO_API_KEY) { r = [500, { ok: false, error: "Falta BREVO_API_KEY" }]; break; }
        r = body.accion === "anunciar" ? await anunciar(body) : await sincronizar(body);
        break;
      default: r = [400, { ok: false, error: "accion" }];
    }
    return new Response(JSON.stringify(r[1]), { status: r[0], headers: h });
  } catch (e) {
    console.error("t14", e);
    return new Response(JSON.stringify({ ok: false, error: "interno" }), { status: 500, headers: h });
  }
});
