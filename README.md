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

*(Aquí añadiremos más secciones después: Google Scripts, Despliegue, etc.)*
