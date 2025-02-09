<script lang="ts">
  import { draggable } from '@neodrag/svelte';
  // Export clip data and draggable options
  export let clip: { id: string | number, name: string };
  export let draggableOptions = {};
</script>

<div class="audio-clip" use:draggable={draggableOptions}>
  <div class="clip-content">
    <span>{clip.name}</span>
  </div>
</div>

<style>
  .audio-clip {
    position: absolute;
    cursor: grab;
    background-color: #4a9eff;
    padding: 5px 10px;
    border-radius: 4px;
    user-select: none;
    min-height: 40px;
    min-width: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: all;
  }

  .clip-content {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .audio-clip:hover {
    background-color: #5babff;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .audio-clip:active {
    cursor: grabbing;
    background-color: #3d8eff;
  }

  span {
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
  }
</style> 