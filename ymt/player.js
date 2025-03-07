import { handleNumberInput } from './channelInput.js';

let currentChannelIndex = 0;
let channels = [];
let filteredChannels = [];
let categories = new Set();
let languages = new Set();
let currentSection = 'home';
let currentCategory = '';
let currentLanguage = '';
let activeColumn = 0; // 0: nav, 1: categories, 2: channels
let listsVisible = true;
let isPlayerPage = false;
let autoHideTimeout = null;

// Navigation state
let currentNavIndex = 0;
let currentCategoryIndex = 0;

async function loadChannels() {
  try {
    const response = await fetch('data/channels.m3u');
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
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
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
      
      if (currentChannel.category) categories.add(currentChannel.category);
      if (currentChannel.language) languages.add(currentChannel.language);
      
      currentChannel = null;
    }
  }

  return channels;
}

function updateSelectionStates() {
  // Update navigation selection
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item, index) => {
    item.classList.toggle('selected', activeColumn === 0 && index === currentNavIndex);
  });

  // Update category selection
  const categoryItems = document.querySelectorAll('.category-item');
  categoryItems.forEach((item, index) => {
    item.classList.toggle('selected', activeColumn === 1 && index === currentCategoryIndex);
  });

  // Update channel selection
  const channelItems = document.querySelectorAll('.channel-item');
  channelItems.forEach((item, index) => {
    item.classList.toggle('selected', activeColumn === 2 && index === currentChannelIndex);
  });

  // Update active column styles
  const mainNav = document.querySelector('.main-nav');
  const categoriesList = document.querySelector('.categories-list');
  const channelList = document.querySelector('.channel-list');

  if (mainNav && categoriesList && channelList) {
    mainNav.classList.toggle('active', activeColumn === 0);
    categoriesList.classList.toggle('active', activeColumn === 1);
    channelList.classList.toggle('active', activeColumn === 2);
  }
}

function resetAutoHideTimer() {
  if (!isPlayerPage) return;
  
  clearTimeout(autoHideTimeout);
  autoHideTimeout = setTimeout(() => {
    if (listsVisible) {
      listsVisible = false;
      toggleListsVisibility(false);
    }
  }, 4000);
}

function toggleListsVisibility(show) {
  if (!isPlayerPage) return;
  
  const mainNav = document.querySelector('.main-nav');
  const categoriesList = document.querySelector('.categories-list');
  const channelListSection = document.querySelector('.channel-list-section');
  const videoSection = document.querySelector('.video-section');
  
  if (!mainNav || !categoriesList || !channelListSection || !videoSection) return;
  
  if (show) {
    mainNav.style.width = '8%';
    categoriesList.style.width = '10%';
    channelListSection.style.width = '15%';
    videoSection.style.width = '90%';
    mainNav.style.display = 'flex';
    categoriesList.style.display = 'block';
    channelListSection.style.display = 'block';
    resetAutoHideTimer();
    updateSelectionStates();
  } else {
    mainNav.style.width = '0';
    categoriesList.style.width = '0';
    channelListSection.style.width = '0';
    videoSection.style.width = '100%';
    mainNav.style.display = 'none';
    categoriesList.style.display = 'none';
    channelListSection.style.display = 'none';
    clearTimeout(autoHideTimeout);
  }
  listsVisible = show;
}

function updateCategoriesList() {
  const categoriesList = document.querySelector('.categories-list');
  if (!categoriesList) return;
  
  categoriesList.innerHTML = '';
  
  let items = [];
  if (currentSection === 'category') {
    items = Array.from(categories);
  } else if (currentSection === 'language') {
    items = Array.from(languages);
  }
  
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.dataset.index = index;
    div.textContent = item;
    categoriesList.appendChild(div);
  });

  updateSelectionStates();
}

function updateChannelList() {
  if (!isPlayerPage) return;
  
  const channelList = document.getElementById('channelList');
  if (!channelList) return;
  
  channelList.innerHTML = '';
  
  filteredChannels = channels.filter(channel => {
    if (currentSection === 'category') {
      return channel.category === currentCategory;
    } else if (currentSection === 'language') {
      return channel.language === currentLanguage;
    }
    return true;
  });
  
  filteredChannels.forEach((channel, index) => {
    channelList.appendChild(createChannelElement(channel, index));
  });

  currentChannelIndex = 0;
  if (filteredChannels.length > 0) {
    loadChannel(0);
  }

  updateSelectionStates();
}

function createChannelElement(channel, index) {
  const element = document.createElement('div');
  element.className = 'channel-item';
  element.dataset.index = index;
  element.dataset.channelNo = channel.channelNo;
  
  element.innerHTML = `
    <div class="channel-info">
      ${channel.logo ? `<img src="${channel.logo}" alt="" class="channel-item-logo">` : ''}
      <h3>${channel.channelNo ? `${channel.channelNo} - ` : ''}${channel.title}</h3>
    </div>
  `;
  
  return element;
}

