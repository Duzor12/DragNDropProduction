<script lang="ts">
  import { createSwapy, type Swapy } from 'swapy';
  import { onMount, onDestroy } from 'svelte';
  import { Track } from '$lib/Track';
  import { AudioClip } from '$lib/AudioClip';

  let tracks: Track[] = $state([]);
  let isPlaying = false;



  let container: HTMLElement
  let swapy: Swapy | null = null

  onMount(() => {
    if (container) {
      swapy = createSwapy(container, {
        animation: 'dynamic',
        // autoScrollOnDrag: true,
        // swapMode: 'drop',
        enabled: true,
        // dragAxis: 'x',
        //dragOnHold: true

      })

      // swapy.enable(false)
      // swapy.destroy()
      // console.log(swapy.slotItemMap())

      swapy.onBeforeSwap((event) => {
        console.log('beforeSwap', event)
        // This is for dynamically enabling and disabling swapping.
        // Return true to allow swapping, and return false to prevent swapping.
        return true
      })

      swapy.onSwapStart((event) => {
        console.log('start', event)
      })

      swapy.onSwap((event) => {
        console.log('swap', event)
      })

      swapy.onSwapEnd((event) => {
        console.log('end', event)
      })
    }
  })

  onDestroy(() => {
    swapy?.destroy()
  })



  function addTrack() {
    const track = new Track(tracks.length, `Track ${tracks.length + 1}`);
    tracks.push(track);
  }

    
</script>

