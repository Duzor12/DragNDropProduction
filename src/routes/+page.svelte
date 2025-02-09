<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { Track } from '$lib/Track.svelte';
  import AudioClip from '$lib/AudioClip.svelte';
  import { draggable } from '@neodrag/svelte';
  import type { DragOptions } from '@neodrag/svelte';
  import * as Tone from 'tone';
  import WaveformPlaylist from "waveform-playlist";
  import AddTrackDialog from '$lib/AddTrackDialog.svelte';


  let tracks: Track[] = $state([]);
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let playhead = $state(0);
  let playbackStarted = $state(false);
  let showAddTrackDialog = $state(false);
  
  const pixelsPerSecond = 17;
  
  let transport: ReturnType<typeof Tone.getTransport>;
  let masterGain: Tone.Gain;

  let audioItemPosition = $state({ x: 0, y: 0 });
  
  let audioElements: Record<string, HTMLElement> = {};
  let options: DragOptions = {
    // allow dragging in both x and y directions for moving clips between tracks
    bounds: 'parent',
    axis: undefined, // Allow both x and y movement
    grid: [1, 100], // Snap to track heights
    onDrag: (data) => {
      const clipElement = data.rootNode as HTMLElement;
      if (clipElement) {
        clipElement.style.zIndex = '1000'; // Ensure dragged clip stays on top
      }
    },
    onDragEnd: (data) => {
        const clipId = data.rootNode.id;
        const draggedElement = data.rootNode as HTMLElement;
        if (draggedElement) {
          draggedElement.style.zIndex = '100'; // Reset z-index after drag
        }

        console.log('Drag end event data:', data);

        // Determine drop coordinates using event data if available
        let dropX, dropY;
        if (data.event) {
            dropX = data.event.clientX;
            dropY = data.event.clientY;
        } else {
            const fallbackEl = document.getElementById(clipId);
            if (!fallbackEl) return;
            const rect = fallbackEl.getBoundingClientRect();
            dropX = rect.x + rect.width / 2;
            dropY = rect.y + rect.height / 2;
        }

        // Use document.elementFromPoint to get the drop target
        const dropTarget = document.elementFromPoint(dropX, dropY);
        const trackTimeline = dropTarget?.closest('.track-timeline');
        if (!trackTimeline) {
            console.error('No track timeline found at drop location');
            return;
        }

        const timelineRect = trackTimeline.getBoundingClientRect();
        const clipElement = document.getElementById(clipId);
        if (!clipElement) return;
        const clipRect = clipElement.getBoundingClientRect();
        const relativeX = clipRect.x - timelineRect.x;
        const newStartTime = relativeX / pixelsPerSecond;

        const newTrackId = trackTimeline.getAttribute('data-track-id');

        console.log('New start time (seconds):', newStartTime, 'for clip:', clipId, 'in track:', newTrackId);

        // Find the clip in our tracks data by matching clip id
        let sourceTrack = null;
        let clipIndex = -1;
        for (const track of tracks) {
            const index = track.clips.findIndex((c) => c.id.toString() === clipId);
            if (index !== -1) {
                sourceTrack = track;
                clipIndex = index;
                break;
            }
        }

        if (!sourceTrack) {
            console.error('Clip not found in any track');
            return;
        }

        // Remove the clip from its current track
        const [movedClip] = sourceTrack.clips.splice(clipIndex, 1);

        // If the clip was dropped on a different track, add it to that track's clips
        if (newTrackId && newTrackId !== sourceTrack.id.toString()) {
            const targetTrack = tracks.find((t) => t.id.toString() === newTrackId);
            if (targetTrack) {
                targetTrack.clips.push(movedClip);
                console.log('Moved clip to new track:', newTrackId);
            } else {
                // If target track not found, revert to original track
                sourceTrack.clips.push(movedClip);
            }
        } else {
            // Dropped in same track, push it back
            sourceTrack.clips.push(movedClip);
        }
        
        // Update the tracks array to trigger reactivity
        tracks = tracks.slice();

        // Update clip data for visual repositioning
        movedClip.startTime = newStartTime;

        // Update clip playback start time
        if (movedClip.player) {
            movedClip.player.stop();
            movedClip.player.unsync();

            // If scheduling before current time, update transport
            if (newStartTime < currentTime) {
                transport.pause();
                transport.seconds = newStartTime;
                if (isPlaying) {
                    transport.start();
                }
            }
            movedClip.player.sync().start(newStartTime);
        }
    }
  };


  let playlist: any;

  let activeTrackId: number | null = null;

  let trackDragOptions: DragOptions = {
    bounds: 'parent',
    axis: 'y',
    onDrag: (data) => {
      const trackElem = data.rootNode as HTMLElement;
      if (trackElem) {
        trackElem.style.zIndex = '1000';
      }
    },
    onDragEnd: (data) => {
      const trackElem = data.rootNode as HTMLElement;
      if (trackElem) trackElem.style.zIndex = '100';
      const tracksContainer = document.querySelector('.tracks-content');
      if (!tracksContainer) return;
      const children = Array.from(tracksContainer.children) as HTMLElement[];
      const newOrderIds = children.map(child => {
        const idAttr = child.getAttribute('id');
        if(idAttr && idAttr.startsWith('track-')) {
           return parseInt(idAttr.replace('track-', ''));
        }
        return null;
      }).filter(x => x !== null) as number[];
      tracks = newOrderIds.map(id => tracks.find(t => t.id === id)).filter(t => t !== undefined) as typeof tracks;
    }
  };

  onMount(() => {
    transport = Tone.getTransport();
    masterGain = new Tone.Gain(Tone.dbToGain(0)).toDestination();
    transport.bpm.value = 120;
    
    transport.scheduleRepeat((time) => {
      currentTime = transport.seconds;
      playhead = currentTime * pixelsPerSecond;
    }, 0.1);

    // Initialize waveform playlist
    playlist = WaveformPlaylist({
      samplesPerPixel: 3000,
      audioContext: Tone.context,
      mono: false,
      waveHeight: 100,
      container: document.getElementById("playlist"),
      state: "cursor",
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
      timescale: false,
      seekStyle: 'line',
      isAutomaticScroll: true,
      linkedEditing: true,
      options: {
        isAutomaticScroll: true,
      }
    });

    // Set up initial track
    addTrack();

    // Set up playback position tracking
    playlist.ee.on('timeupdate', (position: number) => {
      currentTime = position;
      updateTimelineMarker(position);
    });

    playlist.ee.on('play', () => {
      isPlaying = true;
      playbackStarted = true;
    });

    playlist.ee.on('pause', () => {
      isPlaying = false;
    });

    playlist.ee.on('finished', () => {
      isPlaying = false;
      playbackStarted = false;
      currentTime = 0;
      updateTimelineMarker(0);
    });

    // Handle seeking when clicking on timeline
    const timelineEl = document.querySelector('.timeline');
    if (timelineEl) {
      timelineEl.addEventListener('click', ((e: Event) => {
        const mouseEvent = e as MouseEvent;
        const rect = timelineEl.getBoundingClientRect();
        const x = mouseEvent.clientX - rect.left;
        const time = x / pixelsPerSecond;
        playlist.ee.emit('select', time, time);
        currentTime = time;
        updateTimelineMarker(time);
      }) as EventListener);
    }
  })

  async function togglePlayback() {
    await Tone.start();
    
    if (!isPlaying) {
      if (!playbackStarted) {
        // If starting from beginning or after finish
        playlist.play(0);
      } else {
        // Resume from current position
        playlist.play(currentTime);
      }
      isPlaying = true;
      transport.start();
    } else {
      playlist.pause();
      isPlaying = false;
      transport.pause();
    }
  }

  function addTrack(file?: File) {
    const track = new Track(tracks.length, `Track ${tracks.length + 1}`);
    tracks.push(track);
    
    if (file) {
      // If file provided, load it into the track
      playlist.load([ 
        {
          src: file,
          name: file.name,
          gain: 0.5,
        },
      ]).then(() => {
        // Track loaded successfully
        if(masterGain) {
          track.clips.forEach(clip => {
            if(clip.player) {
              clip.player.disconnect();
              clip.player.connect(masterGain);
            }
          });
        }
      });
    }
    
    // Trigger reactivity
    tracks = tracks.slice();
  }

  function addAudioToTrack() {
    const clipData = { id: 0, name: 'Audio 1', src: '/rec.m4a', player: null, element: null };
    tracks[0].addAudioClip(clipData);
    playlist.load([
      {
        src: "/rec.m4a",
        name: "Audio 1",
        gain: 0.5,
      },
    ]).then(() => {
      // Audio added successfully
      if(masterGain) {
        tracks[0].clips.forEach(clip => {
          if(clip.player) {
            clip.player.disconnect();
            clip.player.connect(masterGain);
          }
        });
      }
    });
  }

  function updateTimelineMarker(currentTime: number) {
    const marker = document.querySelector('.timeline-marker') as HTMLElement;
    if (marker) {
      marker.style.left = `${currentTime * pixelsPerSecond}px`;
    }
  }

  function setMainVolume(event: Event) {
    const volume = (event.target as HTMLInputElement).valueAsNumber;
    console.log('Volume slider changed to:', volume);
    const dB = (volume / 100) * 60 - 60;
    console.log('Setting masterGain to:', Tone.dbToGain(dB));
    if(masterGain) {
      masterGain.gain.rampTo(Tone.dbToGain(dB), 0.1);
    }
    
    // Also update each clip's player's volume if available
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.player && clip.player.volume) {
          console.log(`Setting clip volume for clip with id ${clip.id || 'unknown'} to:`, dB, 'dB');
          clip.player.volume.rampTo(dB, 0.1);
        }
      });
    });

    // Also update WaveformPlaylist's tracks gain if available
    if (playlist && playlist.tracks) {
      console.log('Updating playlist track gains');
      playlist.tracks.forEach((t: any) => {
        if (t.gain && t.gain.gain) {
          const linearGain = Tone.dbToGain(dB);
          console.log('Setting playlist track gain to:', linearGain);
          t.gain.gain.rampTo(linearGain, 0.1);
        }
      });
    } else {
      console.log('No playlist.tracks available to update volume');
    }
  }

  async function handleFileSelected(event: CustomEvent) {
    const file = event.detail.file;
    if (file) {
      // Pass the selected file directly to addTrack to create a new track with the file loaded
      addTrack(file);
      
      // Optionally mark the newly added track as active and close the dialog
      activeTrackId = tracks[tracks.length - 1].id;
      showAddTrackDialog = false;
      
      // Allow Svelte to update the reactive values
      await tick();
    }
  }

  function handleGenerateSample() {
    // This will be implemented later with AI functionality
    console.log("Generate sample clicked - to be implemented");
  }
