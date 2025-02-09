import * as Tone from 'tone';
import type { Track } from './Track.svelte';

export class AudioClip {
  id: number;
  name = $state('');
  player: Tone.Player;
  startTime = 0;  // Start time in seconds
  currentTrack = $state<Track | null>(null);
  duration = $state(0);
  



  constructor(id: number, name: string, url: string) {
    this.id = id;
    this.name = name;
    this.startTime = 0;
    this.player = new Tone.Player(url).toDestination();
    this.currentTrack = null;
    this.duration = 0;
    this.loadFile(url);
  }







  // Load an audio file
  async loadFile(url: string) {
    try {
      await this.player.load(url);
      this.duration = this.player.buffer.duration;
      this.name = url.split('/').pop() || this.name; // Use filename as clip name
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  }

  // Connect to a track's channel
  connectToTrack(channel: Tone.Channel) {
    this.player.connect(channel);
  }

  // Play methods
  play() {
    this.player.start();
  }

  stop() {
    this.player.stop();
  }

  // Set start position in seconds
  setStartTime(time: number) {
    this.startTime = time;
  }

  // Get clip duration in seconds
  getDuration(): number {
    return this.player.buffer.duration;
  }

  // Clean up
  dispose() {
    this.player.dispose();
  }

  setCurrentTrack(track: Track) {
    this.currentTrack = track;
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }
}
