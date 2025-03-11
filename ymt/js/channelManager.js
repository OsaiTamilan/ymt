import { handleNavigation } from './navigation.js';

let channels = [];
let myChannels = [];
let filteredChannels = [];
let selectedLanguage = '';
let videoPlayer = null;
let currentVideoChannel = null;

async function fetchPlaylist(url) {
  try {
    const response = await fetch(url);
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

function createChannelCard(channel, tabIndex) {
  const card = document.createElement('div');
  card.className = 'channel-card';
  card.dataset.channelNo = channel.channelNo;
  card.dataset.index = tabIndex;
  card.setAttribute('tabindex', tabIndex.toString());
  
  const content = `
    <a href="${channel.url}" class="channel-link">
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
      </div>
    </a>`;
    
  card.innerHTML = content;
  return card;
}

function updateChannelGrid(containerId, channelList) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  
  channelList.forEach((channel, index) => {
    container.appendChild(createChannelCard(channel, index));
  });
}

function playChannel(channel) {
  currentVideoChannel = channel;
  
  const videoOverlay = document.getElementById('videoPlayerOverlay');
  if (videoOverlay) {
    videoOverlay.style.display = 'block';
  }
  
  videoPlayer = document.getElementById('videoPlayer');
  if (!videoPlayer) return;
  
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
    
    videoPlayer.hls = hls;
  } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.src = channel.url;
    videoPlayer.addEventListener('loadedmetadata', () => {
      videoPlayer.play().catch(e => console.log('Playback failed:', e));
    });
  }
}

async function initializeChannels() {
  // Load My Channels
  myChannels = await fetchPlaylist('./data/myChannels.m3u');
  updateChannelGrid('myChannelList', myChannels);

  // Load All Channels
  channels = await fetchPlaylist('./data/channels.m3u');
  filteredChannels = channels;
  updateChannelGrid('channelList', filteredChannels);
}

document.addEventListener('DOMContentLoaded', () => {
  initializeChannels();
  
  // Setup keyboard navigation
  document.addEventListener('keydown', (event) => {
    handleNavigation(event, channels, filteredChannels);
  });
});