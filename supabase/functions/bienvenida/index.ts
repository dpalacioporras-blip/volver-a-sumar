// Envía el correo de bienvenida con el Capítulo 1 a cada persona nueva del registro
// y la agrega a la lista de Brevo. La llama un disparador de la base de datos.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const BREVO_LIST_ID = Number(Deno.env.get("BREVO_LIST_ID") ?? "3");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") ?? "tvpandemonium@gmail.com";
const SENDER_NAME = Deno.env.get("SENDER_NAME") ?? "Daniel Palacio P. · Volver a sumar";
const SITE = Deno.env.get("SITE_URL") ?? "https://volver-a-sumar.vercel.app";
const CONTACTO = "tvpandemonium@gmail.com";
// Segunda entrega: enlace personal al formulario T-14 (/t14) dentro de la bienvenida.
const T14_SITE = Deno.env.get("T14_SITE_URL") ?? "https://volverasumar.pandemoniumpodcast.com";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function primerNombre(nombre: string) {
  return nombre.trim().split(/\s+/)[0] ?? "";
}

export function correoHtml(nombre: string, site: string, t14: string) {
  const n = esc(primerNombre(nombre));
  const pdf = `${site}/descargas/volver-a-sumar-capitulo-1.pdf`;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>Tu Capítulo 1 de Volver a sumar</title></head>
<body style="margin:0;padding:0;background:#1F2235;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Jacobo encontró una raíz. Empieza a leer antes que nadie.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1F2235;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4FA3C7;">Registro de elegibilidad</td></tr>
<tr><td style="background:#282C44;border:1px solid #3A3F5C;border-radius:8px;padding:36px 32px;">
  <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:16px;letter-spacing:1px;color:#A9AEC4;">
    <span style="color:#E0806C;">412.300</span> &rarr; <span style="color:#F1ECE2;">412.299</span> &rarr; <span style="color:#4FA3C7;">412.298</span>
  </p>
  <h1 style="margin:0 0 22px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:26px;line-height:1.15;text-transform:uppercase;color:#F1ECE2;">Registro completado.<br><span style="color:#7FC4B4;">Eres elegible.</span></h1>
  <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:#D3D1D9;">Hola${n ? " " + n : ""}:</p>
  <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:#D3D1D9;">Tu registro quedó completado. Aquí está el <strong style="color:#F1ECE2;">Capítulo 1 de Volver a sumar</strong>, para que empieces a leer antes de que la novela salga a la venta.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 30px;"><tr><td style="background:#E0806C;border-radius:6px;">
    <a href="${pdf}" style="display:inline-block;padding:16px 28px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#1F2235;text-decoration:none;">Leer el Capítulo 1 &rarr;</a>
  </td></tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="150" valign="top" style="padding-right:22px;"><a href="${pdf}"><img src="${site}/correo/portada.jpg" width="150" alt="Portada de Volver a sumar" style="display:block;width:150px;height:auto;border-radius:4px;border:0;"></a></td>
    <td valign="top" style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#D3D1D9;">
      <p style="margin:0 0 12px;">Cuando la novela salga a la venta, te escribiremos con el <strong style="color:#F1ECE2;">precio de lanzamiento</strong>, solo para quienes están en el registro.</p>
      <p style="margin:0;">Y con tu compra recibes gratis el cómic <em>La Decisión</em>.</p>
    </td>
  </tr></table>
  <div style="margin:30px 0 0;padding:24px 0 0;border-top:1px solid #3A3F5C;">
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#4FA3C7;">Segunda entrega · Formulario T-14</p>
    <p style="margin:0 0 12px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:19px;line-height:1.2;text-transform:uppercase;color:#F1ECE2;">Tu perímetro será desafectado.</p>
    <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#D3D1D9;">Llena el formulario de reubicación: ocho preguntas sobre lo que harías deciden si te asignan a un Centro de Reunión o quedas en lista de espera abierta. Al final recibes tu credencial para compartir en Instagram. Etiquétame en <strong style="color:#F1ECE2;">@IDanielPanda</strong>.</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border:1px solid #F1ECE2;border-radius:6px;">
      <a href="${t14}" style="display:inline-block;padding:14px 24px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#F1ECE2;text-decoration:none;">Llenar mi formulario T-14 &rarr;</a>
    </td></tr></table>
    <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#A9AEC4;">El enlace es personal. La solicitud se radica una sola vez.</p>
  </div>
  <p style="margin:30px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#F1ECE2;">Daniel Palacio P.</p>
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#A9AEC4;">
  Recibes este correo porque te inscribiste en el registro de elegibilidad de <a href="${site}" style="color:#A9AEC4;">Volver a sumar</a>.
  Si no fuiste tú o no quieres recibir más correos, escribe a <a href="mailto:${CONTACTO}" style="color:#A9AEC4;">${CONTACTO}</a>.
  <a href="${site}/privacidad" style="color:#A9AEC4;">Política de privacidad</a>.
</td></tr>
</table></td></tr></table></body></html>`;
}

function correoTexto(nombre: string, site: string, t14: string) {
  const n = primerNombre(nombre);
  return `Hola${n ? " " + n : ""}:

Tu registro de elegibilidad quedó completado. Aquí está el Capítulo 1 de Volver a sumar:
${site}/descargas/volver-a-sumar-capitulo-1.pdf

Cuando la novela salga a la venta, te escribiremos con el precio de lanzamiento. Y con tu compra recibes gratis el cómic La Decisión.

Segunda entrega: llena tu formulario de reubicación T-14. Ocho preguntas deciden si te asignan a un Centro de Reunión o quedas en lista de espera abierta. Al final recibes tu credencial para compartir en Instagram (etiquétame en @IDanielPanda).
Tu enlace personal: ${t14}

Daniel Palacio P.

Si no fuiste tú o no quieres recibir más correos, escribe a ${CONTACTO}.`;
}

async function brevo(path: string, body: unknown) {
  const r = await fetch(`https://api.brevo.com/v3${path}`, {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  if (!BREVO_API_KEY || !BREVO_LIST_ID || !SENDER_EMAIL) {
    return new Response(JSON.stringify({ error: "Falta configurar Brevo" }), { status: 500 });
  }

  let id: number | undefined;
  try {
    const payload = await req.json();
    id = Number(payload?.record?.id ?? payload?.id);
  } catch { /* cuerpo inválido */ }
  if (!id) return new Response(JSON.stringify({ error: "Falta el id" }), { status: 400 });

  // Se lee el registro desde la base: nunca se confía en el correo que venga en la petición.
  const { data: reg, error } = await db.from("registros")
    .select("id, nombre, correo, token, bienvenida_enviada_en").eq("id", id).maybeSingle();
  if (error || !reg) return new Response(JSON.stringify({ error: "Registro no encontrado" }), { status: 404 });
  if (reg.bienvenida_enviada_en) return new Response(JSON.stringify({ ok: true, ya_enviado: true }));

  // 1. Contacto en la lista de Brevo (para el correo del lanzamiento).
  let c = await brevo("/contacts", {
    email: reg.correo, listIds: [BREVO_LIST_ID], updateEnabled: true,
    attributes: { FIRSTNAME: reg.nombre, NOMBRE: reg.nombre },
  });
  if (!c.ok && c.status === 400 && /attribute/i.test(c.text)) {
    c = await brevo("/contacts", { email: reg.correo, listIds: [BREVO_LIST_ID], updateEnabled: true });
  }
  if (!c.ok && c.status !== 204) console.error("Brevo contacto", c.status, c.text);

  // 2. Correo de bienvenida (con el Capítulo 1 y el enlace personal al T-14).
  const t14 = `${T14_SITE}/t14?t=${reg.token}`;
  const m = await brevo("/smtp/email", {
    sender: { email: SENDER_EMAIL, name: SENDER_NAME },
    to: [{ email: reg.correo, name: reg.nombre }],
    replyTo: { email: CONTACTO, name: "Daniel Palacio P." },
    subject: "Registro completado: tu Capítulo 1 y tu formulario T-14",
    htmlContent: correoHtml(reg.nombre, SITE, t14),
    textContent: correoTexto(reg.nombre, SITE, t14),
    tags: ["volver-a-sumar", "bienvenida"],
  });
  if (!m.ok) {
    console.error("Brevo correo", m.status, m.text);
    return new Response(JSON.stringify({ error: "No se pudo enviar", status: m.status }), { status: 502 });
  }

  // La bienvenida ya lleva el T-14: queda marcado para que el anuncio de la segunda entrega no se repita.
  const ahora = new Date().toISOString();
  await db.from("registros").update({ bienvenida_enviada_en: ahora, t14_anuncio_enviado_en: ahora }).eq("id", reg.id);
  return new Response(JSON.stringify({ ok: true }));
});
