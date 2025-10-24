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
