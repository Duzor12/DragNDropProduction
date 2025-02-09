import * as Tone from 'tone';
import type { AudioClip } from '$lib/AudioClip.svelte';




export class Track {
    id: number;
    name: string;
    volume: number;
    muted: boolean;
    // Declare clips as a reactive property using $state
    clips = $state([] as AudioClip[]);
    channel: Tone.Channel;

    constructor(id: number, name: string) {
      this.id = id;
      this.name = name;
      this.volume = 1;
      this.muted = false;
      
      // The clips array is already initialized as reactive above
      this.channel = new Tone.Channel({
        volume: 0,
        mute: false
      }).toDestination();
    }
  
    setVolume(value: number) {
      this.volume = value;
      this.channel.volume.value = Tone.gainToDb(value);
    }
  
    toggleMute() {
      this.muted = !this.muted;
      this.channel.mute = this.muted;
    }
  
    // Clean up when removing track
    dispose() {
      this.channel.dispose();
    }

    addAudioClip(audioClip: AudioClip) {
      // Instead of using push, reassign clips (ensuring Svelte notices the change)
      this.clips.push(audioClip);
      audioClip.setCurrentTrack(this);
    }


    removeAudioClip(audioClip: AudioClip) { 
      // Reassign the clips array after filtering out the clip
      this.clips = this.clips.filter(clip => clip !== audioClip);
      audioClip.setCurrentTrack(null as unknown as Track);  
    }

    getAudioClips(): AudioClip[] {
      return this.clips;
    }
} 