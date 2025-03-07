import { handleNumberInput, showNumberInput, hideNumberInput } from './channelInput.js';
import { 
  navIndex, 
  isInNav, 
  isInDropdown, 
  languageIndex, 
  selectedIndex, 
  updateSelectedCard, 
  updateSelectedNavItem, 
  updateSelectedLanguage, 
  handleNavigation
} from './js/navigation.js';

let menuIndex = 0;
let menuHideTimeout = null;

async function fetchPlaylist() {
  try {
    const response = await fetch('./data/channels.m3u');
    const data = await response.text();
    return parseM3U(data);
  } catch (error) {
    console.error('Error loading playlist:', error);
    return [];
  }
}

function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const titleMatch = line.match(/,(.+)$/);
      const categoryMatch = line.match(/Category="([^"]*)"/);
      const languageMatch = line.match(/Language="([^"]*)"/);
      const channelNoMatch = line.match(/c-no="([^"]*)"/);
      
      if (titleMatch) {
        currentChannel = {
          title: titleMatch[1].trim(),
          logo: logoMatch ? logoMatch[1] : '',
          category: categoryMatch ? categoryMatch[1] : 'Uncategorized',
          language: languageMatch ? languageMatch[1] : 'Unknown',
          channelNo: channelNoMatch ? parseInt(channelNoMatch[1]) : null,
          url: ''
        };
      }
    } else if (line && !line.startsWith('#') && currentChannel) {
      currentChannel.url = line;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }

  return channels;
}

let channels = [];
let filteredChannels = [];
let selectedLanguage = '';
let videoPlayer = null;
let currentVideoChannel = null;

function getLanguageGridDimensions() {
  const languages = new Set(channels.map(channel => channel.language));
  const totalItems = languages.size + 1; // +1 for "All Languages"
  const columns = Math.min(4, totalItems);
  const rows = Math.ceil(totalItems / columns);
  return { columns, rows, totalItems };
}

function updateLanguageList() {
  const languages = new Set(channels.map(channel => channel.language));
  const languageList = document.querySelector('.language-list');
  if (!languageList) return;

  const sortedLanguages = Array.from(languages).sort();
  
  languageList.innerHTML = `
    <div class="language-item ${!selectedLanguage ? 'selected' : ''}" data-language="" tabindex="0">
      <span>All Languages</span>
      <span class="material-icons">check</span>
    </div>
    ${sortedLanguages.map(lang => `
      <div class="language-item ${selectedLanguage === lang ? 'selected' : ''}" data-language="${lang}" tabindex="0">
        <span>${lang}</span>
        <span class="material-icons">check</span>
      </div>
    `).join('')}
  `;
}

function filterChannels(language) {
  selectedLanguage = language || selectedLanguage;
  
  if (!selectedLanguage) {
    filteredChannels = channels;
  } else {
    filteredChannels = channels.filter(channel => channel.language === selectedLanguage);
  }
  updateChannelGrid();
}

function updateChannelGrid() {
  const channelList = document.getElementById('channelList');
  if (!channelList) return;

  channelList.innerHTML = '';
  
  // Add Aatral TV card first
  const aatralCard = document.createElement('div');
  aatralCard.className = 'channel-card';
  aatralCard.setAttribute('tabindex', '0');
  aatralCard.innerHTML = `
    <a href="aatral-tv/aatral-tv.html" style="text-decoration: none; color: inherit; display: block; height: 100%;">
      <div class="channel-logo-container">
        <img src="aatral-tv/data/aatral.png" alt="Aatral TV" class="channel-logo">
      </div>
      <div class="channel-info">
        <h3>Aatral TV</h3>
        <div class="channel-meta">
          <span class="channel-category">Entrt.</span>
          <span class="channel-language">Tamil</span>
        </div>
      </div>
    </a>
  `;
  channelList.appendChild(aatralCard);
  
  // Add the rest of the channels
  filteredChannels.forEach((channel, index) => {
    channelList.appendChild(createChannelCard(channel, index + 1)); // +1 because Aatral TV is index 0
  });
  
  updateSelectedCard();
}

function createChannelCard(channel, tabIndex) {
  const card = document.createElement('div');
  card.className = 'channel-card';
  card.dataset.channelNo = channel.channelNo;
  card.dataset.index = tabIndex - 1; // Store the index in the filteredChannels array
  card.setAttribute('tabindex', tabIndex.toString());
  
  const content = `
    <div class="channel-logo-container">
      ${channel.logo 
        ? `<img src="${channel.logo}" alt="${channel.title}" class="channel-logo">`
        : `<div class="channel-logo-placeholder">${channel.title[0]}</div>`
      }
    </div>
    <div class="channel-info">
      <h3>${channel.channelNo ? `${channel.channelNo} - ` : ''}${channel.title}</h3>
      <div class="channel-meta">
        <span class="channel-category">${channel.category}</span>
        <span class="channel-language">${channel.language}</span>
      </div>
    </div>`;
    
  card.innerHTML = content;
  
  // Add click event to play the channel
  card.addEventListener('click', () => {
    playChannel(channel);
  });
  
  // Add keyboard event for Enter key
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      playChannel(channel);
    }
  });
  
  return card;
}

