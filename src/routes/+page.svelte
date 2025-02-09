<script lang="ts">
  import { onMount } from 'svelte';
  import * as Tone from 'tone';
  import WaveformPlaylist from "waveform-playlist";
  import AddTrackDialog from '$lib/AddTrackDialog.svelte';
  import RecordingDialog from '$lib/RecordingDialog.svelte';
  import GenerateBeatDialog from '$lib/GenerateBeatDialog.svelte';
  import lamejs from 'lamejs';

  let isPlaying = $state(false);
  let showAddTrackDialog = $state(false);
  let showRecordingDialog = $state(false);
  let showGenerateBeatDialog = $state(false);
  let playlist: any;

  onMount(() => {
    // Initialize waveform playlist
    playlist = WaveformPlaylist({
      samplesPerPixel: 3000,
      audioContext: Tone.context,
      state: 'shift',
      mono: false,
      waveHeight: 100,
      container: document.getElementById("playlist"),
      colors: {
        waveOutlineColor: "#E0EFF1",
        timeColor: "grey",
        fadeColor: "black",
        progressColor: "transparent"
      },
      controls: {
        show: false,
        width: 0,
      },
      zoomLevels: [500, 1000, 3000, 5000],
      timescale: true,
      seekStyle: 'line',
      isAutomaticScroll: true,
      linkedEditing: true,
      options: {
        isAutomaticScroll: true,
      },
      masterGain: 1
    });

    // Set up playback state tracking
    playlist.ee.on('play', () => {
      isPlaying = true;
    });

    playlist.ee.on('pause', () => {
      isPlaying = false;
    });

    playlist.ee.on('finished', () => {
      isPlaying = false;
    });
  });

  async function togglePlayback() {
    await Tone.start();
    if (!isPlaying) {
      playlist.play();
      isPlaying = true;
    } else {
      playlist.pause();
      isPlaying = false;
    }
  }

  async function handleFileSelected(event: CustomEvent) {
    const file = event.detail.file;
    if (file) {
      playlist.load([ 
        {
          src: file,
          name: file.name,
        },
      ]);
      showAddTrackDialog = false;
    }
  }

  function handleGenerateSample() {
    // This will be implemented later with AI functionality
    console.log("Generate sample clicked - to be implemented");
  }

  async function handleRecordingComplete(event: CustomEvent) {
    const recording = event.detail.recording;
    if (recording) {
      const audioUrl = URL.createObjectURL(recording);
      playlist.load([
        {
          src: audioUrl,
          name: "Recorded Audio",
        },
      ]);
      showRecordingDialog = false;
    }
  }

  async function handleBeatGenerated(event: CustomEvent) {
    const audioBlob = event.detail.audioBlob;
    if (audioBlob) {
      playlist.load([
        {
          src: URL.createObjectURL(audioBlob),
          name: "Generated Beat",
        },
      ]);
      showGenerateBeatDialog = false;
    }
  }

  async function customRenderAudio() {
    if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
      throw new Error("No tracks available for rendering.");
    }

    // Get the audio context from Tone.js
    const audioContext = Tone.context;
    
    // Create a new offline context for rendering
    let maxDuration = 0;
    const trackBuffers = [];
    
    // First pass: collect all track buffers and find max duration
    for (const track of playlist.tracks) {
      try {
        console.log('Track object:', track);
        
        // Try different possible locations of the audio buffer
        let buffer = null;
        
        if (track.buffer) {
          buffer = track.buffer;
        } else if (track.planner && track.planner.buffer) {
          buffer = track.planner.buffer;
        } else if (track.states && track.states.audio) {
          buffer = track.states.audio.buffer;
        } else if (track.peaks && track.peaks.data) {
          // If we have peaks data, we might need to get the buffer from the audio element
          const audioElement = track.peaks.audio;
          if (audioElement && audioElement instanceof HTMLAudioElement) {
            const response = await fetch(audioElement.src);
            const arrayBuffer = await response.arrayBuffer();
            buffer = await audioContext.decodeAudioData(arrayBuffer);
          }
        }

        if (buffer) {
          trackBuffers.push({
            buffer: buffer,
            startTime: track.startTime || 0,
            gain: track.gain || 1
          });
          const trackEnd = (track.startTime || 0) + buffer.duration;
          maxDuration = Math.max(maxDuration, trackEnd);
          console.log('Successfully got buffer for track:', { duration: buffer.duration, channels: buffer.numberOfChannels });
        } else {
          console.warn('Could not find buffer in track:', track);
        }
      } catch (err) {
        console.warn('Error processing track:', err);
      }
    }

    if (trackBuffers.length === 0) {
      throw new Error("No valid audio buffers found in tracks. Please ensure all tracks are properly loaded.");
    }

    // Create offline context with the max duration
    const offlineContext = new OfflineAudioContext(2, Math.ceil(maxDuration * audioContext.sampleRate), audioContext.sampleRate);

    // Second pass: schedule all buffers in the offline context
    for (const trackData of trackBuffers) {
      const source = offlineContext.createBufferSource();
      const gainNode = offlineContext.createGain();
      
      source.buffer = trackData.buffer;
      gainNode.gain.value = trackData.gain;
      
      source.connect(gainNode);
      gainNode.connect(offlineContext.destination);
      
      source.start(trackData.startTime);
    }

    // Render and return the final buffer
    console.log('Starting offline render...');
    const renderedBuffer = await offlineContext.startRendering();
    console.log('Render complete!');
    return renderedBuffer;
  }

  async function handleExport() {
    try {
      console.log('Starting export...');
      const audioBuffer = await customRenderAudio();
      console.log('Audio buffer received:', audioBuffer);
      
      // WAV file format constants
      const numChannels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const bytesPerSample = 2; // 16-bit audio
      const blockAlign = numChannels * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = audioBuffer.length * blockAlign;
      const headerSize = 44;
      const totalSize = headerSize + dataSize;
      
      // Create the WAV buffer
      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);
      
      // Write WAV header
      // "RIFF" chunk descriptor
      writeString(view, 0, 'RIFF');
      view.setUint32(4, totalSize - 8, true);
      writeString(view, 8, 'WAVE');
      
      // "fmt " sub-chunk
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, 1, true); // audio format (1 for PCM)
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true); // bits per sample
      
      // "data" sub-chunk
      writeString(view, 36, 'data');
      view.setUint32(40, dataSize, true);
      
      // Write audio data
      let offset = 44;
      for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
          const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, int16, true);
          offset += 2;
        }
      }
      
      // Helper function to write strings to DataView
      function writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      }
      
      console.log('WAV file created, preparing download...');
      
      // Create and trigger download
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = 'exported-audio.wav';
      downloadLink.click();
      
      // Clean up
      URL.revokeObjectURL(downloadLink.href);
      console.log('Export complete!');
    } catch (error) {
      console.error('Detailed export error:', error);
      alert('Failed to export audio. Please try again.');
    }
  }
