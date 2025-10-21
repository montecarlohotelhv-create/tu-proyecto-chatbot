// src/app/api/lead/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Nombre, email y mensaje son requeridos.' }, { status: 400 });
    }

    const googleScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!googleScriptUrl) {
      console.error('La URL de Google Apps Script no está configurada en .env');
      throw new Error('La URL de Google Apps Script no está configurada.');
    }

    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        message,
        date: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al enviar el lead a Google Apps Script:', errorText);
      throw new Error('No se pudo guardar el lead.');
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error en el endpoint /api/lead:', error);
    return NextResponse.json({ error: 'Ha ocurrido un error interno.' }, { status: 500 });
  }
}