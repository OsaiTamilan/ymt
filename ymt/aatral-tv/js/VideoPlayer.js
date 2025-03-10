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
    this.retryCount = 0;
    this.maxRetries = 3;
    this.fallbackVideoId = 'xd5927hV9Ho'; // Fallback video ID as last resort
    this.currentPlaylistSource = null; // Track which playlist source we're using
    this.isAndroidTV = this.detectAndroidTV();
    this.init();
    this.setupGamepadControls();
  }
  
  detectAndroidTV() {
    const userAgent = navigator.userAgent.toLowerCase();
    return (userAgent.indexOf('android tv') > -1 || 
            userAgent.indexOf('smart-tv') > -1 || 
            userAgent.indexOf('googletv') > -1 ||
            userAgent.indexOf('androidtv') > -1 ||
            (userAgent.indexOf('android') > -1 && userAgent.indexOf('large') > -1));
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
      await this.loadPlaylistWithFallbacks();
      
      if (this.playlist.length === 0) {
        throw new Error('No valid entries in playlist');
      }
      
      this.currentIndex = this.findNearestVideo(this.playlist);
      this.loadYouTubeAPI();
    } catch (error) {
      console.error('Error loading playlist:', error.message);
      if (this.loadingSpinner) {
        this.loadingSpinner.innerHTML = `
          <div class="error-container">
            <p class="error-title">Could not load playlist</p>
            <p class="error-message">${error.message}</p>
            <button class="retry-button" id="retry-button">
              Retry
            </button>
          </div>
        `;
        
        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
          retryButton.addEventListener('click', () => this.init());
        }
      }
    }
  }

  async loadPlaylistWithFallbacks() {
    // Try loading the current date's playlist first
    const currentDate = VideoPlayer.getCurrentIndianDate();
    let playlist = await this.loadPlaylist(`data/${currentDate}.m3u`);
    
    if (playlist && playlist.length > 0) {
      console.log(`Successfully loaded playlist for ${currentDate}`);
      this.playlist = playlist;
      this.currentPlaylistSource = `data/${currentDate}.m3u`;
      return;
    }
    
    // If current date's playlist is not available or empty, try the backup file
    console.log('Current date playlist not found or empty, trying backup file...');
    playlist = await this.loadPlaylist('data/emergency/backup.m3u');
    
    if (playlist && playlist.length > 0) {
      console.log('Successfully loaded backup playlist');
      this.playlist = playlist;
      this.currentPlaylistSource = 'data/emergency/backup.m3u';
      return;
    }
    
    // If both failed, create a fallback playlist with just the fallback video
    console.log('All playlist sources failed, using fallback video');
    this.playlist = [{
      title: 'Fallback Video',
      url: `https://www.youtube.com/watch?v=${this.fallbackVideoId}`,
      startTime: 0,
      endTime: 3600, // 1 hour
      totalTime: 30,
      streamingTime: '00:00:00',
      videoId: this.fallbackVideoId
    }];
    this.currentPlaylistSource = 'fallback';
  }
  
  setupGamepadControls() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad);
      this.checkGamepad();
    });
    
    // Add keyboard event listener for D-pad emulation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleEnterKey();
      }
    });
  }

  handleEnterKey() {
    // If the player is not playing, try to find and click the YouTube play button
    if (this.player && !this.isPlaying) {
      this.focusAndClickYouTubePlayButton();
    }
  }

  focusAndClickYouTubePlayButton() {
    // Try to find the YouTube play button in the iframe
    const iframe = document.querySelector('iframe[src*="youtube.com"]');
    if (!iframe) return;
    
    console.log('Attempting to focus and click YouTube play button');
    
    try {
      // First, make sure the iframe has focus
      iframe.focus();
      
      // Try to find and click the play button using various methods
      
      // Method 1: Send Enter key to the iframe
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      iframe.dispatchEvent(enterEvent);
      
      // Method 2: Try to access the iframe content and find the play button
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const playButton = iframeDoc.querySelector('.ytp-large-play-button');
        if (playButton) {
          playButton.click();
          console.log('Found and clicked YouTube play button');
        }
      } catch (e) {
        console.log('Could not access iframe content due to same-origin policy');
      }
      
      // Method 3: Use postMessage to communicate with the YouTube player
      iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      
      // If the player is available, try to play directly
      if (this.player && typeof this.player.playVideo === 'function') {
        this.player.playVideo();
      }
    } catch (e) {
      console.error('Error focusing/clicking YouTube play button:', e);
    }
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
          // If the player exists but video is not playing, try to focus and click the play button
          if (!this.isPlaying) {
            this.focusAndClickYouTubePlayButton();
          } else {
            this.togglePlayPause();
          }
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
        // If play fails, try to focus and click the YouTube play button
        setTimeout(() => {
          if (!this.isPlaying) {
            this.focusAndClickYouTubePlayButton();
          }
        }, 500);
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
    
    // Automatically create the player without showing the start button
    this.createPlayer(true);
    if (this.loadingSpinner) {
      this.loadingSpinner.style.display = 'none';
    }
    
    // Show navigation bar
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) {
      mainNav.classList.add('visible');
    }
  }

  createPlayer(withSound) {
    const currentVideo = this.playlist[this.currentIndex];
    const startTime = this.calculateVideoStartTime(currentVideo);
    
    // Display which playlist source we're using
    console.log(`Playing from source: ${this.currentPlaylistSource || 'unknown'}`);
    console.log(`Video ID: ${currentVideo.videoId}, Title: ${currentVideo.title}`);
    console.log(`Is Android TV: ${this.isAndroidTV}`);
    
    // Create a container for the player if it doesn't exist
    let playerContainer = document.getElementById('youtube-player');
    if (!playerContainer) {
      playerContainer = document.createElement('div');
      playerContainer.id = 'youtube-player';
      document.getElementById('player-container').appendChild(playerContainer);
    }
    
    // Special configuration for Android TV
    const playerVars = {
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
    };
    
    // For Android TV, we need to modify some parameters
    if (this.isAndroidTV) {
      playerVars.autoplay = 1;
      playerVars.mute = 0;
      playerVars.playsinline = 0;
      playerVars.controls = 1; // Enable controls for Android TV
    }
    
    this.player = new YT.Player('youtube-player', {
      height: '1090',
      width: '840',
      videoId: currentVideo.videoId,
      playerVars: playerVars,
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
    
    // For Android TV, we need to explicitly call playVideo
    if (this.isAndroidTV) {
      // Add a slight delay for Android TV
      setTimeout(() => {
        this.player.playVideo();
        // Try to make the player fullscreen on Android TV
        try {
          const iframe = document.querySelector('iframe');
          if (iframe && iframe.requestFullscreen) {
            iframe.requestFullscreen();
          }
        } catch (e) {
          console.log('Fullscreen request failed:', e);
        }
      }, 1000);
    } else {
      this.player.playVideo();
    }
    
    this.startTimeCheck();
    this.retryCount = 0; // Reset retry count on successful load
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
      
      // Hide loading spinner when video starts playing
      if (this.loadingSpinner) {
        this.loadingSpinner.style.display = 'none';
      }
      
      console.log('Video is now playing');
    } else if (event.data === YT.PlayerState.PAUSED) {
      this.isPlaying = false;
      console.log('Video is paused');
    } else if (event.data === YT.PlayerState.ENDED) {
      this.handleVideoEnd();
      console.log('Video ended');
    } else if (event.data === YT.PlayerState.BUFFERING) {
      // Show loading spinner during buffering
      if (this.loadingSpinner) {
        this.loadingSpinner.innerHTML = `<div class="spinner"></div>`;
        this.loadingSpinner.style.display = 'block';
      }
      console.log('Video is buffering');
    } else if (event.data === YT.PlayerState.CUED) {
      // Hide loading spinner when video is cued
      if (this.loadingSpinner) {
        this.loadingSpinner.style.display = 'none';
      }
      console.log('Video is cued');
      
      // If video is cued but not playing, try to focus and click the play button
      setTimeout(() => {
        if (!this.isPlaying) {
          this.focusAndClickYouTubePlayButton();
        }
      }, 1000);
    } else {
      console.log('Player state changed:', event.data);
    }
  }

  onPlayerError(event) {
    console.error('YouTube player error:', event.data);
    
    // Error codes: https://developers.google.com/youtube/iframe_api_reference#onError
    let errorMessage = 'Video playback error';
    
    switch(event.data) {
      case 2:
        errorMessage = 'Invalid video ID';
        break;
      case 5:
        errorMessage = 'HTML5 player error';
        break;
      case 100:
        errorMessage = 'Video not found or removed';
        break;
      case 101:
      case 150:
        errorMessage = 'Video playback not allowed';
        break;
    }
    
    console.log(`Error details: ${errorMessage} (code: ${event.data})`);
    
    // If we're already using the fallback video and it fails, show error
    if (this.currentPlaylistSource === 'fallback' && this.playlist[this.currentIndex].videoId === this.fallbackVideoId) {
      if (this.loadingSpinner) {
        this.loadingSpinner.innerHTML = `
          <div class="error-container">
            <p class="error-title">Playback Error</p>
            <p class="error-message">Even the fallback video failed to play. Please check your internet connection.</p>
            <button class="retry-button" id="retry-button">
              Retry
            </button>
          </div>
        `;
        this.loadingSpinner.style.display = 'block';
        
        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
          retryButton.addEventListener('click', () => {
            this.retryCount = 0;
            this.init();
          });
        }
      }
      return;
    }
    
    // Try next video in current playlist
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Retrying playback (${this.retryCount}/${this.maxRetries})...`);
      
      if (this.loadingSpinner) {
        this.loadingSpinner.innerHTML = `
          <div class="spinner"></div>
          <div class="text-white text-center">
            <p class="text-xl mb-2">Retrying playback...</p>
            <p class="text-gray-400">${this.retryCount}/${this.maxRetries}</p>
          </div>
        `;
        this.loadingSpinner.style.display = 'block';
      }
      
      // Try to load the next video in the playlist
      if (this.currentIndex < this.playlist.length - 1) {
        this.currentIndex++;
        setTimeout(() => this.loadNextVideo(), 2000);
      } else if (this.currentPlaylistSource !== 'fallback') {
        // If we've exhausted the current playlist, try the fallback
        setTimeout(() => this.tryFallbackVideo(), 2000);
      }
    } else {
      // If we've tried multiple videos in the current playlist and they all failed,
      // try switching to the backup playlist or fallback video
      if (this.currentPlaylistSource === `data/${VideoPlayer.getCurrentIndianDate()}.m3u`) {
        // If we're using the current date playlist, try the backup
        this.loadBackupPlaylist();
      } else if (this.currentPlaylistSource === 'data/emergency/backup.m3u8') {
        // If we're using the backup playlist, try the fallback video
        this.tryFallbackVideo();
      } else {
        // We've tried everything, show error
        if (this.loadingSpinner) {
          this.loadingSpinner.innerHTML = `
            <div class="error-container">
              <p class="error-title">${errorMessage}</p>
              <p class="error-message">All playback attempts failed. Please try again later.</p>
              <button class="retry-button" id="retry-button">
                Retry
              </button>
            </div>
          `;
          this.loadingSpinner.style.display = 'block';
          
          const retryButton = document.getElementById('retry-button');
          if (retryButton) {
            retryButton.addEventListener('click', () => {
              this.retryCount = 0;
              this.init();
            });
          }
        }
      }
    }
  }
  
  async loadBackupPlaylist() {
    console.log('Switching to backup playlist...');
    if (this.loadingSpinner) {
      this.loadingSpinner.innerHTML = `
        <div class="spinner"></div>
        <div class="text-white text-center">
          <p class="text-xl mb-2">Switching to backup playlist...</p>
        </div>
      `;
      this.loadingSpinner.style.display = 'block';
    }
    
    const playlist = await this.loadPlaylist('data/emergency/backup.m3u8');
    if (playlist && playlist.length > 0) {
      this.playlist = playlist;
      this.currentPlaylistSource = 'data/emergency/backup.m3u8';
      this.currentIndex = 0;
      this.retryCount = 0;
      
      // Recreate the player with the new playlist
      if (this.player) {
        this.player.destroy();
        this.player = null;
      }
      
      setTimeout(() => this.createPlayer(true), 1000);
    } else {
      // Backup playlist failed, try fallback video
      this.tryFallbackVideo();
    }
  }
  
  tryFallbackVideo() {
    console.log('Switching to fallback video...');
    if (this.loadingSpinner) {
      this.loadingSpinner.innerHTML = `
        <div class="spinner"></div>
        <div class="text-white text-center">
          <p class="text-xl mb-2">Switching to fallback video...</p>
        </div>
      `;
      this.loadingSpinner.style.display = 'block';
    }
    
    // Create a fallback playlist with just the fallback video
    this.playlist = [{
      title: 'Fallback Video',
      url: `https://www.youtube.com/watch?v=${this.fallbackVideoId}`,
      startTime: 0,
      endTime: 3600, // 1 hour
      totalTime: 30,
      streamingTime: '00:00:00',
      videoId: this.fallbackVideoId
    }];
    this.currentPlaylistSource = 'fallback';
    this.currentIndex = 0;
    this.retryCount = 0;
    
    // Recreate the player with the fallback video
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    setTimeout(() => this.createPlayer(true), 1000);
  }
  
  loadNextVideo() {
    if (this.currentIndex < this.playlist.length) {
      const nextVideo = this.playlist[this.currentIndex];
      const startTime = this.calculateVideoStartTime(nextVideo);
      
      console.log(`Loading next video: ${nextVideo.title} (ID: ${nextVideo.videoId})`);
      
      this.player.loadVideoById({
        videoId: nextVideo.videoId,
        startSeconds: startTime,
      });
    }
  }
}