function loadChannel(index) {
  if (!isPlayerPage) return;
  
  const channelsToUse = filteredChannels.length > 0 ? filteredChannels : channels;
  const channel = channelsToUse[index];
  
  if (!channel) return;
  
  currentChannelIndex = index;
  
  const video = document.getElementById('videoPlayer');
  if (!video) return;

  if (Hls.isSupported()) {
    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60
    });
    
    hls.loadSource(channel.url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(e => console.log('Playback failed:', e));
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = channel.url;
    video.addEventListener('loadedmetadata', () => {
      video.play().catch(e => console.log('Playback failed:', e));
    });
  }
  
  updateSelectionStates();
  
  if (!listsVisible) {
    toggleListsVisibility(false);
  }
}

function handleNavigation(event) {
  if (!isPlayerPage) return;

  // Reset auto-hide timer on any navigation
  if (listsVisible) {
    resetAutoHideTimer();
  }

  // Handle number keys (0-9)
  if (event.key >= '0' && event.key <= '9') {
    handleNumberInput(event.key, channels, (channelIndex) => {
      if (channelIndex >= 0 && channelIndex < channels.length) {
        currentChannelIndex = channelIndex;
        loadChannel(currentChannelIndex);
      }
    });
    return;
  }

  // If lists are hidden, only respond to right arrow to show them
  if (!listsVisible) {
    if (event.key === 'ArrowRight') {
      toggleListsVisibility(true);
      activeColumn = 0;
      updateSelectionStates();
    }
    return;
  }

  switch(event.key) {
    case 'ArrowLeft':
      if (activeColumn > 0) {
        activeColumn--;
        updateSelectionStates();
      } else {
        toggleListsVisibility(false);
      }
      break;

    case 'ArrowRight':
      if (activeColumn < 2) {
        activeColumn++;
        updateSelectionStates();
      }
      break;

    case 'ArrowUp':
      switch (activeColumn) {
        case 0: // Navigation menu
          if (currentNavIndex > 0) {
            currentNavIndex--;
            updateSelectionStates();
          }
          break;
        case 1: // Categories
          if (currentCategoryIndex > 0) {
            currentCategoryIndex--;
            updateSelectionStates();
          }
          break;
        case 2: // Channels
          if (currentChannelIndex > 0) {
            currentChannelIndex--;
            loadChannel(currentChannelIndex);
          }
          break;
      }
      break;

    case 'ArrowDown':
      switch (activeColumn) {
        case 0: // Navigation menu
          if (currentNavIndex < document.querySelectorAll('.nav-item').length - 1) {
            currentNavIndex++;
            updateSelectionStates();
          }
          break;
        case 1: // Categories
          if (currentCategoryIndex < document.querySelectorAll('.category-item').length - 1) {
            currentCategoryIndex++;
            updateSelectionStates();
          }
          break;
        case 2: // Channels
          if (currentChannelIndex < filteredChannels.length - 1) {
            currentChannelIndex++;
            loadChannel(currentChannelIndex);
          }
          break;
      }
      break;

    case 'Enter':
      switch (activeColumn) {
        case 0: // Navigation menu
          const selectedNav = document.querySelectorAll('.nav-item')[currentNavIndex];
          const action = selectedNav.querySelector('span:last-child').textContent.toLowerCase();
          switch(action) {
            case 'home':
              window.location.href = 'index.html';
              break;
            case 'language':
            case 'category':
              currentSection = action;
              activeColumn = 1;
              currentCategoryIndex = 0;
              updateCategoriesList();
              updateChannelList();
              break;
            case 'about':
              window.location.href = 'about.html';
              break;
            case 'settings':
              window.location.href = 'settings.html';
              break;
          }
          break;
        case 1: // Categories
          const selectedCategory = document.querySelectorAll('.category-item')[currentCategoryIndex];
          if (selectedCategory) {
            if (currentSection === 'category') {
              currentCategory = selectedCategory.textContent;
            } else {
              currentLanguage = selectedCategory.textContent;
            }
            activeColumn = 2;
            currentChannelIndex = 0;
            updateChannelList();
          }
          break;
        case 2: // Channels
          loadChannel(currentChannelIndex);
          toggleListsVisibility(false);
          break;
      }
      break;

    case 'Escape':
    case 'Back':
      toggleListsVisibility(false);
      break;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  isPlayerPage = document.getElementById('videoPlayer') !== null;
  
  if (isPlayerPage) {
    channels = await loadChannels();
    updateCategoriesList();
    updateChannelList();
    updateSelectionStates();
  }
});

// Add keyboard navigation
document.addEventListener('keydown', handleNavigation);