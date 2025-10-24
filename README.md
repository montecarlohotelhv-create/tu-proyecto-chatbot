# Chatbot Híbrido con IA - Hotel Montecarlo (Olitave)

Este repositorio contiene el código fuente del backend para el chatbot de preguntas frecuentes (FAQ) del Hotel Montecarlo, implementado en el sitio WordPress gestionado por Olitave. Utiliza una arquitectura híbrida que combina una base de conocimiento en Supabase con un modelo de lenguaje grande (LLM) a través de OpenRouter para responder las consultas de los usuarios.

## Arquitectura del Sistema

El sistema se compone de varios servicios interconectados:

```mermaid
graph LR
    A[Usuario<br>(Navegador Web)] -- 1. Escribe en Widget --> B(Widget Chatbot<br>HTML/CSS/JS en Elementor);

    subgraph "Sitio WordPress (olitave.com.ar)"
        B;
    end

    subgraph "Backend API (tu-proyecto-chatbot.vercel.app)"
        C[/api/lead<br>(Vercel)];
        D[/api/chat<br>(Vercel)];
        E[/api/log-unanswered<br>(Vercel)];
    end

    subgraph "Base de Conocimiento"
        F[Supabase<br>(Tabla 'faqs', Función 'hybrid_search_faqs')];
    end

    subgraph "Inteligencia Artificial"
        G[OpenRouter<br>(Modelo Llama 3)];
    end

    subgraph "Almacenamiento Externo"
        H[Google Sheet 'Leads'<br>(Via Apps Script)];
        I[Google Sheet 'Logs'<br>(Via Apps Script)];
    end

    B -- "2a. Envía Datos Lead" --> C;
    B -- "2b. Envía Mensaje Chat" --> D;

    C -- "3a. Reenvía Lead" --> H;
    E -- "3b. Reenvía Pregunta" --> I;

    D -- "4a. Genera Embedding" --> D;
    D -- "4b. Busca en Supabase" --> F;
    F -- "5a. Devuelve Respuesta FAQ" --> D;
    D -- "5b. (Si no encuentra) Consulta IA" --> G;
    G -- "6. Genera Respuesta IA" --> D;
    D -- "7. (Si es Fallback/Error) Loguea Pregunta" --> E;

    D -- "8. Envía Respuesta Final" --> B;
    B -- "9. Muestra Respuesta" --> A;

    style F fill:#c9f,stroke:#333,stroke-width:2px;
    style G fill:#f9c,stroke:#333,stroke-width:2px;
    style H fill:#9cf,stroke:#333,stroke-width:2px;
    style I fill:#9cf,stroke:#333,stroke-width:2px;
    style B fill:#ccf,stroke:#333,stroke-width:2px;
    style C fill:#fcc,stroke:#333,stroke-width:2px;
    style D fill:#fcc,stroke:#333,stroke-width:2px;
    style E fill:#fcc,stroke:#333,stroke-width:2px;
    Explicación del Flujo
El Usuario interactúa con el Widget en el sitio de WordPress.

Si envía el formulario de lead: El Widget manda los datos (nombre, teléfono, país) al endpoint /api/lead en Vercel.

/api/lead (Vercel) reenvía esos datos al Google Apps Script correspondiente, que los guarda en la Google Sheet 'Leads'.

Si envía un mensaje de chat: El Widget manda el mensaje al endpoint /api/chat en Vercel.

/api/chat (Vercel):

Transforma la pregunta en números (embedding) usando @xenova/transformers.

Usa el texto y el embedding para buscar en Supabase (llamando a la función hybrid_search_faqs).

Supabase busca en la tabla faqs.

Si encuentra una buena coincidencia (según SIMILARITY_THRESHOLD): Devuelve la respuesta predefinida a /api/chat.

Si NO encuentra coincidencia: /api/chat consulta a OpenRouter (usando el modelo meta-llama/llama-3.1-8b-instruct con temperature: 0.3). Se incluye un prompt del sistema para enfocar las respuestas al Hotel Montecarlo y usar un mensaje específico (FALLBACK_REPLY) si no sabe la respuesta.

OpenRouter genera una respuesta y la devuelve a /api/chat.

/api/chat (Vercel):

Si la respuesta fue el FALLBACK_REPLY (porque Supabase falló o la IA no supo responder específicamente) O si ocurrió cualquier error durante el proceso, llama al endpoint /api/log-unanswered.

/api/log-unanswered (Vercel) reenvía la pregunta original al Google Apps Script de logs, que la guarda en la Google Sheet 'Logs'.

/api/chat envía la respuesta final (sea de Supabase, de OpenRouter, o el FALLBACK_REPLY) de vuelta al Widget.

El Widget muestra la respuesta al Usuario.

(Aquí añadiremos más secciones después: Backend, Supabase, Google Scripts, Despliegue, etc.)

Acción: Añadir Sección del Backend al README.md
Ve a tu repositorio en GitHub: https://github.com/montecarlohotelhv-create/tu-proyecto-chatbot

Haz clic en el archivo README.md.

Haz clic en el icono del lápiz (✏️ Edit this file) para editarlo de nuevo.

Busca la línea que pusimos como marcador: *(Aquí añadiremos más secciones después: Backend, Supabase, Google Scripts, Despliegue, etc.)*

Reemplaza esa línea con el siguiente texto completo (este texto describe tu backend):

Markdown

## Backend API (Vercel / Next.js)

El backend está construido con [Next.js](https://nextjs.org/) (usando el App Router) y desplegado como funciones serverless en [Vercel](https://vercel.com/). Cada endpoint de la API reside en su propia carpeta dentro de `src/app/api/` y se ejecuta de forma independiente.

### Estructura de Archivos Relevante

tu-proyecto-chatbot/ ├── src/ │ └── app/ │ └── api/ │ ├── chat/ │ │ └── route.ts # Lógica principal del chat │ ├── lead/ │ │ └── route.ts # Lógica para guardar leads │ └── log-unanswered/ │ └── route.ts # Lógica para loguear preguntas no respondidas ├── next.config.ts # Configuración de Next.js (incluye CORS headers) ├── package.json # Dependencias y scripts del proyecto └── .env.local # Variables de entorno para desarrollo local (¡NO SUBIR A GITHUB!)


### Endpoints de la API

Todos los endpoints solo aceptan el método `POST`.

#### 1. `/api/lead`

* **Archivo:** `src/app/api/lead/route.ts`
* **Propósito:** Recibe los datos del formulario de lead (nombre, teléfono, país) desde el widget.
* **Funcionamiento:**
    1.  Valida que los datos requeridos estén presentes.
    2.  Obtiene la URL del Google Apps Script para leads desde la variable de entorno `GOOGLE_APPS_SCRIPT_URL`.
    3.  Realiza una petición `POST` a esa URL, enviando los datos del lead en formato JSON.
    4.  Devuelve `{ "status": "success" }` al widget si el envío al script fue exitoso.
    5.  Devuelve un error `500` si falla la configuración o el envío.
* **Dependencias:** Variable de entorno `GOOGLE_APPS_SCRIPT_URL`.

#### 2. `/api/chat`

* **Archivo:** `src/app/api/chat/route.ts`
* **Propósito:** Es el motor principal del chatbot. Recibe un mensaje del usuario y devuelve una respuesta.
* **Funcionamiento:**
    1.  Recibe el `{ "message": "..." }` del widget.
    2.  **Genera Embedding:** Usa la librería `@xenova/transformers` (modelo `Xenova/gte-small`) para convertir el mensaje del usuario en un vector numérico (embedding). Se usa `onnxruntime-web` forzado vía `overrides` en `package.json` para compatibilidad con Vercel.
    3.  **Busca en Supabase:** Llama a la función PostgreSQL `hybrid_search_faqs` en Supabase, pasándole el texto del mensaje y el embedding.
    4.  **Evalúa Resultado:**
        * Si Supabase devuelve una respuesta con un `similarity_score` mayor al `SIMILARITY_THRESHOLD` (actualmente 0.80), devuelve esa respuesta directamente.
        * Si no hay coincidencia o el score es bajo:
            * **Consulta a IA:** Llama a la API de OpenRouter usando el modelo `meta-llama/llama-3.1-8b-instruct` (con `temperature: 0.3`) y un *prompt* del sistema específico para el Hotel Montecarlo.
            * Obtiene la respuesta generada por la IA.
            * **Logueo (si aplica):** Si la respuesta de la IA es el mensaje `FALLBACK_REPLY` (indicando que no sabía la respuesta específica), llama al endpoint `/api/log-unanswered` para registrar la pregunta original.
            * Devuelve la respuesta de la IA (o el `FALLBACK_REPLY`).
    5.  **Manejo de Errores:** Si ocurre cualquier error (problema con Supabase, OpenRouter, etc.), llama a `/api/log-unanswered` con la pregunta original y devuelve el `FALLBACK_REPLY` al usuario.
* **Dependencias:** Variables de entorno `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`. Endpoint `/api/log-unanswered`.

#### 3. `/api/log-unanswered`

* **Archivo:** `src/app/api/log-unanswered/route.ts`
* **Propósito:** Recibe preguntas que no pudieron ser respondidas satisfactoriamente por Supabase ni por la IA.
* **Funcionamiento:**
    1.  Recibe la `{ "question": "..." }` desde el endpoint `/api/chat`.
    2.  Obtiene la URL del Google Apps Script para logs desde la variable de entorno `LOGGING_GOOGLE_APPS_SCRIPT_URL`.
    3.  Realiza una petición `POST` (sin esperar respuesta completa, "fire and forget") a esa URL, enviando la pregunta.
    4.  Devuelve `{ "status": "log_received" }` inmediatamente al endpoint `/api/chat` para no retrasarlo.
    5.  Loguea errores internamente si falla la configuración o el envío al script.
* **Dependencias:** Variable de entorno `LOGGING_GOOGLE_APPS_SCRIPT_URL`.

### Variables de Entorno Requeridas

Estas variables deben configurarse tanto en el archivo `.env.local` para desarrollo como en la sección "Environment Variables" de Vercel para producción. **Nunca deben subirse a GitHub.**

* `SUPABASE_URL`: URL del proyecto Supabase.
* `SUPABASE_KEY`: Clave pública (`anon key`) del proyecto Supabase.
* `OPENROUTER_API_KEY`: Clave API generada en OpenRouter.ai.
* `GOOGLE_APPS_SCRIPT_URL`: URL de despliegue del Google Apps Script para guardar **Leads**.
* `LOGGING_GOOGLE_APPS_SCRIPT_URL`: URL de despliegue del Google Apps Script para guardar **Logs de preguntas sin respuesta**.

### Configuración Adicional (`next.config.ts`)

Este archivo incluye una configuración `async headers()` para añadir cabeceras `Access-Control-Allow-*`. Esto es crucial para permitir que el widget (alojado en `olitave.com.ar`) pueda realizar peticiones a la API (alojada en `vercel.app`), evitando errores de CORS en el navegador. Actualmente permite cualquier origen (`*`), pero podría restringirse al dominio específico de WordPress por seguridad.

## Base de Conocimiento (Supabase)

[Supabase](https://supabase.com/) actúa como la base de conocimiento principal del chatbot, almacenando las preguntas y respuestas predefinidas (FAQs). Se utiliza PostgreSQL con extensiones específicas para permitir búsquedas avanzadas.

### Configuración de la Base de Datos

* **Proyecto:** `chatbot-db` (o el nombre que le hayas dado en Supabase).
* **Acceso:** Se accede desde el backend de Vercel usando la `SUPABASE_URL` y la `SUPABASE_KEY` (clave `anon`).

### Tabla `faqs`

Es la única tabla utilizada y contiene las siguientes columnas:

* `id` (BIGINT, Primary Key, Auto-generado): Identificador único para cada par pregunta/respuesta.
* `question` (TEXT, Not Null): El texto de la pregunta frecuente.
* `answer` (TEXT, Not Null): El texto de la respuesta correspondiente.
* `embedding` (VECTOR(384)): Un vector numérico que representa el significado semántico de la `question`. La dimensión 384 corresponde al modelo `Xenova/gte-small` utilizado en el backend para generar los embeddings de las preguntas de los usuarios al momento de la búsqueda. *Nota: Esta columna se usa en la búsqueda semántica pero no se almacena pre-calculada.*

### Extensiones Utilizadas

Se habilitaron dos extensiones de PostgreSQL en Supabase a través del SQL Editor:

1.  **`vector`**: Habilita el tipo de dato `VECTOR` y funciones para realizar búsquedas de similitud semántica (vectorial). Esencial para entender la *intención* del usuario, no solo las palabras clave. Se usa un índice `ivfflat` en la columna `embedding` para optimizar estas búsquedas.
2.  **`pg_trgm`**: Proporciona funciones y operadores para determinar la similitud entre textos basada en trigramas (grupos de 3 caracteres). Esencial para la búsqueda difusa (*fuzzy search*), permitiendo encontrar coincidencias incluso si el usuario comete errores tipográficos. Se usa un índice `gin` en la columna `question` para optimizar estas búsquedas.

### Función `hybrid_search_faqs`

Para combinar lo mejor de ambos mundos (semántica y tolerancia a errores tipográficos), se creó una función PostgreSQL personalizada.

* **Propósito:** Realiza una **búsqueda híbrida** combinando los resultados de la búsqueda semántica (vectorial) y la búsqueda difusa (trigramas).
* **Funcionamiento:**
    1.  Recibe el texto de la pregunta del usuario (`query_text`), su embedding vectorial (`query_embedding`), y cuántos resultados devolver (`match_count`).
    2.  Realiza internamente dos búsquedas en paralelo:
        * Una búsqueda difusa usando `similarity()` y el operador `%` (de `pg_trgm`) sobre la columna `question`.
        * Una búsqueda semántica usando el operador `<#>` (producto interno) sobre la columna `embedding`.
    3.  Combina los rankings de ambas búsquedas usando el algoritmo **Reciprocal Rank Fusion (RRF)** para obtener una puntuación combinada (`similarity_score`).
    4.  Devuelve las filas de la tabla `faqs` ordenadas por esta puntuación combinada, limitadas por `match_count`.
