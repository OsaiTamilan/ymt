import { parseM3U } from './m3uParser.js';

export class VideoPlayer {
  constructor() {
    this.player = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.checkInterval = null;
    this.loadingSpinner = document.getElementById('loading-spinner');
    this.isPlaying = false;
    this.lastButtonState = false;
    this.init();
    this.setupGamepadControls();
  }
  
  static getCurrentIndianTime() {
    const date = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    
    return {
      hours,
      minutes,
      seconds,
      toString() {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      },
      toSeconds() {
        return (hours * 3600) + (minutes * 60) + seconds;
      }
    };
  }

  static getCurrentIndianDate() {
    const date = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    return `${date.getUTCDate().toString().padStart(2, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCFullYear()}`;
  }

  static timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes, seconds] = timeStr.split(':').map(num => parseInt(num, 10));
    return (hours * 3600) + (minutes * 60) + (seconds || 0);
  }

  calculateVideoStartTime(video) {
    const currentTimeSeconds = VideoPlayer.getCurrentIndianTime().toSeconds();
    const streamingTimeSeconds = VideoPlayer.timeToSeconds(video.streamingTime);
    const startTime = video.startTime || 0;
    
    const calculatedStartTime = currentTimeSeconds - streamingTimeSeconds + startTime;
    
    return Math.min(Math.max(calculatedStartTime, startTime), video.endTime);
  }

  findNearestVideo(playlist) {
    if (!playlist || playlist.length === 0) {
      throw new Error('Empty playlist');
    }

    const currentTime = VideoPlayer.getCurrentIndianTime();
    const currentSeconds = currentTime.toSeconds();
    
    const sortedVideos = [...playlist].sort((a, b) => {
      const timeA = VideoPlayer.timeToSeconds(a.streamingTime);
      const timeB = VideoPlayer.timeToSeconds(b.streamingTime);
      return timeA - timeB;
    });

    let selectedVideo = null;
    for (const video of sortedVideos) {
      const videoSeconds = VideoPlayer.timeToSeconds(video.streamingTime);
      if (videoSeconds <= currentSeconds) {
        selectedVideo = video;
      } else {
        break;
      }
    }

    if (!selectedVideo && sortedVideos.length > 0) {
      selectedVideo = sortedVideos[0];
    }

    const index = this.playlist.findIndex(v => v === selectedVideo);
    
    console.log('Current time:', currentTime.toString());
    console.log('Available videos:', playlist.map(v => `${v.title} at ${v.streamingTime}`));
    console.log('Selected video:', selectedVideo?.title, 'at', selectedVideo?.streamingTime);
    
    return index >= 0 ? index : 0;
  }
  
  async loadPlaylist(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load playlist: ${response.status} ${response.statusText}`);
      }
      const content = await response.text();
      if (!content.trim()) {
        throw new Error('Empty playlist file');
      }
      return parseM3U(content);
    } catch (error) {
      console.error(`Error loading playlist from ${filePath}:`, error.message);
      return null;
    }
  }
  
  async init() {
    try {
      const currentDate = VideoPlayer.getCurrentIndianDate();
      // Try loading the current date's playlist first
      let playlist = await this.loadPlaylist(`data/${currentDate}.m3u`);
      
      // If current date's playlist is not available, try the backup file
      if (!playlist) {
        console.log('Current date playlist not found, trying backup file...');
        playlist = await this.loadPlaylist('data/emergency/backup.m3u');
        
        if (!playlist) {
          throw new Error('Failed to load both current and backup playlists');
        }
      }
      
      this.playlist = playlist;
      
      if (this.playlist.length === 0) {
        throw new Error('No valid entries in playlist');
      }
      
      this.currentIndex = this.findNearestVideo(this.playlist);
      this.loadYouTubeAPI();
    } catch (error) {
      console.error('Error loading playlist:', error.message);
      if (this.loadingSpinner) {
        this.loadingSpinner.innerHTML = `
          <div class="text-white text-center">
            <p class="text-xl mb-2">Could not load playlist</p>
            <p class="text-gray-400">${error.message}</p>
          </div>
        `;
      }
    }
  }
  
  setupGamepadControls() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad);
      this.checkGamepad();
    });
  }

  checkGamepad() {
    const gamepads = navigator.getGamepads();
    let gamepad = null;
    
    for (const gp of gamepads) {
      if (gp) {
        gamepad = gp;
        break;
      }
    }

    if (gamepad) {
      const dpadPressed = gamepad.buttons.slice(12, 16).some(button => button.pressed);
      const mainButtonPressed = gamepad.buttons.slice(0, 4).some(button => button.pressed);
      
      if ((dpadPressed || mainButtonPressed) && !this.lastButtonState) {
        const startButton = document.getElementById('start-playback');
        if (startButton) {
          startButton.click();
        } else if (this.player) {
          this.togglePlayPause();
        }
      }
      this.lastButtonState = dpadPressed || mainButtonPressed;
    }

    requestAnimationFrame(() => this.checkGamepad());
  }

  togglePlayPause() {
    if (this.player) {
      if (this.isPlaying) {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
      }
    }
  }
  
  loadYouTubeAPI() {
    if (!this.playlist.length) return;
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    window.onYouTubeIframeAPIReady = () => this.initializePlayer();
  }
  
  initializePlayer() {
    if (!this.playlist.length) return;
    
    if (this.loadingSpinner) {
      this.loadingSpinner.innerHTML = `
        <div class="spinner"></div>
        <button class="play-button" id="start-playback" autofocus tabindex="0">
          Press Enter to Play ►
        </button>
      `;
      
      const startButton = document.getElementById('start-playback');
      startButton.addEventListener('click', () => {
        this.createPlayer(true);
        this.loadingSpinner.style.display = 'none';
        // Show navigation bar after clicking start
        const mainNav = document.querySelector('.main-nav');
        mainNav.classList.add('visible');
        // Start the auto-hide timer
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        document.dispatchEvent(event);
      });
      
      setTimeout(() => {
        startButton.focus();
      }, 100);
    }
  }

  createPlayer(withSound) {
    const currentVideo = this.playlist[this.currentIndex];
    const startTime = this.calculateVideoStartTime(currentVideo);
    
    this.player = new YT.Player('youtube-player', {
      height: '1090',
      width: '840',
      videoId: currentVideo.videoId,
      playerVars: {
        start: startTime,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        autoplay: 1,
        mute: withSound ? 0 : 1,
        playsinline: 1,
        origin: window.location.origin,
        iv_load_policy: 3,
        fs: 0,
        cc_load_policy: 0,
        autohide: 1
      },
      events: {
        onReady: () => this.onPlayerReady(),
        onStateChange: (event) => this.onPlayerStateChange(event),
        onError: (event) => this.onPlayerError(event)
      },
    });
  }
  
  onPlayerReady() {
    if (this.loadingSpinner) {
      this.loadingSpinner.style.display = 'none';
    }
    this.player.playVideo();
    this.startTimeCheck();
  }
  
  startTimeCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      if (this.player && this.player.getCurrentTime) {
        const currentTime = this.player.getCurrentTime();
        const currentVideo = this.playlist[this.currentIndex];
        
        if (currentTime >= currentVideo.endTime) {
          this.handleVideoEnd();
        }
      }
    }, 500);
  }
  
  handleVideoEnd() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    if (this.currentIndex < this.playlist.length - 1) {
      this.currentIndex++;
      this.loadNextVideo();
    } else {
      this.player.stopVideo();
    }
  }
  
  onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      this.isPlaying = true;
      this.startTimeCheck();
    } else if (event.data === YT.PlayerState.PAUSED) {
      this.isPlaying = false;
    } else if (event.data === YT.PlayerState.ENDED) {
      this.handleVideoEnd();
    }
  }

  onPlayerError(event) {
    console.error('YouTube player error:', event.data);
    if (this.loadingSpinner) {
      this.loadingSpinner.innerHTML = `
        <div class="text-white text-center">
          <p class="text-xl mb-2">Video playback error</p>
          <p class="text-gray-400">Please try again later</p>
        </div>
      `;
      this.loadingSpinner.style.display = 'block';
    }
  }
  
  loadNextVideo() {
    if (this.currentIndex < this.playlist.length) {
      const nextVideo = this.playlist[this.currentIndex];
      const startTime = this.calculateVideoStartTime(nextVideo);
      
      this.player.loadVideoById({
        videoId: nextVideo.videoId,
        startSeconds: startTime,
      });
    }
  }
}