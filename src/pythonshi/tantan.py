from transformers import AutoProcessor, MusicgenForConditionalGeneration
from audiocraft.data.audio import audio_write

# Load processor and model
processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")

# Prepare inputs using the processor
inputs = processor(
    text=["samba music", "steady tempo song with lush chords"],
    padding=True,
    return_tensors="pt",
    
)


# Generate audio based on the input descriptions
audio_values = model.generate(**inputs, max_new_tokens=1024)

# Iterate over the generated audio and save each one
for idx, one_wav in enumerate(audio_values):
    # Will save under {idx}.wav, with loudness normalization at -14 db LUFS.
    audio_write(f'{idx}.wav', one_wav.cpu(), model.config.sampling_rate, strategy="loudness", loudness_compressor=True)
