// src/app/api/lead/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. LEEMOS LOS NUEVOS DATOS DEL FORMULARIO
    const { name, phone, country } = await req.json();

    // 2. VALIDAMOS LOS NUEVOS DATOS
    if (!name || !phone || !country) {
      return NextResponse.json({ error: 'Nombre, teléfono y país son requeridos.' }, { status: 400 });
    }

    const googleScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!googleScriptUrl) {
      console.error('La URL de Google Apps Script no está configurada en .env');
      throw new Error('La URL de Google Apps Script no está configurada.');
    }

    // 3. ENVIAMOS LOS NUEVOS DATOS A GOOGLE SHEETS
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        phone,
        country,
        date: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al enviar el lead a Google Apps Script:', errorText);
      throw new Error('No se pudo guardar el lead.');
    }

    // El widget espera { status: 'success' }
    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('Error en el endpoint /api/lead:', error);
    return NextResponse.json({ error: 'Ha ocurrido un error interno.' }, { status: 500 });
  }
}