</script>

<main class="app">
  <AddTrackDialog 
    show={showAddTrackDialog} 
    on:fileSelected={handleFileSelected}
    on:generateSample={handleGenerateSample}
    on:close={() => showAddTrackDialog = false}
  />
  <RecordingDialog 
    show={showRecordingDialog}
    on:recordingComplete={handleRecordingComplete}
    on:close={() => showRecordingDialog = false}
  />
  <GenerateBeatDialog
    show={showGenerateBeatDialog}
    on:beatGenerated={handleBeatGenerated}
    on:close={() => showGenerateBeatDialog = false}
  />
  <div class="top-bar">
    <div class="logo">
      <img src="/Logo.svg" alt="Logo" />
    </div>
    
    <div class="transport-controls">
      <button class="transport-btn" on:click={togglePlayback}>
        <img src={isPlaying ? "/pauseIcon.svg" : "/playIcon.png"} alt={isPlaying ? "Pause" : "Play"} />
      </button>
      <button class="transport-btn" on:click={() => showRecordingDialog = true}>
        <img src="/recordIcon.png" alt="Record" />
      </button>
    </div>

    <div class="project-controls">
      <button class="project-btn" on:click={handleExport}>Export</button>
    </div>
  </div>

  <div class="controls">
    <div class="left-controls">
      <div class="control-buttons">
        <button class="add-btn" on:click={() => showGenerateBeatDialog = true}>
          <img src="/aiLogo.svg" alt="Add" />
          <span>Generate Beat</span>
        </button>
        <button class="add-track-btn" on:click={() => showAddTrackDialog = true}>
          <img src="/PlusIcon.svg" alt="Add Track" />
          <span>Add Track</span>
        </button>
      </div>
    </div>
  </div>

  <div class="main-content">
    <div class="sidebar">
      <div class="sidebar-section">
        <div class="audio-list">
          {#each playlist?.tracks || [] as track}
            <div class="audio-item">
              <span>{track.name || 'Untitled Track'}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
    <div class="tracks-container">
      <div id="playlist"></div>
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
    grid-template-rows: 80px 60px 1fr;
    background-color: #0a0a0a;
    color: #e1e1e1;
    font-family: 'JetBrains Mono', monospace;
    overflow: hidden;
  }

  .top-bar {
    background-color: #111111;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0 2.5rem;
    display: grid;
    grid-template-columns: 240px 1fr auto;
    gap: 4rem;
    align-items: center;
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
  }

  .logo {
    padding: 0.75rem 0;
  }

  .logo img {
    height: 3rem;
    width: auto;
    transition: opacity 0.2s ease;
  }

  .logo img:hover {
    opacity: 0.9;
  }

  .transport-controls {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 1rem;
    justify-content: center;
    margin: 0 auto;
    width: fit-content;
  }

  .transport-btn {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem;
    width: 48px;
    height: 48px;
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
    transform: translateY(-1px);
  }

  .transport-btn:active {
    transform: scale(0.95);
  }

  .transport-btn img {
    width: 22px;
    height: 22px;
    opacity: 0.9;
  }

  .project-controls {
    display: grid;
    gap: 1rem;
  }

  .project-btn {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    color: #ffffff;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    min-width: 120px;
  }

  .project-btn:hover {
    background-color: #222;
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transform: translateY(-1px);
  }

  .project-btn:active {
    transform: scale(0.98);
  }

  .controls {
    background-color: #111111;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    height: 60px;
    display: flex;
    flex-direction: row;
    align-items: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    padding: 0 2.5rem;
  }

  .left-controls {
    height: 100%;
    display: grid;
    align-items: center;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    padding-right: 2.5rem;
    min-width: 480px;
  }

  .control-buttons {
    display: grid;
    grid-template-columns: auto auto;
    gap: 1.5rem;
    width: 100%;
  }

  .add-btn, 
  .add-track-btn {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem 1.25rem;
    color: #ffffff;
    cursor: pointer;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    align-items: center;
    font-size: 0.875rem;
    width: 100%;
    transition: all 0.2s ease;
    min-width: 180px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .add-btn:hover,
  .add-track-btn:hover {
    background-color: #222;
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transform: translateY(-1px);
  }

  .add-btn:active,
  .add-track-btn:active {
    transform: scale(0.98);
  }

  .add-btn img,
  .add-track-btn img {
    width: 18px;
    height: 18px;
  }

  .main-content {
    display: grid;
    grid-template-columns: 240px 1fr;
    height: 100%;
    overflow: hidden;
  }

  .sidebar {
    background-color: #111111;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: grid;
    grid-template-rows: 1fr;
    overflow: hidden;
  }

  .sidebar-section {
    display: grid;
    grid-template-rows: 1fr;
    overflow: hidden;
  }

  .audio-list {
    padding: 1.25rem;
    overflow-y: auto;
    display: grid;
    gap: 0.75rem;
  }

  .audio-item {
    padding: 1rem 1.25rem;
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
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
    overflow: hidden;
    height: 100%;
    padding: 1.25rem;
  }

  #playlist {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  :global(#playlist .playlist-time-scale) {
    background-color: #1a1a1a !important;
    color: white !important;
    padding: 0.5rem !important;
  }

  :global(#playlist .channel) {
    background-color: #1e1e1e !important;
    margin: 0.5rem 0 !important;
    border-radius: 6px !important;
  }

  :global(#playlist .playlist-tracks) {
    background-color: #141414 !important;
    padding: 0.5rem !important;
  }

  :global(#playlist .channel-progress) {
    background: rgba(74, 158, 255, 0.2) !important;
  }

  :global(#playlist .cursor) {
    background: rgba(255, 255, 255, 0.2) !important;
  }

  :global(#playlist .channel wave) {
    background-color: #1e1e1e !important;
    border: none !important;
  }

  :global(#playlist .channel.cursor-active) {
    background-color: #252525 !important;
  }

  :global(#playlist .channel:hover) {
    background-color: #252525 !important;
  }
</style>