function playChannel(channel) {
  currentVideoChannel = channel;
  
  // Show the video player overlay
  const videoOverlay = document.getElementById('videoPlayerOverlay');
  if (videoOverlay) {
    videoOverlay.style.display = 'block';
  }
  
  // Get the video player element
  videoPlayer = document.getElementById('videoPlayer');
  if (!videoPlayer) return;
  
  // Check if HLS.js is supported
  if (Hls.isSupported()) {
    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60
    });
    
    hls.loadSource(channel.url);
    hls.attachMedia(videoPlayer);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoPlayer.play().catch(e => console.log('Playback failed:', e));
    });
    
    // Store the HLS instance for cleanup
    videoPlayer.hls = hls;
  } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    // For Safari and iOS devices that support HLS natively
    videoPlayer.src = channel.url;
    videoPlayer.addEventListener('loadedmetadata', () => {
      videoPlayer.play().catch(e => console.log('Playback failed:', e));
    });
  } else {
    console.error('HLS is not supported in this browser');
  }
}

function closeVideoPlayer() {
  const videoOverlay = document.getElementById('videoPlayerOverlay');
  if (videoOverlay) {
    videoOverlay.style.display = 'none';
  }
  
  if (videoPlayer) {
    videoPlayer.pause();
    
    // Clean up HLS if it exists
    if (videoPlayer.hls) {
      videoPlayer.hls.destroy();
      videoPlayer.hls = null;
    }
    
    videoPlayer.src = '';
    currentVideoChannel = null;
  }
}

function navigateToChannel(channelIndex) {
  const selectedChannel = filteredChannels[channelIndex];
  if (selectedChannel) {
    playChannel(selectedChannel);
  }
}

function setupVideoOverlayMenu() {
  const menu = document.getElementById('menu');
  
  function updateSelectedMenuItem() {
    document.querySelectorAll('.menu-item').forEach((item, index) => {
      item.classList.toggle('selected', index === menuIndex);
    });
  }

  function resetMenuTimeout() {
    if (menuHideTimeout) {
      clearTimeout(menuHideTimeout);
    }
    menuHideTimeout = setTimeout(() => {
      menu.style.display = 'none';
    }, 3000);
  }

  // Add keyboard event listener for video overlay navigation
  document.addEventListener('keydown', (event) => {
    const videoOverlay = document.getElementById('videoPlayerOverlay');
    
    if (videoOverlay.style.display === 'block') {
      if (menu.style.display === 'flex') {
        switch (event.key) {
          case 'ArrowDown':
            if (menuIndex < 4) {
              menuIndex++;
              updateSelectedMenuItem();
              resetMenuTimeout();
            }
            break;
          case 'ArrowUp':
            if (menuIndex > 0) {
              menuIndex--;
              updateSelectedMenuItem();
              resetMenuTimeout();
            }
            break;
          case 'ArrowLeft':
            menu.style.display = 'none';
            break;
          case 'Enter':
            const selectedItem = document.querySelectorAll('.menu-item')[menuIndex];
            const action = selectedItem.getAttribute('data-action');
            switch(action) {
              case 'home':
                window.location.href = 'index.html';
                break;
              case 'about':
                window.location.href = 'about.html';
                break;
              case 'settings':
                window.location.href = 'settings.html';
                break;
              case 'language':
              case 'category':
                window.location.href = 'index.html';
                break;
            }
            break;
        }
      } else if (event.key === 'ArrowRight') {
        menu.style.display = 'flex';
        resetMenuTimeout();
      }
    }
  });
}

function setupVideoPlayerControls() {
  // Add click event to close video when clicking outside the player
  const videoOverlay = document.getElementById('videoPlayerOverlay');
  const menu = document.getElementById('menu');

  if (videoOverlay) {
    videoOverlay.addEventListener('click', (event) => {
      if (event.target === videoOverlay) {
        closeVideoPlayer();
      }
    });
    
    videoOverlay.addEventListener('mousemove', () => {
      if (menu.style.display === 'flex') {
        resetMenuTimeout();
      }
    });
  }
}

function setupKeyboardNavigation() {
  document.addEventListener('keydown', (event) => {
    handleNavigation(
      event, 
      channels, 
      filteredChannels, 
      handleNumberInput, 
      navigateToChannel, 
      closeVideoPlayer, 
      selectedLanguage, 
      filterChannels, 
      updateLanguageList
    );
  });
}

async function initializeChannelList() {
  const channelList = document.getElementById('channelList');
  if (!channelList) return;
  
  channels = await fetchPlaylist();
  filteredChannels = channels;
  
  if (channels.length === 0) {
    channelList.innerHTML = '<p>No channels found</p>';
    return;
  }

  updateLanguageList();
  updateChannelGrid();
  updateSelectedNavItem();
  setupVideoPlayerControls();
  setupKeyboardNavigation();
}

document.addEventListener('DOMContentLoaded', () => {
  const isHomePage = document.querySelector('.home-page') !== null;
  if (isHomePage) {
    initializeChannelList();
    setupVideoOverlayMenu();
  }
});