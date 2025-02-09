<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Track } from '$lib/Track';
  import { AudioClip } from '$lib/AudioClip';
  import { draggable } from '@neodrag/svelte';
  import type { DragOptions } from '@neodrag/svelte';
  import * as Tone from 'tone';

  let tracks: Track[] = $state([]);
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let playhead = $state(0);
  
  const pixelsPerSecond = 100;
  
  let transport: ReturnType<typeof Tone.getTransport>;

  let audioItemPosition = $state({ x: 0, y: 0 });
  
  function isOverTracksContainer(element: HTMLElement) {
    // Get all track timeline elements
    const trackTimelines = document.querySelectorAll('.track-timeline');
    if (!trackTimelines.length) return false;
    
    // Get the current bounding rectangle of the dragged element
    const elementRect = element.getBoundingClientRect();
    console.log('Dragged element rect:', elementRect);
    
    // Check each timeline for intersection
    for (const timeline of trackTimelines) {
      const timelineRect = timeline.getBoundingClientRect();
      console.log('Timeline rect:', timelineRect);
      if (
        elementRect.right >= timelineRect.left &&
        elementRect.left <= timelineRect.right &&
        elementRect.bottom >= timelineRect.top &&
        elementRect.top <= timelineRect.bottom
      ) {
        return true;
      }
    }
    return false;
  }

  onMount(() => {
    transport = Tone.getTransport();
    transport.bpm.value = 120;
    
    transport.scheduleRepeat((time) => {
      currentTime = transport.seconds;
      playhead = currentTime * pixelsPerSecond;
    }, 0.1);
  })

  async function togglePlayback() {
    await Tone.start();
    
    if (!isPlaying) {
      transport.start();
      isPlaying = true;
    } else {
      transport.pause();
      isPlaying = false;
    }
  }

  function addTrack() {
    const track = new Track(tracks.length, `Track ${tracks.length + 1}`);
    tracks.push(track);
  }
</script>

<main class="app">

  <a href= "/beatgeneration">CLICK LINK</a>
  <a href= "/beater">CLICK ME!</a>
  <div class="top-bar">
    <div class="logo">
      <img src="/Logo.svg" alt="Logo" />
    </div>
    
    <div class="transport-controls">
      <button class="transport-btn" onclick={togglePlayback}>
        <img src={isPlaying ? "/pauseIcon.svg" : "/playIcon.png"} alt={isPlaying ? "Pause" : "Play"} />
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
          <img src="/aiLogo.svg" alt="Add" />
          <span>Generate Beat</span>
        </button>
        <button class="add-track-btn" onclick={addTrack}>
          <img src="/PlusIcon.svg" alt="Add Track" />
          <span>Add Track</span>
        </button>
      </div>
    </div>
    
    <div class="timeline-ruler">
      <div class="ruler-markings">
        {#each Array(100) as _, i}
          <div class="ruler-mark" style="left: {i * pixelsPerSecond}px">
            <span class="ruler-time">{i}s</span>
          </div>
        {/each}
      </div>
      <div class="playhead" style="left: {playhead}px"></div>
    </div>
  </div>

  <div class="main-content">
    <div class="sidebar">
      <div class="sidebar-section">
        <div class="audio-list">
          <div class="audio-item" use:draggable={{
            bounds: ".main-content",
            gpuAcceleration: true,
            position: audioItemPosition,
            onDragEnd: ({ offsetX, offsetY, rootNode }) => {
                const isOver = isOverTracksContainer(rootNode);
                //console.log('Drop position:', { offsetX, offsetY });
                // console.log('Element rect:', rootNode.getBoundingClientRect());
                //console.log('Is over tracks:', isOver);
                
                if (!isOver) {
                    audioItemPosition = { x: 0, y: 0 };
                } else {
                    audioItemPosition = { x: offsetX, y: offsetY };
                }
            },
            onDrag: ({ offsetX, offsetY }) => {
                audioItemPosition = { x: offsetX, y: offsetY };
            }
          }}>
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
            <div class="track-timeline">
              <div class="track-content">
                <!-- Timeline content -->
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</main>

<style>
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
    height: 3.5rem;
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
    position: relative;
    height: 100%;
    background-color: #111111;
    overflow: hidden;
  }

  .ruler-markings {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
  }

  .ruler-mark {
    position: absolute;
    top: 50%;
    width: 1px;
    height: 10px;
    background-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-50%);
  }

  .ruler-time {
    position: absolute;
    top: -20px;
    left: 2px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
  }

  .playhead {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    background-color: #ff0000;
    z-index: 1000;
    pointer-events: none;
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
    overflow: visible;
  }

  .sidebar-section {
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: visible;
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
    overflow: visible;
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
    z-index: 1000;
    position: relative;
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

  .tracks-content {
    overflow-y: auto;
    background-color: #0a0a0a;
  }

  .track {
    display: grid;
    grid-template-columns: 240px 1fr;
    height: 100px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .track-controls {
    background-color: #2d2a2a;
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
    background-color: #1e1d1f;
    position: relative;
    padding: 0.5rem;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    min-height: 100px;
    position: relative;
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

  .section-header {
    display: none;
  }

  .tracks-header {
    display: none;
  }

  .sidebar-section {
    grid-template-rows: 1fr;
  }

  .tracks-container {
    grid-template-rows: 1fr;
  }
</style>

