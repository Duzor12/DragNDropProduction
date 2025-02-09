<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import WaveSurfer from 'wavesurfer.js';
  import { fade } from 'svelte/transition';

  export let show = false;

  const dispatch = createEventDispatcher();
  let isRecording = false;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let recordedAudio: Blob | null = null;
  let wavesurfer: WaveSurfer | null = null;
  let waveformContainer: HTMLDivElement;
  let visualizerCanvas: HTMLCanvasElement;
  let recordingTime = 0;
  let recordingInterval: number;
  let audioContext: AudioContext;
  let analyser: AnalyserNode;
  let dataArray: Uint8Array;
  let animationFrame: number;

  onMount(() => {
    if (waveformContainer) {
      wavesurfer = WaveSurfer.create({
        container: waveformContainer,
        waveColor: '#4a9eff',
        progressColor: '#2176ff',
        cursorColor: '#ffffff',
        barWidth: 2,
        barGap: 1,
        height: 100,
        normalize: true,
        backend: 'MediaElement'
      });
    }

    return () => {
      wavesurfer?.destroy();
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  });

  function drawWaveform() {
    if (!analyser || !visualizerCanvas) return;
    
    analyser.getByteTimeDomainData(dataArray);
    const canvasCtx = visualizerCanvas.getContext('2d');
    if (!canvasCtx) return;

    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    
    canvasCtx.fillStyle = '#1a1a1a';
    canvasCtx.fillRect(0, 0, width, height);
    
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#4a9eff';
    canvasCtx.beginPath();
    
    const sliceWidth = width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height / 2);
      
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();
    
    animationFrame = requestAnimationFrame(drawWaveform);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      isRecording = true;
      recordingTime = 0;

      // Set up audio analysis
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Hide WaveSurfer and show canvas during recording
      if (waveformContainer) {
        waveformContainer.style.display = 'none';
      }
      if (visualizerCanvas) {
        visualizerCanvas.style.display = 'block';
        // Set canvas size
        visualizerCanvas.width = visualizerCanvas.offsetWidth;
        visualizerCanvas.height = visualizerCanvas.offsetHeight;
      }
      
      drawWaveform();

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        recordedAudio = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(recordedAudio);
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        // Show WaveSurfer and hide canvas after recording
        if (waveformContainer) {
          waveformContainer.style.display = 'block';
        }
        if (visualizerCanvas) {
          visualizerCanvas.style.display = 'none';
        }
        wavesurfer?.load(audioUrl);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      recordingInterval = setInterval(() => {
        recordingTime++;
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      isRecording = false;
      clearInterval(recordingInterval);
      if (audioContext) {
        audioContext.close();
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function handleSave() {
    if (recordedAudio) {
      dispatch('recordingComplete', { recording: recordedAudio });
      handleClose();
    }
  }

  function handleClose() {
    if (isRecording) {
      stopRecording();
    }
    show = false;
    dispatch('close');
  }
</script>

{#if show}
  <div class="dialog-overlay" transition:fade>
    <div class="dialog-content" transition:fade>
      <div class="dialog-header">
        <h2>Record Audio</h2>
        <button class="close-btn" on:click={handleClose}>×</button>
      </div>

      <div class="dialog-body">
        <div class="waveform-container" bind:this={waveformContainer}></div>
        <canvas 
          class="visualizer-canvas" 
          bind:this={visualizerCanvas}
        ></canvas>
        
        <div class="recording-controls">
          <div class="recording-time">
            {formatTime(recordingTime)}
          </div>
          
          {#if !isRecording && !recordedAudio}
            <button class="record-btn" on:click={startRecording}>
              Start Recording
            </button>
          {:else if isRecording}
            <button class="stop-btn" on:click={stopRecording}>
              Stop Recording
            </button>
          {:else}
            <div class="playback-controls">
              <button class="save-btn" on:click={handleSave}>
                Save Recording
              </button>
              <button class="record-btn" on:click={startRecording}>
                Record Again
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.75);
    display: grid;
    place-items: center;
    z-index: 1000;
  }

  .dialog-content {
    background-color: #1a1a1a;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .dialog-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dialog-header h2 {
    color: #ffffff;
    font-size: 1.25rem;
    font-weight: 500;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #ffffff;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .close-btn:hover {
    opacity: 1;
  }

  .dialog-body {
    padding: 1.5rem;
  }

  .waveform-container {
    background-color: #1a1a1a;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    height: 120px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .visualizer-canvas {
    display: none;
    background-color: #1a1a1a;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    height: 120px;
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .recording-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .recording-time {
    font-size: 2rem;
    font-weight: 500;
    color: #ffffff;
    font-family: 'JetBrains Mono', monospace;
  }

  .record-btn,
  .stop-btn,
  .save-btn {
    padding: 0.75rem 2rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 160px;
  }

  .record-btn {
    background-color: #2176ff;
    color: white;
    border: none;
  }

  .record-btn:hover {
    background-color: #4a9eff;
    transform: translateY(-1px);
  }

  .stop-btn {
    background-color: #ff4444;
    color: white;
    border: none;
  }

  .stop-btn:hover {
    background-color: #ff6666;
    transform: translateY(-1px);
  }

  .save-btn {
    background-color: #00c853;
    color: white;
    border: none;
  }

  .save-btn:hover {
    background-color: #00e676;
    transform: translateY(-1px);
  }

  .playback-controls {
    display: flex;
    gap: 1rem;
  }

  button:active {
    transform: scale(0.98);
  }
</style> 