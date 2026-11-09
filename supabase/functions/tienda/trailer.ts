// Correo del tráiler (9 nov 2026) para los inscritos que aún no han comprado.
//   trailer { prueba: correo } → un solo correo de prueba (no marca a nadie)
//   trailer { limite?: n }     → inscritos sin compra aprobada y sin este correo; marca registros.trailer_enviado_en
// Quien intentó pagar y no lo logró recibe además una línea con otros medios de pago.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const TRAILER_URL = "https://youtu.be/NApUhG3cRgI";

type Inscrito = { id: number; nombre: string; correo: string; token: string };
type Entorno = {
  db: SupabaseClient; site: string; contacto: string;
  enviar: (correo: string, nombre: string, asunto: string, html: string, texto: string, etiqueta: string) => Promise<boolean>;
  precioNormal: number; precioLanzamiento: number; lanzamientoHasta: string; lanzamientoVigente: boolean;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const pesos = (n: number) => "$" + n.toLocaleString("es-CO").replace(/,/g, ".");
const dia = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" }).format(new Date(iso));

export function correoTrailer(d: Inscrito, intento: boolean, e: Entorno) {
  const n = d.nombre.trim().split(/\s+/)[0] ?? "";
  const compra = `${e.site}/comprar?t=${d.token}`;
  const precio = e.lanzamientoVigente
    ? `Tu precio de inscrito, <strong style="color:#F1ECE2;">${pesos(e.precioLanzamiento)}</strong> en lugar de ${pesos(e.precioNormal)}, vence el <strong style="color:#F1ECE2;">${dia(e.lanzamientoHasta)}</strong>.`
    : `La novela completa ya está disponible en EPUB y PDF por <strong style="color:#F1ECE2;">${pesos(e.precioNormal)}</strong>.`;
  const precioTxt = precio.replace(/<[^>]+>/g, "");
  const reintento = "Si tu pago no pasó la otra vez, puedes intentarlo con Nequi, PSE, Daviplata o transferencia Bancolombia. Usa este mismo correo para conservar tu precio.";
  const P = (t: string, extra = "") =>
    `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.6;color:#D3D1D9;${extra}">${t}</p>`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>Material recuperado del perímetro</title></head>
<body style="margin:0;padding:0;background:#1F2235;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Esto no debía salir del perímetro. Míralo antes de que lo retiren.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1F2235;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#4FA3C7;">Registro audiovisual · Material recuperado</td></tr>
<tr><td style="background:#282C44;border:1px solid #3A3F5C;border-radius:8px;overflow:hidden;">
  <a href="${TRAILER_URL}" style="display:block;text-decoration:none;"><img src="${e.site}/correo/trailer.jpg" width="560" alt="Ver el tráiler oficial de Volver a sumar" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:8px 8px 0 0;"></a>
  <div style="padding:30px 32px 36px;">
  <h1 style="margin:0 0 20px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:24px;line-height:1.15;text-transform:uppercase;color:#F1ECE2;">Material recuperado<br><span style="color:#E0806C;">del perímetro.</span></h1>
  ${P(`${n ? esc(n) + ", esto" : "Esto"} no debía salir del perímetro. Alguien grabó lo que pasa afuera, donde la cuenta solo baja, y el registro llegó hasta nosotros. Míralo antes de que lo retiren.`)}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 26px;"><tr><td style="border:1px solid #F1ECE2;border-radius:6px;">
    <a href="${TRAILER_URL}" style="display:inline-block;padding:14px 24px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#F1ECE2;text-decoration:none;">&#9654;&nbsp; Ver el tráiler</a>
  </td></tr></table>
  <div style="padding:22px 0 0;border-top:1px solid #3A3F5C;">
  ${P(`Lo que viene después está en la novela. ${precio}`)}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 ${intento ? "18px" : "0"};"><tr><td style="background:#E0806C;border-radius:6px;">
    <a href="${compra}" style="display:inline-block;padding:16px 28px;font-family:Arial Black,Arial,Helvetica,sans-serif;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#1F2235;text-decoration:none;">${e.lanzamientoVigente ? "Comprar con mi precio" : "Comprar el libro"} &rarr;</a>
  </td></tr></table>
  ${intento ? `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#D3D1D9;">${reintento}</p>` : ""}
  </div>
  <p style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#F1ECE2;">Daniel Palacio P.</p>
  </div>
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#A9AEC4;">
  Recibes este correo porque te inscribiste en el registro de elegibilidad de <a href="${e.site}" style="color:#A9AEC4;">Volver a sumar</a>.
  Si no quieres recibir más correos, escribe a <a href="mailto:${e.contacto}" style="color:#A9AEC4;">${e.contacto}</a>.
  <a href="${e.site}/privacidad" style="color:#A9AEC4;">Política de privacidad</a>.
</td></tr>
</table></td></tr></table></body></html>`;
  const texto = `${n ? n + ", esto" : "Esto"} no debía salir del perímetro. Alguien grabó lo que pasa afuera, donde la cuenta solo baja, y el registro llegó hasta nosotros. Míralo antes de que lo retiren:
${TRAILER_URL}

Lo que viene después está en la novela. ${precioTxt}
${compra}
${intento ? "\n" + reintento + "\n" : ""}
Daniel Palacio P.

Si no quieres recibir más correos, escribe a ${e.contacto}.`;
  return { asunto: "Material recuperado: el tráiler de Volver a sumar", html, texto };
}

// Inscritos sin compra aprobada (por registro o por correo), con la marca de si intentaron pagar.
async function sinComprar(db: SupabaseClient) {
  const [{ data: regs, error }, { data: ventas, error: e2 }] = await Promise.all([
    db.from("registros").select("id, nombre, correo, token, trailer_enviado_en").order("id"),
    db.from("ventas").select("registro_id, correo, estado"),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  const compro = new Set<string>(), intento = new Set<string>();
  for (const v of ventas ?? []) {
    const claves = [v.registro_id != null ? `id:${v.registro_id}` : "", `c:${String(v.correo).toLowerCase()}`];
    for (const k of claves) if (k) (v.estado === "APPROVED" ? compro : intento).add(k);
  }
  const de = (r: { id: number; correo: string }) => [`id:${r.id}`, `c:${r.correo.toLowerCase()}`];
  return (regs ?? [])
    .filter((r) => !de(r).some((k) => compro.has(k)))
    .map((r) => ({ ...r, intento: de(r).some((k) => intento.has(k)) }));
}

export async function trailer(body: Record<string, unknown>, e: Entorno) {
  if (typeof body.prueba === "string") {
    const patron = body.prueba.trim().toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c);
    const { data: d } = await e.db.from("registros").select("id, nombre, correo, token").ilike("correo", patron).limit(1).maybeSingle<Inscrito>();
    if (!d) return [404, { ok: false, error: "Ese correo no está en el registro" }] as const;
    const conIntento = body.con_intento === true;
    const c = correoTrailer(d, conIntento, e);
    const ok = await e.enviar(d.correo, d.nombre, c.asunto, c.html, c.texto, "trailer-prueba");
    return [200, { ok, prueba: d.correo, con_intento: conIntento }] as const;
  }
  const limite = Math.min(Math.max(Number(body.limite) || 500, 1), 1000);
  const todos = await sinComprar(e.db);
  const lista = todos.filter((r) => !r.trailer_enviado_en).slice(0, limite);
  let enviados = 0, fallidos = 0, conIntento = 0;
  for (const d of lista) {
    const c = correoTrailer(d, d.intento, e);
    if (await e.enviar(d.correo, d.nombre, c.asunto, c.html, c.texto, "trailer")) {
      await e.db.from("registros").update({ trailer_enviado_en: new Date().toISOString() }).eq("id", d.id);
      enviados++;
      if (d.intento) conIntento++;
    } else fallidos++;
  }
  return [200, { ok: true, sin_comprar: todos.length, enviados, con_intento: conIntento, fallidos, faltan: lista.length - enviados }] as const;
}