<main class="app">
  <div class="top-bar">
    <div class="logo">
      <img src="/Logo.svg" alt="Logo" />
    </div>
    
    <div class="transport-controls">
      <button class="transport-btn">
        <img src="/playIcon.png" alt="Play" />
      </button>
      <button class="transport-btn">
        <img src="/recordIcon.png" alt="Record" />



      </button>
      <button class="transport-btn">
        <img src="/cutIcon.png" alt="Cut" />
      </button>
    </div>



    <div class="master-controls">
      <div class="volume-control">
        <img src="/VolumeIcon.svg" alt="Volume" />
        <input type="range" min="0" max="100" value="100" />
      </div>
    </div>

    <div class="project-controls">
      <button class="project-btn">Export</button>
      <button class="project-btn">Save</button>
    </div>
  </div>

  <div class="controls-and-ruler">
    <div class="left-controls">
      <div class="control-buttons">
        <button class="add-btn">
          <img src="/PlusIcon.svg" alt="Add" />
          <span>Audio Files</span>
        </button>
        <button class="add-track-btn" onclick={addTrack}>
          <img src="/PlusIcon.svg" alt="Add Track" />
          <span>Add Track</span>
        </button>
      </div>
    </div>
    
    <div class="timeline-ruler">
      <!-- Add ruler markings here -->
    </div>
  </div>

  <div class="main-content" bind:this={container}>
    <div class="sidebar">
      <div class="sidebar-section">
        <div class="audio-list" data-swapy-slot="1">
          <div class="audio-item" data-swapy-item="1">
            <span class="audio-name">Audio 1</span>
            <span class="audio-duration">2:30</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tracks-container">
      <div class="tracks-content">
        {#each tracks as track}
          <div class="track">
            <div class="track-controls">
              <div class="track-header">
                <h4>{track.name}</h4>
              </div>
            </div>
            <div class="track-timeline" data-swapy-slot="2">
              <!-- Timeline content -->
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</main>

<style>
  /* Add these global reset styles at the top of your style block */
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #0a0a0a;
    min-height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .app {
    height: 100vh;
    width: 100vw;
    display: grid;
    grid-template-rows: auto auto 1fr;
    background-color: #0a0a0a;
    color: #e1e1e1;
    font-family: 'JetBrains Mono', monospace;
    overflow: hidden;
  }

  .top-bar {
    background-color: #111111;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.5rem 2rem;
    display: grid;
    grid-template-columns: auto minmax(auto, 400px) minmax(auto, 300px) auto;
    gap: 3rem;
    align-items: center;
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
  }

  .logo {
    padding: 0.5rem 0;
  }

  .logo img {
    height: 2.75rem;
    width: auto;
    transition: opacity 0.2s ease;
  }

  .logo img:hover {
    opacity: 0.9;
  }

  .transport-controls {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 0.75rem;
    justify-content: center;
    margin: 0 auto;
    width: fit-content;
  }

  .transport-btn {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 0.6rem;
    width: 44px;
    height: 44px;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .transport-btn:hover {
    background-color: #222;
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .transport-btn:active {
    transform: scale(0.95);
  }

  .transport-btn img {
    width: 20px;
    height: 20px;
    opacity: 0.9;
  }

  .timeline-ruler {
    height: 2rem;
    background-color: #111111;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  .main-content {
    display: grid;
    grid-template-columns: 240px 1fr;
    overflow: hidden;
  }

  .sidebar {
    background-color: #111111;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .sidebar-section {
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .section-header {
    padding: 1.25rem;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem;
    align-items: center;
    border-bottom: 1px solid #202020;
    background-color: #141414;
  }

  .audio-list {
    padding: 0.5rem;
    overflow-y: auto;
  }

  .audio-item {
    padding: 1rem;
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    margin-bottom: 0.5rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .audio-item:hover {
    background-color: #222;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .tracks-container {
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
  }

  .tracks-header {
    padding: 1.25rem;
    background-color: #111111;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  .tracks-content {
    overflow-y: auto;
    background-color: #0a0a0a;
  }

  .track {
    display: grid;
    grid-template-columns: 240px 1fr;
    min-height: 120px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .track-controls {
    background-color: #111111;
    border-right: 1px solid #202020;
    padding: 1.25rem;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 1rem;
  }

  .track-header {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5rem;
    align-items: center;
  }

  .track-buttons {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 0.25rem;
  }

  .track-btn {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.5rem 0.9rem;
    color: #ffffff;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .track-btn:hover {
    background-color: #222;
    border-color: rgba(255, 255, 255, 0.15);
  }

  .track-btn:active {
    transform: scale(0.95);
  }

  .track-fader {
    display: grid;
    place-items: center;
    padding: 0.5rem;
  }

  .vertical-slider {
    -webkit-appearance: none;
    width: 4px;
    height: 100px;
    background: #1a1a1a;
    border-radius: 4px;
    outline: none;
    writing-mode: bt-lr;
    -webkit-appearance: slider-vertical;
    border: none;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .vertical-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: #e1e1e1;
    border: 2px solid #1a1a1a;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }

  .vertical-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: #e1e1e1;
    border: 2px solid #1a1a1a;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }

  .vertical-slider::-webkit-slider-runnable-track {
    width: 4px;
    cursor: pointer;
    background: #1a1a1a;
    border-radius: 2px;
  }

  .vertical-slider::-moz-range-track {
    width: 4px;
    cursor: pointer;
    background: #1a1a1a;
    border-radius: 2px;
  }

  /* Active state */
  .vertical-slider:active::-webkit-slider-thumb {
    background: #e0e0e0;
    transform: scale(1.1);
  }

  .vertical-slider:active::-moz-range-thumb {
    background: #e0e0e0;
    transform: scale(1.1);
  }

  /* For Firefox */
  @-moz-document url-prefix() {
    .vertical-slider {
      width: 100px;
      height: 4px;
      transform: rotate(270deg);
      transform-origin: left;
      margin: 48px 0;
    }
  }

  .track-timeline {
    background-color: #0c0c0c;
    position: relative;
    padding: 0.5rem;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
  }

  .add-btn, 
  .add-track-btn {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 0.75rem 1.25rem;
    color: #ffffff;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .add-track-btn {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
  }

  .add-btn:hover,
  .add-track-btn:hover {
    background-color: #222;
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .add-btn:active,
  .add-track-btn:active {
    transform: scale(0.98);
  }

  h3, h4 {
    margin: 0;
    font-size: 0.875rem;
    color: #e1e1e1;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .project-controls {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 0.75rem;
  }

  .project-btn {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 0.6rem 1.25rem;
    color: #ffffff;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .project-btn:hover {
    background-color: #222;
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .project-btn:active {
    transform: scale(0.98);
  }

  .master-controls {
    display: grid;
    align-items: center;
    width: fit-content;
    margin: 0 auto;
  }

  .volume-control {
    display: grid;
    grid-template-columns: auto minmax(100px, 150px);
    gap: 0.75rem;
    align-items: center;
  }

  .volume-control img {
    width: 20px;
    height: 20px;
  }

  input[type="range"] {
    -webkit-appearance: none;
    background-color: #1a1a1a;
    border-radius: 4px;
    height: 6px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  input[type="range"]::-webkit-slider-thumb {
    width: 14px;
    height: 14px;
    background: #e1e1e1;
    border: 2px solid #1a1a1a;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }

  .controls-and-ruler {
    background-color: #111111;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    height: 48px;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  .left-controls {
    padding: 0 1rem;
    height: 100%;
    display: grid;
    align-items: center;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    min-width: 480px;
  }

  .control-buttons {
    display: grid;
    grid-template-columns: auto auto;
    gap: 1rem;
    width: 100%;
  }

  .add-btn, 
  .add-track-btn {
    width: auto;
    min-width: 160px;
  }

  .timeline-ruler {
    height: 100%;
    background-color: #111111;
    position: relative;
    padding: 0 1rem;
  }

  /* Update add buttons to be more compact */
  .add-btn, 
  .add-track-btn {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.5rem 0.75rem;
    color: #ffffff;
    cursor: pointer;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.875rem;
    width: 100%;
    transition: all 0.2s ease;
  }

  .add-btn img,
  .add-track-btn img {
    width: 16px;
    height: 16px;
  }

  /* Remove the old section header styles that we don't need anymore */
  .section-header {
    display: none;
  }

  .tracks-header {
    display: none;
  }

  /* Update the main content to remove the old header space */
  .sidebar-section {
    grid-template-rows: 1fr;
  }

  .tracks-container {
    grid-template-rows: 1fr;
  }
</style>