* **Llamada:** El backend (`/api/chat`) invoca esta función usando `supabase.rpc('hybrid_search_faqs', { ... })`.

### Código SQL de Configuración

Los scripts SQL utilizados para configurar la base de datos se encuentran respaldados en la carpeta `/supabase_setup` de este repositorio:

* `supabase_setup/01_setup_extensions_and_table.sql`: Crea las extensiones, la tabla `faqs` y los índices.
* `supabase_setup/02_create_hybrid_search_function.sql`: Crea o reemplaza la función `hybrid_search_faqs`.

## Captura de Leads y Logs (Google Sheets / Apps Script)

Se utilizan dos Hojas de Cálculo de Google separadas, cada una controlada por un [Google Apps Script](https://developers.google.com/apps-script) independiente, para almacenar los datos enviados desde el backend de Vercel. Cada script se despliega como una **Aplicación Web** que actúa como un webhook.

### 1. Script para Leads (`leads_script`)

* **Hoja de Cálculo Asociada:** `Leads` (o la hoja que hayas configurado). Se esperan las columnas: `Nombre`, `Telefono`, `Pais`, `Fecha`.
* **Propósito:** Recibir los datos de contacto enviados por un usuario a través del formulario del widget.
* **Archivo de Código:** El código fuente se gestiona vía `clasp` y se encuentra en `google_apps_scripts/leads_script/Code.js` (o `.gs`).
* **Funcionamiento:**
    1.  Implementa la función `doPost(e)` que se activa al recibir una petición `POST` desde el endpoint `/api/lead` de Vercel.
    2.  Obtiene los datos (`name`, `phone`, `country`, `date`) del cuerpo JSON de la petición (`e.postData.contents`).
    3.  Abre la hoja de cálculo asociada (buscando la pestaña llamada `Leads` o usando la primera disponible).
    4.  Añade una nueva fila (`appendRow`) con los datos recibidos.
    5.  Utiliza `LockService` para prevenir escrituras simultáneas que podrían corromper la hoja.
    6.  Devuelve una respuesta JSON `{ "status": "success" }` si todo funcionó, o `{ "status": "error", "message": "..." }` si hubo un problema.
* **Despliegue:**
    * Debe desplegarse como **Aplicación Web**.
    * Configuración de Acceso:
        * **Ejecutar como:** `Me (tu email)`
        * **Quién tiene acceso:** `Anyone`
    * La **URL de la Aplicación Web** resultante es el valor que se guarda en la variable de entorno `GOOGLE_APPS_SCRIPT_URL` en Vercel.
    * **Importante:** Cada vez que se modifica el código del script, se debe crear una **nueva versión** del despliegue (`Deploy > Manage deployments > Edit (lápiz) > New version > Deploy`) para que los cambios se apliquen.

### 2. Script para Logs de Preguntas (`logs_script`)

* **Hoja de Cálculo Asociada:** `Chatbot Logs Preguntas` (o la hoja que hayas configurado). Se esperan las columnas: `Timestamp`, `Question`.
* **Propósito:** Recibir y almacenar las preguntas que el chatbot no pudo responder satisfactoriamente (ya sea por fallo de Supabase, porque la IA usó el fallback, o por un error general).
* **Archivo de Código:** El código fuente se gestiona vía `clasp` y se encuentra en `google_apps_scripts/logs_script/Code.js` (o `.gs`).
* **Funcionamiento:**
    1.  Implementa la función `doPost(e)` que se activa al recibir una petición `POST` desde el endpoint `/api/log-unanswered` de Vercel.
    2.  Obtiene la pregunta (`question`) del cuerpo JSON de la petición.
    3.  Obtiene la hora actual (`timestamp`).
    4.  Abre la hoja de cálculo asociada (usando la primera pestaña disponible).
    5.  Añade una nueva fila con la hora y la pregunta.
    6.  Utiliza `LockService`.
    7.  Devuelve `{ "status": "success" }` o un error JSON.
* **Despliegue:**
    * Mismo proceso que el script de Leads (Aplicación Web, Ejecutar como `Me`, Acceso `Anyone`).
    * La **URL de la Aplicación Web** resultante es el valor que se guarda en la variable de entorno `LOGGING_GOOGLE_APPS_SCRIPT_URL` en Vercel.
    * También requiere crear una **nueva versión** del despliegue tras cada cambio en el código.

### Gestión del Código con `clasp`

La herramienta `clasp` permite sincronizar el código de los Apps Scripts entre el editor web de Google y tu repositorio local (y por ende, GitHub).

* **Descargar cambios del editor web al local:** `clasp pull` (dentro de la carpeta del script correspondiente, ej. `google_apps_scripts/leads_script`).
* **Subir cambios del local al editor web:** `clasp push` (y luego redesplegar desde el editor web).

## Despliegue y Mantenimiento

Esta sección cubre cómo se actualiza el sistema y qué tareas de mantenimiento son recomendables.

### Proceso de Despliegue (Actualizaciones)

El sistema se beneficia de la integración continua y despliegue continuo (CI/CD) gracias a la conexión entre GitHub y Vercel.

1.  **Cambios en el Backend (Código Next.js):**
    * Realiza los cambios necesarios en los archivos `.ts` dentro de la carpeta `src/app/api/` (o en `package.json`, `next.config.ts`, etc.) en tu copia local del proyecto (VS Code).
    * Guarda los archivos.
    * Abre la terminal (PowerShell) en la carpeta del proyecto (`C:\Users\hvezz\tu-proyecto-chatbot`).
    * Ejecuta los siguientes comandos Git:
        ```bash
        git add .
        git commit -m "Describe brevemente tu cambio aquí"
        git push
        ```
    * **Vercel detectará automáticamente** el `git push` a la rama `main`.
    * Vercel iniciará un **nuevo despliegue de producción**. Puedes monitorear su progreso en el panel de Vercel.
    * Una vez que el despliegue esté "Ready" (Listo), los cambios estarán activos en `https://tu-proyecto-chatbot.vercel.app`.

2.  **Cambios en el Widget (Elementor):**
    * Edita la página de WordPress con Elementor.
    * Modifica el código dentro del widget HTML.
    * **Guarda** la página en Elementor. Los cambios son efectivos inmediatamente.
    * **Recomendación:** Después de guardar en Elementor, copia el código completo del widget y pégalo en el archivo `widget/elementor_widget_code.html` de tu repositorio local. Luego, sube ese cambio a GitHub (`git add .`, `git commit`, `git push`) para mantener el backup actualizado.

3.  **Cambios en los Google Apps Scripts:**
    * **Opción A (Recomendada - Usando `clasp` localmente):**
        * Edita los archivos `.js` dentro de `google_apps_scripts/leads_script` o `google_apps_scripts/logs_script` en VS Code.
        * Guarda los cambios.
        * Abre la terminal, navega a la carpeta raíz del proyecto.
        * Ejecuta `clasp push --rootDir ./google_apps_scripts/leads_script` (o `logs_script`).
        * Ve al editor web del Apps Script correspondiente. Verás los cambios reflejados.
        * **Importante:** Desde el editor web, ve a `Deploy > Manage deployments > Edit (lápiz) > New version > Deploy` para publicar la nueva versión.
        * Sube los cambios del código a GitHub (`git add .`, `git commit`, `git push`).
    * **Opción B (Directamente en el Editor Web):**
        * Abre el Apps Script desde la Hoja de Cálculo (Extensiones > Apps Script).
        * Realiza los cambios en el editor web.
        * Guarda los cambios (💾).
        * **Importante:** Ve a `Deploy > Manage deployments > Edit (lápiz) > New version > Deploy`.
        * **Recomendación:** Después de desplegar, abre la terminal en tu PC, navega a la carpeta raíz del proyecto y ejecuta `clasp pull --rootDir ./google_apps_scripts/leads_script` (o `logs_script`) para actualizar tu copia local y luego sube esos cambios a GitHub.

### Tareas de Mantenimiento Recomendadas

* **Revisar Logs de Preguntas No Respondidas (Semanal/Mensual):** Abre la Google Sheet `Chatbot Logs Preguntas`. Revisa las preguntas que el bot no pudo contestar. Considera añadir las más frecuentes o importantes a la tabla `faqs` en Supabase para mejorar las respuestas.
* **Backup Manual de Datos de Supabase (Mensual/Trimestral):** Ejecuta el comando `pg_dump` (ver sección de Backup) para tener una copia de seguridad reciente de tus FAQs, especialmente si has añadido muchas nuevas. Guarda el archivo `.sql` resultante en un lugar seguro.
* **Revisar Hoja de Leads (Periódicamente):** Asegúrate de que los datos se estén guardando correctamente en la Google Sheet `Leads`.
* **Actualizar Dependencias (Ocasionalmente):** De vez en cuando (ej. cada 6 meses), puedes actualizar las librerías del backend para mantener la seguridad y el rendimiento. Esto se hace ejecutando `npm update` en la terminal local, probando que todo siga funcionando, y luego subiendo los cambios (`package.json`, `package-lock.json`) a GitHub. *Haz esto con precaución, a veces las actualizaciones pueden romper cosas.*
* **Verificar Claves/URLs (Si algo falla):** Si el bot deja de funcionar (errores de conexión, etc.), lo primero es verificar que las Variables de Entorno en Vercel sigan siendo correctas y que las URLs de despliegue de los Apps Scripts no hayan cambiado.


