// Correo de lanzamiento para el registro, enviado por tandas sin pasarse del cupo diario de Brevo.
//   lanzar { prueba: correo }                          → un solo correo de prueba (no marca a nadie)
//   lanzar { limite?: n, solo_t14?: bool, margen?: n } → tanda real; marca registros.lanzamiento_enviado_en
//   cupo                                               → cuántos correos quedan hoy en Brevo
// La tanda nunca supera lo que queda en Brevo menos el margen (80 por defecto), reservado para
// confirmaciones de compra y bienvenidas, también las de otras páginas que usan la misma cuenta.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const DE: Record<string, string> = {
  norteamerica: "de Norteamérica", mesoamerica: "de Mesoamérica y el Caribe", suramerica: "de Suramérica",
  europa_occidental: "de Europa Occidental", europa_oriental: "de Europa Oriental y Asia Central",
  magreb: "del Magreb y Mediterráneo Oriental", africa_occidental: "de África Occidental",
  africa_oriental: "de África Oriental", africa_austral: "de África Austral", asia_occidental: "de Asia Occidental",
  asia_meridional: "de Asia Meridional", asia_oriental: "de Asia Oriental", sudeste_asiatico: "del Sudeste Asiático",
  oceania: "de Oceanía",
};

type Resultado = { categoria: string; centro: string | null; funcion: string | null; sector: number | null } | null;
type Destinatario = { id: number; nombre: string; correo: string; token: string; resultado: Resultado };
type Entorno = {
  db: SupabaseClient; site: string; contacto: string; brevoKey: string;
  enviar: (correo: string, nombre: string, asunto: string, html: string, texto: string, etiqueta: string) => Promise<boolean>;
  precioNormal: number; precioLanzamiento: number; lanzamientoHasta: string;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const pesos = (n: number) => "$" + n.toLocaleString("es-CO").replace(/,/g, ".");
const dia = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" }).format(new Date(iso));

// La línea que cambia según el resultado del formulario T-14.
function lineaT14(r: Resultado): { html: string; texto: string } | null {
  if (!r) return null;
  if (r.categoria === "ESPERA") {
    const t = "Tu formulario T-14 te dejó en lista de espera abierta, fuera del perímetro. Ahí afuera, donde nadie registra nada, empieza esta historia.";
    return { html: esc(t), texto: t };
  }
  const alCentro = r.centro ? `al Centro de Reunión ${DE[r.centro] ?? ""}` : "a un Centro de Reunión";
  if (r.categoria === "B") {
    const t = `Tu formulario T-14 te autorizó el traslado ${alCentro}, con el costo a tu cargo. Esta vez el cupo te sale más barato.`;
    return { html: esc(t), texto: t };
  }
  const t = `Tu formulario T-14 te asignó ${alCentro}, sector ${r.sector}: ${r.funcion}. Ya puedes leer lo que pasa dentro de un Centro… y lo que el Centro no quiere que veas.`;
  return { html: esc(t), texto: t };
}

export function correoLanzamiento(d: Destinatario, e: Entorno) {
  const n = (d.nombre.trim().split(/\s+/)[0] ?? "");
  const url = `${e.site}/comprar?t=${d.token}`;
  const hasta = dia(e.lanzamientoHasta);
  const t14 = lineaT14(d.resultado);
  const P = (t: string) => `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:#D3D1D9;">${t}</p>`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>Ya salió Volver a sumar</title></head>
<body style="margin:0;padding:0;background:#1F2235;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">La novela completa ya está a la venta. Para ti, ${pesos(e.precioLanzamiento)} hasta el ${hasta}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1F2235;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4FA3C7;">Registro de elegibilidad · Lanzamiento</td></tr>
<tr><td style="background:#282C44;border:1px solid #3A3F5C;border-radius:8px;padding:36px 32px;">
  <a href="${url}"><img src="${e.site}/correo/portada.jpg" width="150" alt="Portada de Volver a sumar" style="display:block;width:150px;height:auto;border-radius:4px;border:0;margin:0 0 24px;"></a>
  <h1 style="margin:0 0 22px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:26px;line-height:1.15;text-transform:uppercase;color:#F1ECE2;">Ya salió Volver a sumar.<br><span style="color:#E0806C;">Tu precio: ${pesos(e.precioLanzamiento)}.</span></h1>
  ${P(`Hola${n ? " " + esc(n) : ""}:`)}
  ${P(`La novela completa ya está a la venta, en EPUB y PDF. Por estar en el registro de elegibilidad, tu precio es <strong style="color:#F1ECE2;">${pesos(e.precioLanzamiento)}</strong> en lugar de ${pesos(e.precioNormal)}, hasta el <strong style="color:#F1ECE2;">${hasta}</strong>.`)}
  ${t14 ? P(t14.html) : ""}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;"><tr><td style="background:#E0806C;border-radius:6px;">
    <a href="${url}" style="display:inline-block;padding:16px 28px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#1F2235;text-decoration:none;">Comprar con mi precio &rarr;</a>
  </td></tr></table>
  <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#D3D1D9;">Pagas con Wompi (tarjeta, PSE, Nequi o Bancolombia) y el libro te llega al correo apenas se aprueba el pago. Cada ejemplar lleva el nombre de quien lo compra.</p>
  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#A9AEC4;">Usa este mismo correo al comprar para que se aplique tu precio. Y quienes compren tendrán después una sorpresa con el cómic <em>La Decisión</em>.</p>
  <p style="margin:30px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#F1ECE2;">Daniel Palacio P.</p>
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#A9AEC4;">
  Recibes este correo porque te inscribiste en el registro de elegibilidad de <a href="${e.site}" style="color:#A9AEC4;">Volver a sumar</a>.
  Si no quieres recibir más correos, escribe a <a href="mailto:${e.contacto}" style="color:#A9AEC4;">${e.contacto}</a>.
  <a href="${e.site}/privacidad" style="color:#A9AEC4;">Política de privacidad</a>.
</td></tr>
</table></td></tr></table></body></html>`;
  const texto = `Hola${n ? " " + n : ""}:

Volver a sumar ya está a la venta, en EPUB y PDF. Por estar en el registro de elegibilidad, tu precio es ${pesos(e.precioLanzamiento)} en lugar de ${pesos(e.precioNormal)}, hasta el ${hasta}.
${t14 ? "\n" + t14.texto + "\n" : ""}
Compra con tu precio aquí (usa este mismo correo):
${url}

El libro te llega al correo apenas se aprueba el pago. Quienes compren tendrán después una sorpresa con el cómic La Decisión.

Daniel Palacio P.

Si no quieres recibir más correos, escribe a ${e.contacto}.`;
  return { asunto: `Ya salió Volver a sumar: tu precio de inscrito es ${pesos(e.precioLanzamiento)}`, html, texto };
}

// Correos que quedan hoy en el plan de Brevo (null si no se pudo saber).
export async function cupoBrevo(brevoKey: string): Promise<number | null> {
  const r = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": brevoKey, accept: "application/json" } });
  if (!r.ok) { console.error("Brevo cuenta", r.status, await r.text()); return null; }
  const j = await r.json();
  const planes = (j?.plan ?? []) as { type?: string; credits?: number; creditsType?: string }[];
  const envio = planes.find((p) => p.creditsType === "sendLimit") ?? planes.find((p) => typeof p.credits === "number");
  return typeof envio?.credits === "number" ? envio.credits : null;
}

async function destinatarioPorCorreo(db: SupabaseClient, correo: string): Promise<Destinatario | null> {
  const patron = correo.trim().toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c);
  const { data } = await db.from("registros").select("id, nombre, correo, token, asignaciones(resultado)")
    .ilike("correo", patron).limit(1).maybeSingle();
  if (!data) return null;
  const a = Array.isArray(data.asignaciones) ? data.asignaciones[0] : data.asignaciones;
  return { id: data.id, nombre: data.nombre, correo: data.correo, token: data.token, resultado: (a?.resultado ?? null) as Resultado };
}

async function pendientes(db: SupabaseClient, soloT14: boolean, n: number): Promise<Destinatario[]> {
  if (n <= 0) return [];
  if (soloT14) {
    // Primero quienes llenaron el T-14 más recientemente.
    const { data, error } = await db.from("asignaciones")
      .select("creado_en, resultado, registros!inner(id, nombre, correo, token, lanzamiento_enviado_en)")
      .is("registros.lanzamiento_enviado_en", null).order("creado_en", { ascending: false }).limit(n);
    if (error) throw error;
    return (data ?? []).map((a) => {
      const r = (Array.isArray(a.registros) ? a.registros[0] : a.registros) as { id: number; nombre: string; correo: string; token: string };
      return { id: r.id, nombre: r.nombre, correo: r.correo, token: r.token, resultado: a.resultado as Resultado };
    });
  }
  const { data, error } = await db.from("registros").select("id, nombre, correo, token, asignaciones(resultado)")
    .is("lanzamiento_enviado_en", null).order("id", { ascending: false }).limit(n);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const a = Array.isArray(r.asignaciones) ? r.asignaciones[0] : r.asignaciones;
    return { id: r.id, nombre: r.nombre, correo: r.correo, token: r.token, resultado: (a?.resultado ?? null) as Resultado };
  });
}

export async function lanzar(body: Record<string, unknown>, e: Entorno) {
  if (typeof body.prueba === "string") {
    const d = await destinatarioPorCorreo(e.db, body.prueba);
    if (!d) return [404, { ok: false, error: "Ese correo no está en el registro" }] as const;
    const c = correoLanzamiento(d, e);
    const ok = await e.enviar(d.correo, d.nombre, c.asunto, c.html, c.texto, "lanzamiento-prueba");
    return [200, { ok, prueba: d.correo, con_t14: !!d.resultado }] as const;
  }
  const limite = Math.min(Math.max(Number(body.limite) || 100, 1), 300);
  const margen = Math.max(Number(body.margen ?? 80), 0);
  const cupo = await cupoBrevo(e.brevoKey);
  const tanda = cupo == null ? limite : Math.min(limite, Math.max(cupo - margen, 0));
  const lista = await pendientes(e.db, body.solo_t14 === true, tanda);
  let enviados = 0, fallidos = 0;
  for (const d of lista) {
    const c = correoLanzamiento(d, e);
    if (await e.enviar(d.correo, d.nombre, c.asunto, c.html, c.texto, "lanzamiento")) {
      await e.db.from("registros").update({ lanzamiento_enviado_en: new Date().toISOString() }).eq("id", d.id);
      enviados++;
    } else fallidos++;
  }
  const { count: faltan } = await e.db.from("registros").select("id", { count: "exact", head: true }).is("lanzamiento_enviado_en", null);
  return [200, { ok: true, cupo_brevo_antes: cupo, margen, tanda, enviados, fallidos, faltan }] as const;
}
