// src/app/api/chat/route.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const openai = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY! });
const SIMILARITY_THRESHOLD = 0.80;
const FALLBACK_REPLY = "Lo siento, no he podido encontrar una respuesta específica sobre eso en mi base de conocimientos del hotel. ¿Podrías reformular tu pregunta o escribir 'asistente' si necesitas ayuda personalizada?";

const LOG_ENDPOINT_BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

async function logUnanswered(question: string) {
    fetch(`${LOG_ENDPOINT_BASE_URL}/api/log-unanswered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
    }).catch(error => {
        console.error("Error al intentar loguear pregunta:", error);
    });
}

export async function POST(req: Request) {
    let questionToLog: string | null = null;

    try {
        const { message } = await req.json();
        questionToLog = message;

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'El mensaje es requerido y debe ser un texto.' }, { status: 400 });
        }

        const { pipeline } = await import('@xenova/transformers');
        const generateEmbedding = await pipeline('feature-extraction', 'Xenova/gte-small');
        const output = await generateEmbedding(message, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);

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

            // --- AQUÍ ESTÁ LA CORRECCIÓN ---
            // Logueamos la pregunta si Supabase falla y si la tenemos
            if (questionToLog) {
                logUnanswered(questionToLog);
            } else {
                console.error("No se pudo loguear la pregunta porque questionToLog era null en el bloque rpcError.");
                // Opcional: loguear un mensaje genérico
                // logUnanswered("Pregunta desconocida - Error en RPC Supabase");
            }
            // -----------------------------

            return NextResponse.json({ reply: FALLBACK_REPLY }, { status: 500 }); // Devolvemos el fallback genérico
        }

        if (documents && documents.length > 0 && documents[0].similarity_score > SIMILARITY_THRESHOLD) {
            return NextResponse.json({ reply: documents[0].answer });
        } else {
            console.log("No se encontró respuesta en Supabase, escalando a LLM...");
            const completion = await openai.chat.completions.create({
                model: 'meta-llama/llama-3.1-8b-instruct',
                messages: [
                  { role: 'system', content: `Eres Lumi, un asistente virtual EXCLUSIVAMENTE para el Hotel Montecarlo en Villa Carlos Paz, Córdoba, Argentina. Tu ÚNICO propósito es responder preguntas sobre los servicios, instalaciones y políticas de ESTE hotel específico. Eres amable, conciso y profesional. NO inventes información. Si no sabes la respuesta sobre el Hotel Montecarlo, di EXACTAMENTE: "${FALLBACK_REPLY}"` },
                  { role: 'user', content: message }
                ],
                temperature: 0.3,
            });

            const reply = completion.choices[0]?.message?.content?.trim() ?? FALLBACK_REPLY;

            if (reply === FALLBACK_REPLY) {
                // Logueamos solo si la IA específicamente usa el fallback
                if (questionToLog) { // Añadimos check aquí también por si acaso
                  logUnanswered(questionToLog);
                }
            }

            return NextResponse.json({ reply });
        }
    } catch (error) {
        console.error('Error general en el endpoint /api/chat:', error);
        if (questionToLog) {
            logUnanswered(questionToLog);
        }
        const errorMessage = error instanceof Error ? error.message : 'Ha ocurrido un error interno.';
        // Devolvemos el fallback genérico en caso de error, para consistencia con el mensaje del prompt
        return NextResponse.json({ reply: FALLBACK_REPLY }, { status: 500 });
    }
}