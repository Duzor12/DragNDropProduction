<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  export let show = false;

  const dispatch = createEventDispatcher();
  let isLoading = false;
  let selectedGenre = 'hip-hop';
  let tempo = 120;
  let requirements = '';

  const genres = [
    'hip-hop',
    'pop',
    'rock',
    'electronic',
    'jazz',
    'r&b',
    'trap',
    'lofi'
  ];

  async function handleSubmit() {
    isLoading = true;
    try {
      const response = await fetch('/api/generate-beat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          genre: selectedGenre,
          tempo,
          requirements
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate beat');
      }

      const audioBlob = await response.blob();
      dispatch('beatGenerated', { audioBlob });
      close();
    } catch (error) {
      console.error('Error generating beat:', error);
      alert('Failed to generate beat. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  function close() {
    dispatch('close');
  }
</script>

{#if show}
  <div class="dialog-overlay" transition:fade={{ duration: 200 }} on:click={close}>
    <div class="dialog" on:click|stopPropagation>
      <div class="dialog-header">
        <h2>Generate Beat</h2>
        <button class="close-btn" on:click={close}>×</button>
      </div>

      <div class="dialog-content">
        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
            <label for="genre">Genre</label>
            <select id="genre" bind:value={selectedGenre}>
              {#each genres as genre}
                <option value={genre}>{genre}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="tempo">Tempo (BPM)</label>
            <input 
              type="number" 
              id="tempo" 
              bind:value={tempo} 
              min="60" 
              max="200" 
              step="1"
            />
          </div>

          <div class="form-group">
            <label for="requirements">Specific Requirements</label>
            <textarea 
              id="requirements" 
              bind:value={requirements} 
              placeholder="Enter any specific requirements for your beat..."
              rows="3"
            ></textarea>
          </div>

          <div class="dialog-footer">
            <button type="button" class="cancel-btn" on:click={close}>Cancel</button>
            <button type="submit" class="generate-btn" disabled={isLoading}>
              {#if isLoading}
                <div class="loader"></div>
                Generating...
              {:else}
                Generate Beat
              {/if}
            </button>
          </div>
        </form>
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
    background: rgba(0, 0, 0, 0.75);
    display: grid;
    place-items: center;
    z-index: 1000;
  }

  .dialog {
    background: #1a1a1a;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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
    margin: 0;
    font-size: 1.25rem;
    color: #ffffff;
  }

  .close-btn {
    background: none;
    border: none;
    color: #ffffff;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .close-btn:hover {
    opacity: 1;
  }

  .dialog-content {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #ffffff;
    font-size: 0.875rem;
  }

  select,
  input,
  textarea {
    width: 100%;
    padding: 0.75rem;
    background: #222;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  select:focus,
  input:focus,
  textarea:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
  }

  .dialog-footer {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }

  button {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .generate-btn {
    background: #4a9eff;
    border: none;
    color: #ffffff;
  }

  .generate-btn:hover:not(:disabled) {
    background: #3b8be6;
    transform: translateY(-1px);
  }

  .generate-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .loader {
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style> 