</script>

<main class="app">
  <AddTrackDialog 
    show={showAddTrackDialog} 
    on:fileSelected={handleFileSelected}
    on:generateSample={handleGenerateSample}
    on:close={() => showAddTrackDialog = false}
  />
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
        <input type="range" min="0" max="100" value="100" oninput={setMainVolume} />
      </div>
    </div>

    <div class="project-controls">
      <button class="project-btn">Export</button>
      <button class="project-btn">Save</button>
    </div>
  </div>

  <div class="controls">
    <div class="left-controls">
      <div class="control-buttons">
        <button class="add-btn">
          <img src="/aiLogo.svg" alt="Add" />
          <span>Generate Beat</span>
        </button>
        <button class="add-track-btn" onclick={() => showAddTrackDialog = true}>
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
          
        </div>
      </div>
    </div>

    <div class="tracks-container">
      <div class="timeline">
        <div class="timeline-ruler">
          {#each Array(Math.ceil(80)) as _, i}
            <div class="timeline-mark" style="left: {i * pixelsPerSecond}px">
              <span class="timeline-label">{i}s</span>
            </div>
          {/each}
        </div>
        <div class="timeline-marker"></div>
      </div>
      <div id="playlist"></div>
      <div class="tracks-content">
        {#each tracks as track (track.id)}
          <div class="track" id={"track-" + track.id} use:draggable={trackDragOptions} on:click={() => activeTrackId = track.id} class:selected={activeTrackId === track.id}>
            <div class="track-timeline" data-track-id={track.id}>
              {#each track.clips as clip (clip.id)}
                <div class="clip-wrapper" id={clip.id}>
                  <AudioClip {clip} draggableOptions={options} />
                </div>
              {/each}
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

  .timeline {
    position: relative;
    height: 30px;
    background-color: #111111;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .timeline-ruler {
    position: relative;
    height: 100%;
    padding-top: 15px;
  }

  .timeline-mark {
    position: absolute;
    width: 1px;
    height: 8px;
    background-color: rgba(255, 255, 255, 0.3);
  }

  .timeline-label {
    position: absolute;
    top: -15px;
    left: 2px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
  }

  .timeline-marker {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    background-color: #ff0000;
    pointer-events: none;
    z-index: 1000;
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
    overflow: hidden;
  }

  


  .tracks-content {
    background-color: #0a0a0a;
    overflow-y: auto;
    height: 100%;
    width: 100%;
  }

  .track {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .track-timeline {
    background-color: #1e1d1f;
    position: relative;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    min-height: 100px;
    height: 100px;
    position: relative;
    display: block;
    overflow: visible;
  }

  .track-name {
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    background-color: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 3px;
    z-index: 1;
  }

  .track-content {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
  }

  .audio-clip {
    background-color: #4a9eff;
    padding: 0.25rem;
    height: 80%;
    position: absolute;
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

  .controls {
    background-color: #111111;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    height: 48px;
    display: flex;
    flex-direction: row;
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
    background-color: #111111;
    position: relative;
    padding: 0 1rem;
    height: 30px;
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

  .sidebar-section {
    grid-template-rows: 1fr;
  }

  .tracks-container {
    grid-template-rows: 1fr;
  }

  .audio-clip {
    background-color: #4a9eff;
    padding: 0.25rem;
    height: 100%;
    display: flex;
    justify-content: center;
  }

  #playlist {
    width: 100%;
    height: 100%;
  }

  :global(#playlist .playlist-time-scale) {
    background-color: #1a1a1a !important;
    color: white !important;
  }

  :global(#playlist .channel) {
    background-color: #1e1e1e !important;
  }

  :global(#playlist .playlist-tracks) {
    background-color: #141414 !important;
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

  #playlist {
    height: calc(100% - 30px);
  }

  .clip-wrapper {
    position: absolute;
    height: 80px;
    top: 10px;
    pointer-events: all;
  }

  .track.selected {
    outline: 2px solid #4a9eff;
  }
</style>
