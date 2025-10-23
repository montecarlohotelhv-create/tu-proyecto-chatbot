// src/app/api/log-unanswered/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Pregunta requerida.' }, { status: 400 });
    }

    const loggingScriptUrl = process.env.LOGGING_GOOGLE_APPS_SCRIPT_URL; // <-- Nueva variable de entorno
    if (!loggingScriptUrl) {
      console.error('La URL del script de logueo no está configurada.');
      // No devolvemos error al cliente, solo logueamos en servidor
      return NextResponse.json({ status: 'logging_url_missing' });
    }

    // Enviamos la pregunta al script de Google (no esperamos respuesta)
    fetch(loggingScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    }).catch(fetchError => {
      // Logueamos error si fetch falla, pero no afectamos la respuesta principal
      console.error('Error al enviar pregunta al script de logueo:', fetchError);
    });

    // Respondemos inmediatamente al chat/api que recibimos la solicitud de log
    return NextResponse.json({ status: 'log_received' });

  } catch (error) {
    console.error('Error en el endpoint /api/log-unanswered:', error);
    // Respondemos que hubo un error interno en el logueo
    return NextResponse.json({ error: 'Error interno al procesar log.' }, { status: 500 });
  }
}