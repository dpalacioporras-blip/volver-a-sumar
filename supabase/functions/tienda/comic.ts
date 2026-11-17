// Correo del cómic La Decisión (17 nov 2026) para quienes compraron la novela.
//   comic { prueba: correo, pendiente?: bool } → un solo correo de prueba (no marca nada)
//   comic { limite?: n }                       → compras aprobadas sin este correo; marca ventas.comic_enviado_en
// Quien recibió el aviso de reemplazo y aún no bajó la novela corregida recibe además un recordatorio.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

type Venta = { id: number; nombre: string; correo: string; referencia: string; token_descarga: string };
type Fila = Venta & { descargas: Record<string, number> | null; reemplazo_enviado_en: string | null };
type Entorno = {
  db: SupabaseClient; site: string; contacto: string;
  enviar: (correo: string, nombre: string, asunto: string, html: string, texto: string, etiqueta: string) => Promise<boolean>;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const DE_PRUEBA = /@example\.(com|org|net)$/i;

// ¿Recibió el aviso de reemplazo y todavía no descargó la novela corregida?
const sinCorregida = (v: Fila) => !!v.reemplazo_enviado_en && !(v.descargas?.epub || v.descargas?.pdf);

export function correoComic(v: Venta, pendiente: boolean, e: Entorno) {
  const nombre = v.nombre.trim().replace(/\s+/g, " ");
  const url = `${e.site}/descargas?d=${v.token_descarga}`;
  const P = (t: string, extra = "") =>
    `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:#D3D1D9;${extra}">${t}</p>`;
  const recordatorio = "Pendiente en tu expediente: todavía no descargas tu ejemplar corregido de la novela. Está en el mismo enlace, junto al cómic.";
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>Expediente desclasificado: La Decisión</title></head>
<body style="margin:0;padding:0;background:#1F2235;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Un expediente que no estaba en el registro. Ahora es tuyo.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1F2235;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#7FC4B4;">Archivo desclasificado · Solo para titulares</td></tr>
<tr><td style="background:#282C44;border:1px solid #3A3F5C;border-top:4px solid #7FC4B4;border-radius:8px;padding:36px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #3A3F5C;border-radius:6px;">
    <tr>
      <td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A9AEC4;">Titular<br><span style="font-size:15px;letter-spacing:0;text-transform:none;color:#F1ECE2;">${esc(nombre)}</span></td>
      <td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A9AEC4;border-left:1px solid #3A3F5C;">Autorización<br><span style="font-size:15px;letter-spacing:0;text-transform:none;color:#F1ECE2;">${esc(v.referencia)}</span></td>
    </tr>
  </table>
  <h1 style="margin:0 0 22px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:26px;line-height:1.15;text-transform:uppercase;color:#F1ECE2;">Expediente desclasificado:<br><span style="color:#7FC4B4;">La Decisión.</span></h1>
  ${P("Como titular de un ejemplar de <em>Volver a sumar</em>, quedas autorizado para abrir un expediente que no estaba en el registro: el primer capítulo de <strong style=\"color:#F1ECE2;\">La Decisión</strong>, en cómic.")}
  ${P("Ya está en tu página de descargas, junto a tu ejemplar de la novela.")}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 ${pendiente ? "22px" : "24px"};"><tr><td style="background:#7FC4B4;border-radius:6px;">
    <a href="${url}" style="display:inline-block;padding:16px 28px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#1F2235;text-decoration:none;">Abrir el expediente &rarr;</a>
  </td></tr></table>
  ${pendiente ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="padding:14px 16px;border:1px solid #E0806C;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#F1ECE2;"><span style="display:block;margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#E0806C;">Pendiente</span>Todavía no descargas tu ejemplar corregido de la novela. Está en el mismo enlace, junto al cómic.</td></tr></table>` : ""}
  ${P("Lo que se decide una vez no se vuelve a decidir.", "font-style:italic;color:#A9AEC4;")}
  <div style="margin:28px 0 0;padding:20px 0 0;border-top:1px solid #3A3F5C;">
    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#4FA3C7;">Fuera del registro</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#D3D1D9;">El cómic es mi regalo para quienes compraron la novela. Gracias por estar desde el principio. <span style="color:#F1ECE2;">— Daniel</span></p>
  </div>
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#A9AEC4;">
  Recibes este correo porque compraste <a href="${e.site}" style="color:#A9AEC4;">Volver a sumar</a>.
  ¿Algún problema con tu descarga? Responde a este correo o escribe a <a href="mailto:${e.contacto}" style="color:#A9AEC4;">${e.contacto}</a>.
</td></tr>
</table></td></tr></table></body></html>`;
  const texto = `ARCHIVO DESCLASIFICADO · SOLO PARA TITULARES

Titular: ${nombre} · Autorización ${v.referencia}

Expediente desclasificado: La Decisión.

Como titular de un ejemplar de Volver a sumar, quedas autorizado para abrir un expediente que no estaba en el registro: el primer capítulo de La Decisión, en cómic. Ya está en tu página de descargas, junto a tu ejemplar de la novela:
${url}
${pendiente ? "\n" + recordatorio + "\n" : ""}
Lo que se decide una vez no se vuelve a decidir.

---
Fuera del registro: el cómic es mi regalo para quienes compraron la novela. Gracias por estar desde el principio. — Daniel

¿Algún problema? Escribe a ${e.contacto}.`;
  return { asunto: "Expediente desclasificado: La Decisión", html, texto };
}

const CAMPOS = "id, nombre, correo, referencia, token_descarga, descargas, reemplazo_enviado_en";

export async function comic(body: Record<string, unknown>, e: Entorno) {
  if (typeof body.prueba === "string") {
    const patron = body.prueba.trim().toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c);
    const { data: v } = await e.db.from("ventas").select(CAMPOS).ilike("correo", patron).eq("estado", "APPROVED")
      .order("id", { ascending: false }).limit(1).maybeSingle<Fila>();
    if (!v) return [404, { ok: false, error: "Ese correo no tiene compras aprobadas" }] as const;
    const pendiente = body.pendiente === true;
    const c = correoComic(v, pendiente, e);
    const ok = await e.enviar(v.correo, v.nombre, c.asunto, c.html, c.texto, "comic-prueba");
    return [200, { ok, prueba: v.correo, pedido: v.referencia, pendiente }] as const;
  }
  const limite = Math.min(Math.max(Number(body.limite) || 300, 1), 500);
  const { data, error } = await e.db.from("ventas").select(CAMPOS).eq("estado", "APPROVED")
    .is("comic_enviado_en", null).order("id").limit(limite);
  if (error) throw error;
  const lista = ((data ?? []) as Fila[]).filter((v) => !DE_PRUEBA.test(v.correo) && v.correo.toLowerCase() !== e.contacto.toLowerCase());
  let enviados = 0, fallidos = 0, conRecordatorio = 0;
  for (const v of lista) {
    const pendiente = sinCorregida(v);
    const c = correoComic(v, pendiente, e);
    if (await e.enviar(v.correo, v.nombre, c.asunto, c.html, c.texto, "comic")) {
      await e.db.from("ventas").update({ comic_enviado_en: new Date().toISOString() }).eq("id", v.id);
      enviados++;
      if (pendiente) conRecordatorio++;
    } else fallidos++;
  }
  return [200, { ok: true, compras: lista.length, enviados, con_recordatorio: conRecordatorio, fallidos }] as const;
}
