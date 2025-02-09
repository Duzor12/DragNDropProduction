import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BEATOVEN_API_BASE = 'https://public-api.beatoven.ai';
const API_TOKEN = 'DtEY7zR_p_E7naxQr9HUIg'; // Ideally, secure this in an environment variable

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
        const { genre, tempo, requirements } = data;

        console.log('Received request with data:', { genre, tempo, requirements });

        if (!genre || !tempo) {
            console.error("Missing required fields:", { received: data, required: ['genre', 'tempo'] });
            return new Response(JSON.stringify({ error: 'Missing required fields: genre and tempo' }), { status: 400 });
        }

        // Build the prompt for track creation.
        let promptText = `30 seconds ${genre} track at ${tempo} BPM`;
        if (requirements) {
            promptText += ` with ${requirements}`;
        }

        const trackInitPayload = { prompt: { text: promptText } };
        console.log('Initializing track creation:', {
            endpoint: `${BEATOVEN_API_BASE}/api/v1/tracks`,
            payload: trackInitPayload
        });

        // STEP 1: Initialize a track with Beatoven.ai
        const trackInitResponse = await fetch(`${BEATOVEN_API_BASE}/api/v1/tracks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`,
            },
            body: JSON.stringify(trackInitPayload),
        });

        await handleApiResponse(trackInitResponse, 'track initialization', trackInitPayload);
        const trackInitData = await trackInitResponse.json();
        console.log('Track initialization response:', trackInitData);

        const trackId = trackInitData.tracks && trackInitData.tracks[0];
        if (!trackId) {
            console.error("Invalid track initialization response:", trackInitData);
            throw new Error('Track creation did not return a valid track ID.');
        }

        console.log(`Track created successfully with ID: ${trackId}`);

        // STEP 2: Start composing the track
        const composePayload = { format: 'wav', looping: false };
        const composeEndpoint = `${BEATOVEN_API_BASE}/api/v1/tracks/compose/${trackId}`;
        console.log('Starting track composition:', {
            endpoint: composeEndpoint,
            payload: composePayload
        });

        const composeResponse = await fetch(composeEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`,
            },
            body: JSON.stringify(composePayload),
        });

        await handleApiResponse(composeResponse, 'track composition', composePayload);
        const composeData = await composeResponse.json();
        console.log('Composition initiated response:', composeData);

        const taskId = composeData.task_id;
        if (!taskId) {
            console.error("Invalid composition response:", composeData);
            throw new Error('Composition did not return a valid task ID.');
        }

        console.log(`Composition task created with ID: ${taskId}`);

        // Poll for composition completion
        function delay(ms: number) {
            return new Promise(res => setTimeout(res, ms));
        }

        let audioUrl: string | undefined;
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`Polling attempt ${attempt + 1}/${maxAttempts} for task ${taskId}`);
            await delay(3000);
            
            const statusEndpoint = `${BEATOVEN_API_BASE}/api/v1/tracks/status/${taskId}`;
            console.log(`Checking composition status:`, { endpoint: statusEndpoint });
            
            const statusResponse = await fetch(statusEndpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                },
            });

            await handleApiResponse(statusResponse, 'status check');
            const statusData = await statusResponse.json();
            console.log(`Status check response:`, statusData);

            if (statusData.status === 'completed' && statusData.downloadUrl) {
                audioUrl = statusData.downloadUrl;
                console.log('Composition completed successfully:', { downloadUrl: audioUrl });
                break;
            }
        }

        if (!audioUrl) {
            throw new Error("Track composition did not complete in time.");
        }

        // Fetch the generated audio file
        console.log('Downloading generated audio from:', audioUrl);
        const audioResponse = await fetch(audioUrl);
        await handleApiResponse(audioResponse, 'audio download');

        const audioBuffer = await audioResponse.arrayBuffer();
        console.log('Audio file downloaded successfully:', {
            size: audioBuffer.byteLength,
            type: 'audio/wav'
        });

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/wav',
                'Content-Disposition': 'attachment; filename="generated-beat.wav"'
            }
        });
    } catch (error) {
        console.error('Error in beat generation process:', {
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