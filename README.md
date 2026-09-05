# LizamaBet — versión GitHub + Vercel + Supabase

Esta versión está preparada para publicarse desde GitHub y desplegarse en Vercel.

## Incluye
- Diseño responsive para PC, tablet y celular.
- Fútbol, tenis y baloncesto.
- Navegación: deporte → liga/torneo → partidos.
- Buscador de ligas.
- Filtros En vivo / Hoy / Próximos (estructura UI lista para ampliar).
- Integración SportScore mediante ruta de servidor.
- Actualización automática cada 60 segundos.
- Atribución visible a SportScore.
- Panel `/admin`.
- Login administrador mediante Supabase Auth.
- Edición de título, subtítulo, colores y texto de donación.
- Activar/desactivar y añadir ligas desde Admin.
- RLS de Supabase para impedir escrituras públicas.
- Tablas preparadas para eventos, estadísticas, cuotas, pronósticos, combos e historial.
- Mercado Pago integrado.
- Logo LizamaBet incluido en `/public/logo.png`.

## 1. GitHub
Sube TODO el contenido de esta carpeta a la raíz del repositorio `gover88/LIZAMABET`.

No subas `.env.local`.

## 2. Supabase
1. Crea un proyecto.
2. Ve a SQL Editor.
3. Ejecuta `supabase/schema.sql`.
4. En Authentication > Users crea el usuario que usarás como administrador.
5. Copia el UUID de ese usuario.
6. En SQL Editor ejecuta:

```sql
insert into public.admins(user_id)
values ('UUID-DE-TU-USUARIO');
```

## 3. Variables de entorno
En Vercel > Project > Settings > Environment Variables agrega:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SPORTSCORE_BASE_URL=https://sportscore.com
SPORTSCORE_REFRESH_SECONDS=60
NEXT_PUBLIC_MERCADOPAGO_URL=https://mpago.la/1dqB5EM
```

No necesitas exponer la Service Role Key en esta versión.

## 4. SportScore
La ruta usada es:

```text
https://sportscore.com/api/widget/matches/?sport=<sport>&limit=20&src=lizamabet
```

El navegador consulta `/api/sportscore`; así la fuente externa queda centralizada en el servidor de LizamaBet.

La web muestra `Powered by SportScore` con enlace visible.

## 5. Vercel
1. Importa `gover88/LIZAMABET`.
2. Framework: Next.js.
3. Añade las variables anteriores.
4. Deploy.
5. Vercel entregará una URL gratuita `*.vercel.app`.

## 6. Admin
Una vez desplegado:

```text
https://TU-WEB.vercel.app/admin
```

Inicia sesión con el usuario creado en Supabase.

## Seguridad
- No guardes contraseñas en GitHub.
- No publiques `.env.local`.
- Las modificaciones administrativas se protegen con RLS.
- El usuario público solo puede leer contenido permitido.
- Los datos deportivos no se inventan cuando SportScore no responde.

## Siguiente fase recomendada
Conectar una fuente legal/licenciada de cuotas y construir el motor de probabilidades/EV, guardando snapshots históricos en Supabase.
