<script>
    let prompt = "";
    let audioUrl = "";
  
    async function generateMusic() {
      try {
        console.log("Started Generation");
        const response = await fetch(`http://localhost:8000/generate?prompt=${encodeURIComponent(prompt)}`);
  
        // Check if the response is valid
        if (response.ok) {
          const audioBlob = await response.blob();  // Fetch the audio as a Blob
          audioUrl = URL.createObjectURL(audioBlob);  // Create a URL for the WAV file
        } else {
          console.error("Failed to fetch audio:", response.status);
        }
      } catch (error) {
        console.error("Error generating music:", error);
      }
    }
  </script>
  
  <div>
    <input bind:value={prompt} placeholder="Enter music prompt" />
    <button on:click={generateMusic}>Generate Music</button>

{#if audioUrl}
  <audio controls>
    <source src={audioUrl} type="audio/wav" />
    Your browser does not support the audio element.
  </audio>
{/if}
  </div>
