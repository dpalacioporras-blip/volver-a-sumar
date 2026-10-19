# Volver a sumar · Landing de prelanzamiento

Página de registro para recibir la primicia del ebook *Volver a sumar*, de Daniel Palacio.

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
