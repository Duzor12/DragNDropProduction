import * as Tone from 'tone';
import type { AudioClip } from './AudioClip';

export class Track {
    id: number;
    name: string;
    volume: number;
    muted: boolean;
    clips: AudioClip[];
    channel: Tone.Channel;

    constructor(id: number, name: string) {
      this.id = id;
      this.name = name;
      this.volume = 1;
      this.muted = false;
      this.clips = [];
      
      // Create a Tone.js channel for this track
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
      this.clips.push(audioClip);
      audioClip.setCurrentTrack(this);
    }

    removeAudioClip(audioClip: AudioClip) { 
      this.clips = this.clips.filter(clip => clip !== audioClip);
      audioClip.setCurrentTrack(null as unknown as Track);  
    }

    getAudioClips(): AudioClip[] {
      return this.clips;
    }
  }