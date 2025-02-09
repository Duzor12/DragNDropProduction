<script>
    let prompt = "";
    let audioSrc = "";
    let loading = false;
  
    async function generateMusic() {
      if (!prompt) {
        alert("Please enter a prompt!");
        return;
      }
  
      loading = true;
      audioSrc = "";
  
      try {
        const response = await fetch("https://plentymercy-dragndropgenerator.hf.space", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: [prompt] }) // Required format for Gradio API
        });
  
        const result = await response.json();
        console.log("API Response:", result);
  
        if (result && result.data && result.data.length > 0) {
          audioSrc = result.data[0]; // Extract the generated audio file URL
        } else {
          console.error("Unexpected API response format:", result);
        }
      } catch (error) {
        console.error("Error generating music:", error);
      } finally {
        loading = false;
      }
    }
  </script>
  
  <style>
    .loading {
      font-size: 1.2rem;
      font-weight: bold;
      color: #ff6600;
    }
  </style>
  
  <div>
    <h2>🎵 AI Music Generator</h2>
  
    <input type="text" bind:value={prompt} placeholder="Enter a prompt for music generation..." />
    <button on:click={generateMusic} disabled={loading}>
      {loading ? "Generating..." : "Generate Music"}
    </button>
  
    {#if loading}
      <p class="loading">🎶 Generating music, please wait...</p>
    {/if}
  
    {#if audioSrc}
      <h3>Generated Music:</h3>
      <audio controls>
        <source src={audioSrc} type="audio/wav" />
        Your browser does not support the audio element.
      </audio>
    {/if}
  </div>
  