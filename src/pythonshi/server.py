from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from transformers import MusicgenForConditionalGeneration, AutoProcessor
import torch
import io
import numpy as np
from pydub import AudioSegment

# Initialize FastAPI app
app = FastAPI()

# ✅ Allow requests from your Svelte frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Allow Svelte app (replace if necessary)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Load processor and model from Hugging Face
processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")

@app.get("/generate")
async def generate_music(prompt: str):
    try:
        # Tokenize the text prompt into model input
        inputs = processor(
            text=[prompt],  # Single description input
            padding=True,
            return_tensors="pt",
        )

        # Generate audio from the model
        with torch.no_grad():
            # Generate audio sequence
            audio_values = model.generate(**inputs, max_new_tokens=500)

        # Prepare a byte stream to return the WAV file
        wav_io = io.BytesIO()

        # Iterate over the generated audio and save each one as a WAV file
        for idx, one_wav in enumerate(audio_values):
            # Convert audio tensor to numpy array
            audio_data = one_wav.cpu().numpy()

            # Log audio data to inspect the range
            print(f"Audio data shape: {audio_data.shape}")
            print(f"First few audio data values: {audio_data[:10]}")

            # Normalize the audio data (important for proper sound)
            audio_data = np.clip(audio_data, -1, 1)  # Clip values between -1 and 1
            audio_data = (audio_data * 32767).astype(np.int16)  # Scale to 16-bit PCM range

            # Convert numpy to audio format using pydub
            audio_segment = AudioSegment(
                audio_data.tobytes(),
                frame_rate=16000,  # Sample rate (adjust if needed)
                sample_width=2,    # 2 bytes per sample (16-bit audio)
                channels=1         # Mono channel
            )

            # Save the audio to the byte stream as WAV
            audio_segment.export(wav_io, format="wav")

        wav_io.seek(0)  # Rewind the byte stream

        # Return the WAV audio as a StreamingResponse with correct MIME type
        return StreamingResponse(wav_io, media_type="audio/wav")

    except Exception as e:
        return {"error": f"Internal Server Error: {e}"}
