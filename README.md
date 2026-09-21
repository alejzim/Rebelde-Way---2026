# ¿Qué integrante de Erreway sos?

Test de personalidad inspirado en Rebelde Way: cinco preguntas, cuatro resultados y una estética juvenil Y2K. Incluye frontend en React + Vite, una API de Node.js para Vercel y almacenamiento en Supabase PostgreSQL.

El participante solo elige un nombre. No necesita correo, contraseña ni cuenta. Las respuestas completas se guardan en Supabase y se consultan desde el panel privado `/admin`.

## Ejecutar localmente

Necesitás **Node.js 24.x**, Git y un proyecto de Supabase para guardar y consultar respuestas. El gestor de paquetes es **pnpm 10.32.1**, fijado en `package.json`.

Si todavía no tenés el repositorio en tu equipo:

```powershell
git clone https://github.com/alejzim/Rebelde-Way---2026.git
cd Rebelde-Way---2026
```

Desde la carpeta del proyecto, en PowerShell:

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env
```

En macOS o Linux, el comando de copia es `cp .env.example .env`. Si tu instalación de Node no incluye Corepack, instalalo con `npm install --global corepack` y repetí `corepack enable`.

Completá `.env` y ejecutá la migración SQL indicada abajo. Luego:

```powershell
pnpm dev
```

Abrí **http://127.0.0.1:5173**. Este comando inicia Vite y la API bajo el mismo origen, sin necesitar un segundo servidor ni Vercel CLI.

La interfaz puede abrirse sin credenciales, pero el guardado y la administración requieren Supabase configurado. Ante un error de conexión, el test permite reintentar conservando las respuestas mientras la página siga abierta; no simula un guardado exitoso.

## Variables de entorno

Copiá [`.env.example`](.env.example) a `.env` y completá estas **cuatro variables**:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
ADMIN_PASSWORD=
```

Los valores quedan vacíos a propósito. Completalos localmente con los valores existentes de tu proyecto Supabase y tu contraseña administrativa, usando los mismos que configuraste en Vercel para ese entorno. Si una contraseña contiene espacios o `#`, escribila entre comillas en `.env`.

| Variable | Dónde se usa y qué contiene |
| --- | --- |
| `VITE_SUPABASE_URL` | URL pública del proyecto; también identifica la instancia utilizada por la API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública de Supabase, preparada para el frontend; no permite administrar respuestas |
| `SUPABASE_SECRET_KEY` | Clave secreta utilizada exclusivamente por la API del servidor |
| `ADMIN_PASSWORD` | Contraseña administrativa; el servidor también deriva de ella la clave para firmar las sesiones |

Usá una contraseña larga, única y de **al menos 12 caracteres**. Cambiar `ADMIN_PASSWORD` invalida las sesiones anteriores una vez reiniciado el servidor o aplicado el nuevo despliegue. No hacen falta `SESSION_SECRET`, `APP_ORIGIN` ni variables adicionales de autenticación.

Las variables que empiezan con `VITE_` son públicas y pueden quedar incluidas en los archivos descargados por el navegador. **Nunca agregues ese prefijo a `SUPABASE_SECRET_KEY` ni a `ADMIN_PASSWORD`.** Las operaciones de guardado, consulta y eliminación pasan por `/api/...`; la clave secreta y la contraseña nunca se incorporan al frontend.

`.env` está excluido de Git. El repositorio solo debe contener `.env.example`, sin valores reales. Después de modificar `.env`, reiniciá `pnpm dev`.

## Conectar Supabase

