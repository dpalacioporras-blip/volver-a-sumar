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
  para no enviar dos veces. Desde el 28 de octubre de 2026 la bienvenida incluye también el enlace personal
  al formulario T-14 y marca `t14_anuncio_enviado_en`, para que el anuncio de la segunda entrega no se repita.
- Configuración (secretos de la función en Supabase): `BREVO_API_KEY`, `BREVO_LIST_ID`, `SENDER_EMAIL`,
  y opcionales `SENDER_NAME` y `SITE_URL`.

## Segunda entrega: formulario T-14 (`/t14`)

Juego de asignación a un Centro de Reunión. Cada persona inscrita tiene un enlace personal
(`/t14?t=<token>`), llena 14 preguntas y recibe una credencial para historias (o una constancia de
"no asignado"). La solicitud se radica una sola vez.

- `t14/index.html`: la página (acceso, aviso, preguntas, revisión y firma, resultado).
- `t14/datos.js`: preguntas, países → Centros, oficios → funciones y sectores, reglas y textos. **Es la única
  fuente de las reglas.** Si lo cambias, copia el archivo a `supabase/functions/t14/datos.js` y vuelve a publicar la función.
- `t14/credencial.js`: dibuja la credencial de 1080×1920 en el navegador.
- `t14/og.jpg`: vista previa del enlace en redes.
- `supabase/functions/t14/`: función `t14` (sin verificación JWT; el token del enlace es la llave). Acciones:
  `estado`, `radicar`, `enlace` (inscribe o reenvía el enlace por correo) y, con clave de administración,
  `anunciar` y `sincronizar`.
- `supabase/migrations/20261023_t14.sql`: columna `token` en `registros`, tabla `asignaciones`, tabla privada
  `t14_config` (guarda la clave `admin_key`, que no está en el repositorio) y la función `t14_admin`.

Los resultados quedan en Supabase → tabla `asignaciones` y en Brevo como atributos del contacto:
`T14_ENLACE`, `T14_CATEGORIA` (A, B o LISTA DE ESPERA), `T14_CENTRO`, `T14_SEDE`, `T14_FUNCION`, `T14_SECTOR`
y `T14_EXPEDIENTE`. En una campaña de Brevo se usan así: `{{ contact.T14_CENTRO }}`.

Comandos desde el editor SQL de Supabase:

```sql
-- Correo de la segunda entrega a una sola dirección inscrita, para revisarlo
select public.t14_admin('anunciar', '{"prueba": "tu@correo.com"}');
-- Envío real a quienes aún no lo recibieron (por tandas de hasta 250)
select public.t14_admin('anunciar', '{"limite": 150}');
-- Copiar enlaces y resultados a Brevo (por tandas; usa "desde" con el ultimo_id de la respuesta)
select public.t14_admin('sincronizar');
-- Ver la respuesta de la última llamada
select status_code, content from net._http_response order by id desc limit 1;
```

Los correos `@example.com` no tocan Brevo: sirven para probar.

## Tienda (`/comprar`)

Venta del ebook con Wompi. Páginas: `comprar/index.html` (/comprar), `comprar/gracias.html` (regreso de Wompi),
`descargas.html` (/descargas?d=…), `terminos.html` y `tienda.css`. Función de Supabase `tienda` (sin verificación JWT).

- Precios y fechas en la tabla `tienda_config` (`precio_normal`, `precio_lanzamiento`, `apertura`, `lanzamiento_hasta`,
  `limite_descargas`). Se cambian desde el editor SQL, sin publicar nada:
  `update public.tienda_config set valor = '30000' where clave = 'precio_normal';`
- Precio de lanzamiento: si el correo del comprador está en `registros` (o llega con su enlace personal `?t=`).
- Pedidos en la tabla `ventas`. Wompi avisa a `https://jcsdruohnwkfsonesonx.supabase.co/functions/v1/tienda`
  (evento firmado) y la página de regreso también consulta la transacción. Al aprobarse, sale el correo con el enlace de descargas.
- Archivos: Storage → `libro/originales/volver-a-sumar.epub` y `.pdf`. Cada comprador recibe copias marcadas con su nombre,
  correo y pedido (`libro/personalizados/<pedido>/`), generadas en la primera descarga.
- Secretos de la función: `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` (con llaves `pub_test_` usa el sandbox de Wompi).

Ventas aprobadas:
```sql
select referencia, nombre, correo, monto_centavos / 100 as pesos, tipo_precio, metodo, aprobado_en
from public.ventas where estado = 'APPROVED' order by aprobado_en desc;
```
