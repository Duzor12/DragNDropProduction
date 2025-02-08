import * as Tone from 'tone';
import type { AudioClip } from './AudioClip';

export class Track {
    id: number;
    name: string;
    channel: Tone.Channel;  // Tone.js channel for volume/mute/pan
    audioClips: AudioClip[];

    constructor(id: number, name: string) {
      this.id = id;
      this.name = name;
      this.channel = new Tone.Channel().toDestination();
      this.audioClips = [];
    }
  

    setVolume(value: number) {
      this.channel.volume.value = Tone.gainToDb(value); // Convert gain to decibels
    }
  
    toggleMute() {
      this.channel.mute = !this.channel.mute;
    }
  
    // Clean up when removing track
    dispose() {
      this.channel.dispose();
    }

    addAudioClip(audioClip: AudioClip) {
      this.audioClips.push(audioClip);
      audioClip.setCurrentTrack(this);
    }

    removeAudioClip(audioClip: AudioClip) { 
      this.audioClips = this.audioClips.filter(clip => clip !== audioClip);
      audioClip.setCurrentTrack(null as unknown as Track);  
    }

    getAudioClips(): AudioClip[] {
      return this.audioClips;
    }
  }