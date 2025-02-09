<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let show = false;
  const dispatch = createEventDispatcher();

  function handleUpload() {
    // Create a hidden file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        dispatch('fileSelected', { file });
        dispatch('close');
      }
    };
    
    input.click();
  }

  function handleGenerateSample() {
    dispatch('generateSample');
    dispatch('close');
  }

  function handleCancel() {
    dispatch('close');
  }
</script>

{#if show}
  <div class="dialog-overlay" on:click|self={handleCancel}>
    <div class="dialog">
      <div class="dialog-option" on:click={handleUpload}>
        <div class="icon">
          <img src="/device-icon.svg" alt="Upload" />
        </div>
        <span>Upload From Device</span>
      </div>
      
      <div class="dialog-option" on:click={handleGenerateSample}>
        <div class="icon">
          <img src="/aiLogo.svg" alt="AI Generate" />
        </div>
        <span>Generate Copyright-Free Sample</span>
      </div>
      
      <div class="dialog-option cancel" on:click={handleCancel}>
        <span>Cancel</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: grid;
    place-items: center;
    z-index: 1000;
  }

  .dialog {
    background: #111111;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 1rem;
    width: 300px;
    display: grid;
    gap: 0.75rem;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }

  .dialog-option {
    background: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 1rem;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .dialog-option:hover {
    background: #222;
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .dialog-option:active {
    transform: scale(0.98);
  }

  .icon {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
  }

  .icon img {
    width: 20px;
    height: 20px;
    opacity: 0.9;
  }

  span {
    color: #e1e1e1;
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .cancel {
    background: #1a1a1a;
    display: grid;
    grid-template-columns: 1fr;
    text-align: center;
  }

  .cancel span {
    color: #ff4444;
  }
</style> 