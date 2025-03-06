import { VideoPlayer } from './VideoPlayer.js';

class PlayPage {
  constructor() {
    this.videoPlayer = new VideoPlayer();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new PlayPage();
});