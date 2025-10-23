// src/app/api/chat/route.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Inicialización del cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Inicialización del cliente de OpenAI para apuntar a OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Umbral de confianza para la respuesta de Supabase
const SIMILARITY_THRESHOLD = 0.85;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'El mensaje es requerido y debe ser un texto.' }, { status: 400 });
    }

    // Paso 1: Generar embedding para la pregunta del usuario (server-side)
    const { pipeline } = await import('@xenova/transformers');
    const generateEmbedding = await pipeline('feature-extraction', 'Xenova/gte-small');

    const output = await generateEmbedding(message, {
      pooling: 'mean',
      normalize: true,
    });
    const embedding = Array.from(output.data);

    // Paso 2: Realizar la búsqueda híbrida en Supabase
    const { data: documents, error: rpcError } = await supabase.rpc('hybrid_search_faqs', {
      query_text: message,
      query_embedding: embedding,
      match_count: 1, // Solo queremos la mejor coincidencia
    });

    // --- BLOQUE DE LOGGING DE ERROR MEJORADO ---
    if (rpcError) {
      console.error('--- SUPABASE RPC ERROR DETECTADO ---'); // Marcador
      console.error('RPC Error Completo (Objeto):', rpcError); // Muestra el objeto
      console.error('RPC Error Completo (string):', JSON.stringify(rpcError, null, 2)); // Muestra como texto JSON
      console.error('RPC Error Message:', rpcError.message || 'No message property'); // Propiedad específica
      console.error('RPC Error Code:', rpcError.code || 'No code property'); // Propiedad específica
      console.error('RPC Error Details:', rpcError.details || 'No details property'); // Propiedad específica
      console.error('RPC Error Hint:', rpcError.hint || 'No hint property'); // Propiedad específica
      console.error('--- FIN SUPABASE RPC ERROR ---'); // Marcador
      throw new Error('Error al buscar en la base de conocimiento.');
    }
    // --- FIN BLOQUE DE LOGGING ---

    // Paso 3: Evaluar la coincidencia y decidir si usar el LLM
    if (documents && documents.length > 0 && documents[0].similarity_score > SIMILARITY_THRESHOLD) {
      // Coincidencia encontrada con alta confianza
      return NextResponse.json({ reply: documents[0].answer });
    } else {
      // Paso 4: No hay coincidencia clara, escalar a OpenRouter (Llama 3.1 8B)
      const completion = await openai.chat.completions.create({
        // --- AQUÍ ESTÁ EL CAMBIO ---
        model: 'meta-llama/llama-3.1-8b-instruct',
        // -------------------------
        messages: [
          { role: 'system', content: 'Eres un asistente servicial que responde de forma clara y concisa.' },
          { role: 'user', content: message }
        ],
      });

      const reply = completion.choices[0]?.message?.content?.trim() ?? "Lo siento, no he podido encontrar una respuesta. Por favor, reformula tu pregunta.";
      return NextResponse.json({ reply });
    }
  } catch (error) {
    console.error('Error general en el endpoint /api/chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ha ocurrido un error interno.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}