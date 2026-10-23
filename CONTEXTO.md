# Contexto del proyecto · Volver a sumar

Resumen para retomar el trabajo en una conversación nueva. Estado al 23 de octubre de 2026.

## El libro

- **Volver a sumar**, novela distópica de **Daniel Palacio P.** (así firma; la portada vieja decía "Daniel El Panda", ya no se usa).
- Premisa pública: *"En 2030, por votación global, la humanidad decidió ser la última generación. Veintiocho años después, Jacobo encuentra una raíz."* Quedan menos de medio millón de personas; la portada muestra la cuenta regresiva 412.300 → 412.299 → 412.298.
- Lo que ya es público del universo: el Capítulo 1 (Jacobo, trabajador de saneamiento del sector 9, zona periférica; su compañero Daniel; el "Centro de Reunión" en el núcleo de la ciudad; los oficios se asignan a los 17 años).
- No inventar reglas del universo: criterios, centros y funciones deben venir del autor.

## Qué existe hoy

| Pieza | Dónde |
|---|---|
| Página "Registro de elegibilidad" | https://volverasumar.pandemoniumpodcast.com (también https://volver-a-sumar.vercel.app) |
| Código | GitHub `dpalacioporras-blip/volver-a-sumar` (rama `main`); Vercel publica solo cada cambio |
| Registros | Supabase, proyecto `volver-a-sumar` (id `jcsdruohnwkfsonesonx`), tabla `public.registros` |
| Correo de bienvenida | Función de Supabase `bienvenida` + Brevo, lista **#3** "Volver a sumar", remitente tvpandemonium@gmail.com |
| Capítulo 1 | `descargas/volver-a-sumar-capitulo-1.pdf` (enlace que va en el correo) |
| Piezas gráficas | `piezas/`: banners web (horizontal y vertical), banner de transmisión 1920×260 con QR, historia de Instagram |
| Web principal del autor | https://www.pandemoniumpodcast.com (WordPress, banner enlazado a la página de registro) |

**Promesa del registro:** el Capítulo 1 gratis + precio de lanzamiento. El cómic *La Decisión* es gratis **con la compra** de la novela, no con el registro.

## Cómo funciona

1. La página (`index.html`, HTML estático) inserta nombre, correo y autorización en `registros` con la clave publicable de Supabase. RLS: desde la web solo se puede insertar; nadie puede leer.
2. Un disparador (`registros_enviar_bienvenida`, vía `pg_net`) llama a la función `bienvenida`.
3. La función lee el registro, lo agrega a la lista #3 de Brevo, envía el correo y marca `bienvenida_enviada_en` para no repetir.
4. Detalles técnicos en `README.md`, `supabase/functions/bienvenida/index.ts` y `supabase/migrations/`.

## Identidad visual

- Fondo azul noche `#1F2235`, paneles `#282C44`, líneas `#3A3F5C`.
- Texto crema `#F1ECE2`, secundario `#D3D1D9`, apagado `#A9AEC4`.
- Acentos: coral `#E0806C` (botones, cálido, él) y azul `#4FA3C7` (detalles, frío, ella); verde brote `#7FC4B4` solo para confirmaciones ("Eres elegible").
- Fondo de encabezados: paso suave de rojo (izquierda) a azul (derecha), como la portada.
- Tipografías: **Unbounded** 800 en mayúsculas para titulares; **Saira** para etiquetas muy espaciadas y números; **IBM Plex Sans** para texto; **Literata** para texto de libro (PDF).
- Tono del universo: trámite oficial. "Registro de elegibilidad", "Registro completado. Eres elegible."

## Pendientes conocidos

- Cambiar `SITE_URL` de la función y la vista previa para redes (`og:url`, `og:image`) al dominio `volverasumar.pandemoniumpodcast.com`.
- Borrar en cPanel el subdominio viejo `volverasumar` (mostraba un listado con `php.ini`), cuidando que el CNAME a `cname.vercel-dns.com` siga en el Zone Editor.
- Remitente con dominio propio en Brevo (p. ej. `hola@pandemoniumpodcast.com`) para que menos correos caigan en spam.
- Correo de lanzamiento con el precio para la lista #3.

## Próximo paso: el juego de asignación

Segunda entrega para registrados antes del lanzamiento: un juego en el que cada persona es (o no) **asignada a un Centro de Reagrupación** según los criterios del libro.

Ideas acordadas:
- 6 a 8 preguntas con tono de formulario oficial.
- Resultado compartible: una "credencial" con nombre, centro y función, en formato de historia de Instagram.
- "No asignado" también debe ser un resultado con historia propia, no una derrota.
- Guardar el resultado en Supabase para personalizar el correo de lanzamiento.
- Solo para registrados; se anuncia por correo como la segunda entrega.

Lo que falta del autor: los criterios de asignación, los nombres de los centros o sectores, las funciones posibles y qué no se puede revelar antes del lanzamiento.
