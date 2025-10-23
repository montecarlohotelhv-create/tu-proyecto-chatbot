// src/app/api/chat/route.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const openai = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY! });
const SIMILARITY_THRESHOLD = 0.80; // Reducimos un poco el umbral para probar
const FALLBACK_REPLY = "Lo siento, no he podido encontrar una respuesta específica sobre eso en mi base de conocimientos del hotel. ¿Podrías reformular tu pregunta o escribir 'asistente' si necesitas ayuda personalizada?";

// Nuevo: Endpoint para loguear (solo la URL base, la ruta se añade después)
const LOG_ENDPOINT_BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'; // Usa VERCEL_URL si está disponible

// Nueva función asíncrona para loguear
async function logUnanswered(question: string) {
    // No bloqueamos la respuesta al usuario si el logueo falla
    fetch(`${LOG_ENDPOINT_BASE_URL}/api/log-unanswered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
    }).catch(error => {
        console.error("Error al intentar loguear pregunta:", error);
        // Podríamos añadir un reintento o un sistema de backup aquí si fuera crítico
    });
}


export async function POST(req: Request) {
    let questionToLog: string | null = null; // Variable para guardar la pregunta si falla

    try {
        const { message } = await req.json();
        questionToLog = message; // Guardamos la pregunta por si falla después

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'El mensaje es requerido y debe ser un texto.' }, { status: 400 });
        }

        // Paso 1: Generar embedding
        const { pipeline } = await import('@xenova/transformers');
        const generateEmbedding = await pipeline('feature-extraction', 'Xenova/gte-small');
        const output = await generateEmbedding(message, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);

        // Paso 2: Búsqueda híbrida en Supabase
        const { data: documents, error: rpcError } = await supabase.rpc('hybrid_search_faqs', {
            query_text: message, query_embedding: embedding, match_count: 1,
        });

        if (rpcError) {
            console.error('--- SUPABASE RPC ERROR DETECTADO ---');
            console.error('RPC Error Completo (Objeto):', rpcError);
            console.error('RPC Error Completo (string):', JSON.stringify(rpcError, null, 2));
            console.error('RPC Error Message:', rpcError.message || 'No message property');
            console.error('RPC Error Code:', rpcError.code || 'No code property');
            console.error('RPC Error Details:', rpcError.details || 'No details property');
            console.error('RPC Error Hint:', rpcError.hint || 'No hint property');
            console.error('--- FIN SUPABASE RPC ERROR ---');
            // Logueamos la pregunta si Supabase falla
            logUnanswered(questionToLog);
            return NextResponse.json({ reply: FALLBACK_REPLY }, { status: 500 }); // Devolvemos el fallback genérico
        }

        // Paso 3: Evaluar coincidencia
        if (documents && documents.length > 0 && documents[0].similarity_score > SIMILARITY_THRESHOLD) {
            return NextResponse.json({ reply: documents[0].answer });
        } else {
            // Paso 4: Escalar a OpenRouter (Llama 3.1 8B)
            console.log("No se encontró respuesta en Supabase, escalando a LLM...");
            const completion = await openai.chat.completions.create({
                model: 'meta-llama/llama-3.1-8b-instruct',
                // --- PROMPT MEJORADO ---
                messages: [
                    { role: 'system', content: `Eres Lumi, un asistente virtual EXCLUSIVAMENTE para el Hotel Montecarlo en Villa Carlos Paz, Córdoba, Argentina. Tu ÚNICO propósito es responder preguntas sobre los servicios, instalaciones y políticas de ESTE hotel específico. Eres amable, conciso y profesional. NO inventes información. Si no sabes la respuesta sobre el Hotel Montecarlo, di EXACTAMENTE: "${FALLBACK_REPLY}"` },
                    { role: 'user', content: message }
                ],
                // --- AJUSTE DE TEMPERATURA ---
                temperature: 0.3, // Un valor bajo (0 a 1) reduce la "creatividad" y favorece respuestas más directas/probables.
            });

            const reply = completion.choices[0]?.message?.content?.trim() ?? FALLBACK_REPLY;

            // Logueamos si la IA usa el fallback explícito
            if (reply === FALLBACK_REPLY) {
                logUnanswered(questionToLog);
            }

            return NextResponse.json({ reply });
        }
    } catch (error) {
        console.error('Error general en el endpoint /api/chat:', error);
        // Logueamos la pregunta en caso de CUALQUIER error
        if (questionToLog) {
            logUnanswered(questionToLog);
        }
        // Devolvemos el fallback genérico también en caso de error general
        return NextResponse.json({ reply: FALLBACK_REPLY }, { status: 500 });
    }
}