import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const API_BASE = 'https://api.aimlapi.com/v2';
const API_TOKEN = '47593159f5c04b82beaf0d464961b079'; // Ideally, secure this in an environment variable

async function handleApiResponse(response: Response, endpoint: string, payload?: any) {
    if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try {
            errorJson = JSON.parse(errorText);
        } catch {
            errorJson = errorText;
        }
        
        console.error(`API Error for ${endpoint}:`, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            payload,
            error: errorJson
        });
        
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response;
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();
        const { genre, tempo, requirements, vocalStyle, lyrics } = data;

        console.log('Received request with data:', { genre, tempo, requirements, vocalStyle, lyrics });

        if (!genre || !tempo || !vocalStyle) {
            console.error("Missing required fields:", { received: data, required: ['genre', 'tempo', 'vocalStyle'] });
            return new Response(JSON.stringify({ error: 'Missing required fields: genre, tempo, and vocalStyle' }), { status: 400 });
        }

        // Build the prompt for sample creation
        let promptText = `${genre} ${vocalStyle} at ${tempo} BPM`;
        if (lyrics) {
            promptText += ` with lyrics about ${lyrics}`;
        }
        if (requirements) {
            promptText += `. Additional requirements: ${requirements}`;
        }

        // STEP 1: Initialize audio generation
        const generatePayload = {
            model: 'stable-audio',
            prompt: promptText,
            steps: 100,
            seconds_total: 10
        };

        const generateResponse = await fetch(`${API_BASE}/generate/audio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`,
            },
            body: JSON.stringify(generatePayload),
        });

        await handleApiResponse(generateResponse, 'audio generation', generatePayload);
        const generateData = await generateResponse.json();
        
        // Add detailed logging of the response
        console.log('Audio generation response:', {
            fullResponse: generateData,
            hasId: 'id' in generateData,
            responseKeys: Object.keys(generateData)
        });
        
        if (!generateData.id) {
            throw new Error('Audio generation did not return a valid ID.');
        }

        // Poll for generation completion
        function delay(ms: number) {
            return new Promise(res => setTimeout(res, ms));
        }

        let audioUrl: string | undefined;
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`Polling attempt ${attempt + 1}/${maxAttempts}`);
            await delay(3000);
            
            const params = new URLSearchParams({ generation_id: generateData.id });
            const statusResponse = await fetch(`${API_BASE}/generate/audio?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                },
            });

            await handleApiResponse(statusResponse, 'status check');
            const statusData = await statusResponse.json();
            console.log(`Status check response:`, statusData);

            if (statusData.status === 'completed' && statusData.audio_file?.url) {
                audioUrl = statusData.audio_file.url;
                break;
            }
        }

        if (!audioUrl) {
            throw new Error("Audio generation did not complete in time.");
        }

        // Fetch the generated audio file
        console.log('Downloading generated audio from:', audioUrl);
        const audioResponse = await fetch(audioUrl);
        await handleApiResponse(audioResponse, 'audio download');

        const audioBuffer = await audioResponse.arrayBuffer();

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/wav',
                'Content-Disposition': 'attachment; filename="generated-sample.wav"'
            }
        });
    } catch (error) {
        console.error('Error in sample generation process:', {
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack
            } : String(error)
        });
        return json({ 
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}; 