// Aviso de reemplazo de ejemplar (9 nov 2026): cuando se sube una edición corregida a "Originales",
// este correo, en el tono del universo, avisa a quienes ya compraron y les reinicia las descargas.
//   reemplazo { prueba: correo } → un solo correo, con la compra aprobada más reciente de ese correo (no marca nada)
//   reemplazo { limite?: n }     → todas las compras aprobadas sin aviso; marca ventas.reemplazo_enviado_en
//                                  y deja ventas.descargas en {} para que puedan bajar de nuevo los archivos.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

type Venta = { id: number; nombre: string; correo: string; referencia: string; token_descarga: string };
type Entorno = {
  db: SupabaseClient; site: string; contacto: string; limite: number;
  enviar: (correo: string, nombre: string, asunto: string, html: string, texto: string, etiqueta: string) => Promise<boolean>;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const DE_PRUEBA = /@example\.(com|org|net)$/i;

export function correoReemplazo(v: Venta, e: Entorno) {
  const nombre = v.nombre.trim().replace(/\s+/g, " ");
  const url = `${e.site}/descargas?d=${v.token_descarga}`;
  const P = (t: string, extra = "") =>
    `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:#D3D1D9;${extra}">${t}</p>`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>Orden de reemplazo de ejemplar</title></head>
<body style="margin:0;padding:0;background:#1F2235;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Filtración detectada. Tu ejemplar corregido ya está en tu enlace personal.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1F2235;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#E0806C;">Cuerpo de Seguridad de la Fertilidad · Aviso de reemplazo</td></tr>
<tr><td style="background:#282C44;border:1px solid #3A3F5C;border-top:4px solid #E0806C;border-radius:8px;padding:36px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #3A3F5C;border-radius:6px;">
    <tr>
      <td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A9AEC4;">Titular<br><span style="font-size:15px;letter-spacing:0;text-transform:none;color:#F1ECE2;">${esc(nombre)}</span></td>
      <td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A9AEC4;border-left:1px solid #3A3F5C;">Ejemplar<br><span style="font-size:15px;letter-spacing:0;text-transform:none;color:#F1ECE2;">${esc(v.referencia)}</span></td>
    </tr>
  </table>
  <h1 style="margin:0 0 22px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:26px;line-height:1.15;text-transform:uppercase;color:#F1ECE2;">Filtración detectada.<br><span style="color:#E0806C;">Tu ejemplar debe ser reemplazado.</span></h1>
  ${P("El Cuerpo de Seguridad de la Fertilidad detectó una filtración en el sistema que alteró el ejemplar que recibiste. Por orden del Cuerpo, la copia anterior queda fuera de circulación.")}
  ${P(`Tu ejemplar corregido ya está disponible en tu mismo enlace personal, marcado con tu nombre. <strong style="color:#F1ECE2;">Tus descargas fueron restablecidas.</strong>`)}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:#E0806C;border-radius:6px;">
    <a href="${url}" style="display:inline-block;padding:16px 28px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#1F2235;text-decoration:none;">Descargar mi ejemplar corregido &rarr;</a>
  </td></tr></table>
  ${P("Descarta la copia anterior. La ventanilla no pregunta quién eres. Pregunta qué versión tienes.", "font-style:italic;color:#A9AEC4;")}
  <div style="margin:28px 0 0;padding:20px 0 0;border-top:1px solid #3A3F5C;">
    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#4FA3C7;">Fuera del registro</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#D3D1D9;">Encontré un error en la edición y lo corregí. Tus datos están bien y no tienes que hacer nada más que descargar de nuevo el EPUB o el PDF. Gracias por leer. <span style="color:#F1ECE2;">— Daniel</span></p>
  </div>
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#A9AEC4;">
  Recibes este correo porque compraste <a href="${e.site}" style="color:#A9AEC4;">Volver a sumar</a>.
  ¿Algún problema con tu descarga? Responde a este correo o escribe a <a href="mailto:${e.contacto}" style="color:#A9AEC4;">${e.contacto}</a>.
</td></tr>
</table></td></tr></table></body></html>`;
  const texto = `CUERPO DE SEGURIDAD DE LA FERTILIDAD · AVISO DE REEMPLAZO

Titular: ${nombre} · Ejemplar ${v.referencia}

Filtración detectada. Tu ejemplar debe ser reemplazado.

El Cuerpo de Seguridad de la Fertilidad detectó una filtración en el sistema que alteró el ejemplar que recibiste. Por orden del Cuerpo, la copia anterior queda fuera de circulación.

Tu ejemplar corregido ya está disponible en tu mismo enlace personal, marcado con tu nombre. Tus descargas fueron restablecidas:
${url}

Descarta la copia anterior. La ventanilla no pregunta quién eres. Pregunta qué versión tienes.

---
Fuera del registro: encontré un error en la edición y lo corregí. Tus datos están bien y no tienes que hacer nada más que descargar de nuevo el EPUB o el PDF. Gracias por leer. — Daniel

¿Algún problema? Escribe a ${e.contacto}.`;
  return { asunto: "Orden de reemplazo: tu ejemplar de Volver a sumar", html, texto };
}

const CAMPOS = "id, nombre, correo, referencia, token_descarga";

export async function reemplazar(body: Record<string, unknown>, e: Entorno) {
  if (typeof body.prueba === "string") {
    const patron = body.prueba.trim().toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c);
    const { data: v } = await e.db.from("ventas").select(CAMPOS).ilike("correo", patron).eq("estado", "APPROVED")
      .order("id", { ascending: false }).limit(1).maybeSingle<Venta>();
    if (!v) return [404, { ok: false, error: "Ese correo no tiene compras aprobadas" }] as const;
    const c = correoReemplazo(v, e);
    const ok = await e.enviar(v.correo, v.nombre, c.asunto, c.html, c.texto, "reemplazo-prueba");
    return [200, { ok, prueba: v.correo, pedido: v.referencia }] as const;
  }
  const limite = Math.min(Math.max(Number(body.limite) || 300, 1), 500);
  const { data, error } = await e.db.from("ventas").select(CAMPOS).eq("estado", "APPROVED")
    .is("reemplazo_enviado_en", null).order("id").limit(limite);
  if (error) throw error;
  // Fuera las compras de prueba (correos @example.* y los del propio autor).
  const lista = ((data ?? []) as Venta[]).filter((v) => !DE_PRUEBA.test(v.correo) && v.correo.toLowerCase() !== e.contacto.toLowerCase());
  let enviados = 0, fallidos = 0;
  for (const v of lista) {
    // Primero se reinician las descargas, para que el enlace funcione apenas llegue el correo.
    await e.db.from("ventas").update({ descargas: {} }).eq("id", v.id);
    const c = correoReemplazo(v, e);
    if (await e.enviar(v.correo, v.nombre, c.asunto, c.html, c.texto, "reemplazo")) {
      await e.db.from("ventas").update({ reemplazo_enviado_en: new Date().toISOString() }).eq("id", v.id);
      enviados++;
    } else fallidos++;
  }
  return [200, { ok: true, compras: lista.length, enviados, fallidos }] as const;
}
