// Marca cada ejemplar con los datos del comprador ("marca de agua social"): no traba la lectura,
// pero desanima compartir el archivo.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { strFromU8, strToU8, unzipSync, zipSync } from "npm:fflate@0.8.2";

export type Comprador = { nombre: string; correo: string; pedido: string; fecha: string };

// Las fuentes estándar del PDF solo cubren Latin-1 (más el punto medio): lo demás se omite.
function latin1(s: string) {
  return [...s].filter((c) => c.charCodeAt(0) <= 0xff).join("").replace(/\s+/g, " ").replace(/\s+·/g, " ·").trim();
}

function escXml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
}

export async function marcarPdf(bytes: Uint8Array, q: Comprador) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const linea = latin1(`Ejemplar de ${q.nombre} · ${q.correo} · Pedido ${q.pedido}`);
  for (const p of doc.getPages()) {
    const { width } = p.getSize();
    const w = font.widthOfTextAtSize(linea, 6.5);
    p.drawText(linea, { x: Math.max(12, (width - w) / 2), y: 12, size: 6.5, font, color: rgb(0.55, 0.55, 0.6) });
  }
  doc.setSubject(latin1(`Ejemplar de ${q.nombre} · Pedido ${q.pedido}`));
  return await doc.save({ useObjectStreams: true });
}

export function marcarEpub(bytes: Uint8Array, q: Comprador) {
  const f = unzipSync(bytes);
  const contenedor = f["META-INF/container.xml"];
  if (!contenedor) throw new Error("EPUB sin META-INF/container.xml");
  const opfPath = (strFromU8(contenedor).match(/full-path="([^"]+)"/) || [])[1];
  if (!opfPath || !f[opfPath]) throw new Error("EPUB sin archivo OPF");
  const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const texto = `Este ejemplar de <em>Volver a sumar</em> pertenece a ${escXml(q.nombre)} (${escXml(q.correo)}). ` +
    `Pedido ${escXml(q.pedido)}, ${escXml(q.fecha)}. Gracias por no compartirlo: así se puede seguir escribiendo.`;
  f[base + "exlibris.xhtml"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="es" lang="es">
<head><title>Ex libris</title><meta charset="UTF-8"/></head>
<body><section style="margin-top:40%;text-align:center;font-size:0.85em;line-height:1.6"><p>${texto}</p></section></body>
</html>`);
  let opf = strFromU8(f[opfPath]);
  opf = opf.replace("</manifest>", '<item id="exlibris" href="exlibris.xhtml" media-type="application/xhtml+xml"/></manifest>');
  // Justo después de la primera página (portadilla o cubierta).
  const spine = opf.match(/<spine[^>]*>([\s\S]*?)<\/spine>/);
  if (spine) {
    const primero = (spine[1].match(/<itemref[^>]*\/>/) ?? [])[0];
    const nuevo = primero
      ? spine[0].replace(primero, primero + '<itemref idref="exlibris"/>')
      : spine[0].replace(/<spine([^>]*)>/, '<spine$1><itemref idref="exlibris"/>');
    opf = opf.replace(spine[0], nuevo);
  }
  f[opfPath] = strToU8(opf);
  const { mimetype, ...resto } = f;
  const entradas: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  if (mimetype) entradas["mimetype"] = [mimetype, { level: 0 }]; // debe ir primero y sin comprimir
  for (const [k, v] of Object.entries(resto)) entradas[k] = [v, { level: 6 }];
  return zipSync(entradas);
}