1. Abrí tu proyecto en el [panel de Supabase](https://supabase.com/dashboard), o creá uno si todavía no existe.
2. En **SQL Editor**, ejecutá el contenido completo de [`supabase/migrations/001_create_respuestas.sql`](supabase/migrations/001_create_respuestas.sql).
3. En la configuración de API del proyecto, obtené la URL, una clave **publishable** (`sb_publishable_...`) y una clave **secret** (`sb_secret_...`). Las tres deben pertenecer al mismo proyecto.
4. Guardá esos valores en sus variables correspondientes de `.env`, junto con la contraseña administrativa.
5. Iniciá la aplicación y completá un test. Entrá a `/admin` para comprobar que la respuesta se guardó.

La clave publishable es pública; la clave secret tiene privilegios elevados y debe permanecer en el servidor. [Documentación de claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

La migración crea la tabla `respuestas`, los elementos auxiliares para limitar intentos y obtener estadísticas, sus restricciones e índices, y habilita Row Level Security. No es necesario habilitar Supabase Auth ni crear usuarios para los participantes. El acceso a las respuestas se realiza desde la API; no agregues políticas de lectura pública para hacer funcionar el panel. [Documentación de RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Datos almacenados

| Campo | Contenido |
| --- | --- |
| `id` | UUID de la respuesta |
| `nombre` | Nombre normalizado, de 2 a 30 caracteres |
| `pregunta1` … `pregunta5` | Texto de cada respuesta elegida |
| `resultado` | `marizza`, `mia`, `pablo` o `manuel` |
| `created_at` | Fecha y hora generada por PostgreSQL |
| `submission_id` | Identificador único del intento para evitar duplicados al reintentar |
| `request_hash` | Huella de los datos enviados para comprobar reintentos |

No se solicitan correo, teléfono ni contraseñas a los participantes. No se usa SQLite ni almacenamiento local del navegador para conservar respuestas importantes. El progreso sin enviar vive en memoria y se reinicia al recargar o cerrar la página.

## Rutas, preguntas y puntuación

| Ruta | Pantalla |
| --- | --- |
| `/` | Portada, campo de nombre y botón para empezar |
| `/test` | Cinco preguntas con progreso y navegación anterior/siguiente |
| `/resultado/marizza` | Marizza Pía Spirito |
| `/resultado/mia` | Mía Colucci |
| `/resultado/pablo` | Pablo Bustamante |
| `/resultado/manuel` | Manuel Aguirre |
| `/admin` | Inicio de sesión y panel administrativo |

Las preguntas y opciones están en [`shared/quiz.js`](shared/quiz.js). Las opciones 1, 2, 3 y 4 suman un punto a Marizza, Mía, Pablo y Manuel, respectivamente. La opción 5 no suma puntos. Los nombres utilizados internamente para puntuar no aparecen junto a las opciones.

El servidor valida las cinco respuestas y calcula el resultado; no acepta un personaje indicado por el cliente. Ante un empate, elige aleatoriamente entre los personajes empatados. Si todas las respuestas son «Ninguna de las anteriores», los cuatro empatan en cero y cualquiera puede ser el resultado.

No se puede avanzar sin responder. Volver a una pregunta conserva la selección. Durante el envío se bloquea un segundo clic y el identificador único evita crear otra fila al reintentar el mismo envío. La pantalla de resultado se abre después de la confirmación del servidor. Abrir directamente una ficha de personaje no guarda una respuesta nueva.

## Fotografías de los personajes

Colocá tus imágenes con estos nombres exactos:

```text
public/personajes/marizza.jpg
public/personajes/mia.jpg
public/personajes/pablo.jpg
public/personajes/manuel.jpg
```

La aplicación incluye ilustraciones SVG locales como reemplazos visuales. Al agregar cada JPG se usará automáticamente; si falta o no carga, aparecerá su ilustración. No depende de URLs de imágenes externas. Las ilustraciones incluidas no son fotografías oficiales del elenco; podés reemplazarlas por fotografías para las que tengas permiso de uso.

## Panel administrativo

Entrá directamente a **`/admin`**, por ejemplo `http://127.0.0.1:5173/admin`, e ingresá el valor de `ADMIN_PASSWORD`. No hay un enlace visible al panel desde la portada.

Incluye búsqueda por nombre, filtro por personaje, tabla paginada ordenada desde la respuesta más reciente, contador total, estadísticas de resultados y eliminación individual con confirmación. La tabla muestra nombre, cinco respuestas, personaje y fecha. Las estadísticas generales abarcan todas las respuestas; la cantidad de coincidencias corresponde a los filtros activos.

Las rutas administrativas comprueban la sesión en el backend. La sesión usa una cookie firmada `HttpOnly`, `SameSite=Strict` y `Secure` en producción. Las escrituras comprueban el origen y las operaciones administrativas sensibles requieren un token CSRF. El servidor limita los intentos de inicio de sesión y los envíos del test mediante contadores persistidos en PostgreSQL, para funcionar también con varias instancias serverless.

Para probar la eliminación, completá un test con un nombre reconocible y borrá solamente ese registro de prueba. El borrado requiere confirmación y elimina la respuesta de la base.

## Desplegar en Vercel desde GitHub

El proyecto incluye [`vercel.json`](vercel.json) con la compilación, la API serverless, las rutas de la SPA y cabeceras de seguridad. Las rutas están preparadas para abrir o recargar `/test`, `/admin` y `/resultado/...` directamente. Vercel permite conectar proyectos Vite con GitHub para desplegar cambios. [Guía oficial de Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite).

1. Subí los archivos a `main` en `alejzim/Rebelde-Way---2026`. Incluí `pnpm-lock.yaml` y mantené `.env` fuera de Git.
2. En Vercel, importá el repositorio como proyecto, o abrí su proyecto existente.
3. Usá **Vite** como framework, la raíz del repositorio como directorio y **Node.js 24.x**. La configuración incluida fija `pnpm install --frozen-lockfile`, `pnpm build` y el directorio de salida `dist`.
4. En **Settings → Environment Variables**, configurá las cuatro variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `ADMIN_PASSWORD`. Si ya están cargadas, comprobá que los nombres y entornos coincidan. No hace falta crear `SESSION_SECRET` ni `APP_ORIGIN`.
5. Aplicá las variables a **Production** y, si vas a usar vistas previas funcionales, también a **Preview**. Podés usar un proyecto Supabase separado en Preview para no mezclar pruebas y respuestas reales.
6. Ejecutá la migración en la instancia Supabase correspondiente antes de probar el guardado. Desplegá o ejecutá un **Redeploy** después de modificar variables.
7. Verificá que `main` sea la rama de producción. Con la integración Git conectada, los siguientes pushes generan nuevos despliegues.
8. En el sitio publicado, completá un test, encontrá esa respuesta en `/admin` y probá eliminarla. También recargá directamente una URL de resultado y la ruta administrativa.

El código incluye la configuración necesaria, pero no crea ni verifica por sí solo los recursos de tus cuentas externas. Una compilación correcta no comprueba la conectividad de tu instancia Supabase ni que las variables estén cargadas en Vercel: eso se verifica con el recorrido real del punto 8.

## Comandos y comprobaciones

| Comando | Acción |
| --- | --- |
| `pnpm dev` | Inicia frontend y API con `.env` |
| `pnpm test` | Ejecuta las pruebas automatizadas |
| `pnpm build` | Genera el frontend de producción en `dist` |
| `pnpm check` | Ejecuta pruebas y compilación |
| `pnpm preview` | Sirve el frontend compilado para revisión; no inicia la API |

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) ejecuta `pnpm check` en pushes a `main` y pull requests, con Node 24 y dependencias del lockfile. Instala la versión de pnpm fijada en `package.json` mediante la [acción oficial de pnpm](https://github.com/pnpm/action-setup/tree/v4) y conserva una caché de sus paquetes. Las pruebas usan dobles de la base y no requieren credenciales reales ni secretos de GitHub.

Para comprobar la integración después de configurar Supabase: completá cinco preguntas, recibí el resultado, iniciá sesión en `/admin`, buscá la respuesta, filtrá por su personaje y eliminá el registro de prueba tras confirmar. Probá el recorrido también desde un celular.

## Archivos principales

```text
api/quiz.js y api/admin/                   Entradas de las funciones serverless
server/                                   API, acceso a Supabase y seguridad
shared/quiz.js                            Preguntas, opciones y personajes
src/                                      Componentes, páginas y estilos de React
public/personajes/                        Ilustraciones y fotografías
supabase/migrations/001_create_respuestas.sql  Esquema y permisos de PostgreSQL
tests/                                    Pruebas automatizadas
.env.example                              Plantilla sin secretos reales
.github/workflows/ci.yml                   Verificación en GitHub
vercel.json                               Despliegue y rutas
pnpm-lock.yaml                            Dependencias resueltas
```

## Solución de problemas

| Problema | Qué revisar |
| --- | --- |
| El test informa que el servicio no está configurado | Las cuatro variables y el reinicio local o nuevo despliegue |
| El guardado falla con las variables completas | Que URL y claves pertenezcan al mismo proyecto y se haya ejecutado toda la migración |
| `/admin` no permite iniciar sesión | Contraseña de al menos 12 caracteres y conectividad con Supabase |
| La API devuelve un error de origen | Que frontend y API estén bajo el mismo dominio y protocolo; usá la URL que muestra `pnpm dev` en local |
| La API informa demasiados intentos | Esperá antes de reintentar: se alcanzó un límite temporal |
| Funciona localmente pero falla en Vercel | Variables en el entorno correcto y un despliegue nuevo después de configurarlas |
| La imagen sigue mostrando una ilustración | Nombre en minúsculas, extensión `.jpg` y carpeta `public/personajes/` |

Los cambios de código se publican mediante GitHub. Los cambios de estructura de PostgreSQL necesitan una migración aplicada también en Supabase; un push no modifica automáticamente la base de datos.
