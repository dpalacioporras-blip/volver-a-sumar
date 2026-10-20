# Volver a sumar · Registro de elegibilidad

Registro de elegibilidad: quien se inscribe recibe el Capítulo 1 y el precio de lanzamiento del ebook *Volver a sumar*, de Daniel Palacio.

## Cómo está armada

- `index.html`: la landing. El formulario envía nombre y correo directamente a Supabase.
- `privacidad.html`: política de tratamiento de datos (Ley 1581 de 2012), servida en `/privacidad`.
- `portada.webp`: portada del libro.
- `vercel.json`: URLs limpias y cabeceras de seguridad.

Es un sitio estático: no hay que compilar nada. Vercel publica cada cambio que se sube a la rama `main`.

## Dónde quedan los registros

Supabase → proyecto **volver-a-sumar** → Table Editor → tabla `registros`.
Columnas: `nombre`, `correo`, `acepta_datos`, `creado_en`.
Para exportar: botón **Export → CSV** en el Table Editor.

## Seguridad

- La clave que aparece en `index.html` es la clave *publicable* de Supabase: está hecha para ir en el navegador.
- La tabla tiene RLS activado. Desde la web solo se puede **insertar** (nombre, correo, autorización); nadie puede leer, editar ni borrar registros.
- Un correo repetido no crea un segundo registro (índice único sin distinguir mayúsculas).
- Un campo oculto filtra los bots más simples.

## Correo de bienvenida (Capítulo 1)

- `descargas/volver-a-sumar-capitulo-1.pdf`: el adelanto que recibe cada persona registrada.
- `correo/portada.jpg`: portada en JPG para el correo (los clientes de correo no siempre muestran WebP).
- `supabase/functions/bienvenida/index.ts`: función de Supabase que, cuando entra un registro nuevo,
  lo agrega a la lista de Brevo y le envía el correo con el enlace al PDF. Marca `bienvenida_enviada_en`
  para no enviar dos veces.
- Configuración (secretos de la función en Supabase): `BREVO_API_KEY`, `BREVO_LIST_ID`, `SENDER_EMAIL`,
  y opcionales `SENDER_NAME` y `SITE_URL`.
