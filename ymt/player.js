import { handleNumberInput } from './channelInput.js';

let currentChannelIndex = 0;
let channels = [];
let filteredChannels = [];
let categories = new Set();
let languages = new Set();
let currentSection = 'home';
let currentCategory = '';
let currentLanguage = '';
let activeColumn = 0;
let listsVisible = true;
let isPlayerPage = false;
let autoHideTimeout = null;

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

function resetAutoHideTimer() {
  if (!isPlayerPage) return;
  
  clearTimeout(autoHideTimeout);
  autoHideTimeout = setTimeout(() => {
    if (listsVisible) {
      listsVisible = false;
      toggleListsVisibility(false);
    }
  }, 4000); // 5 seconds
}

function toggleListsVisibility(show) {
  if (!isPlayerPage) return;
  
  const mainNav = document.querySelector('.main-nav');
  const categoriesList = document.querySelector('.categories-list');
  const channelListSection = document.querySelector('.channel-list-section');
  const videoSection = document.querySelector('.video-section');
  
  if (!mainNav || !categoriesList || !channelListSection || !videoSection) return;
  
  if (show) {
    mainNav.style.width = '5%';
    categoriesList.style.width = '10%';
    channelListSection.style.width = '15%';
    videoSection.style.width = '70%';
    mainNav.style.display = 'flex';
    categoriesList.style.display = 'block';
    channelListSection.style.display = 'block';
    resetAutoHideTimer();
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
    div.setAttribute('tabindex', '0'); // Make focusable for TV remotes
    if ((currentSection === 'category' && item === currentCategory) ||
        (currentSection === 'language' && item === currentLanguage)) {
      div.classList.add('selected');
    }
    div.textContent = item;
    
    // Add click event
    div.addEventListener('click', () => {
      if (currentSection === 'category') {
        currentCategory = item;
      } else if (currentSection === 'language') {
        currentLanguage = item;
      }
      updateChannelList();
    });
    
    // Add keyboard event for Enter key
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        if (currentSection === 'category') {
          currentCategory = item;
        } else if (currentSection === 'language') {
          currentLanguage = item;
        }
        updateChannelList();
      }
    });
    
    categoriesList.appendChild(div);
  });
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
}

function createChannelElement(channel, index) {
  const element = document.createElement('div');
  element.className = 'channel-item';
  element.dataset.index = index;
  element.dataset.channelNo = channel.channelNo;
  element.setAttribute('tabindex', '0'); // Make focusable for TV remotes
  if (index === currentChannelIndex) element.classList.add('selected');
  
  element.innerHTML = `
    <div class="channel-info">
      ${channel.logo ? `<img src="${channel.logo}" alt="" class="channel-item-logo">` : ''}
      <h3>${channel.channelNo ? `${channel.channelNo} - ` : ''}${channel.title}</h3>
    </div>
  `;
  
  // Add click event
   element.addEventListener('click', () => {
    loadChannel(index);
  });
  
  // Add keyboard event for Enter key
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      loadChannel(index);
    }
  });
  
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
  
  document.querySelectorAll('.channel-item').forEach((item, i) => {
    item.classList.toggle('selected', i === index);
  });

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
  
  if (!listsVisible) {
    toggleListsVisibility(false);
  }
}

function playSelectedChannel() {
  const savedChannelNo = localStorage.getItem('selectedChannelNo');
  const savedChannelUrl = localStorage.getItem('selectedChannelUrl');
  
  if (savedChannelNo && savedChannelUrl) {
    const channelIndex = channels.findIndex(ch => ch.channelNo === parseInt(savedChannelNo));
    if (channelIndex !== -1) {
      currentChannelIndex = channelIndex;
      loadChannel(currentChannelIndex);
    }
    
    localStorage.removeItem('selectedChannelNo');
    localStorage.removeItem('selectedChannelUrl');
  }
}

function changeChannel(direction) {
  if (!isPlayerPage) return;
  
  const channelsToUse = filteredChannels.length > 0 ? filteredChannels : channels;
  const newIndex = currentChannelIndex + direction;
  
  if (newIndex >= 0 && newIndex < channelsToUse.length) {
    listsVisible = true;
    loadChannel(newIndex);
  }
}

let currentNavIndex = 0;
let currentCategoryIndex = 0;

function updateNavSelection() {
  document.querySelectorAll('.nav-item').forEach((item, index) => {
    item.classList.toggle('selected', index === currentNavIndex);
    
    if (index === currentNavIndex) {
      const section = item.querySelector('span:last-child').textContent.toLowerCase();
      if (section === 'language' || section === 'category') {
        currentSection = section;
        currentCategory = '';
        currentLanguage = '';
        if (isPlayerPage) {
          updateCategoriesList();
          updateChannelList();
        }
      }
    }
  });
}

function updateCategorySelection() {
  document.querySelectorAll('.category-item').forEach((item, index) => {
    item.classList.toggle('selected', index === currentCategoryIndex);
    
    if (index === currentCategoryIndex) {
      const selectedItem = item.textContent;
      if (currentSection === 'category') {
        currentCategory = selectedItem;
      } else if (currentSection === 'language') {
        currentLanguage = selectedItem;
      }
      if (isPlayerPage) {
        updateChannelList();
      }
    }
  });
}

function navigateToPage(page) {
  const video = document.getElementById('videoPlayer');
  
  if (video) {
    video.pause();
    video.src = '';
  }
  
  window.location.href = page;
}

function navigateToPlayer() {
  window.location.href = 'player.html';
}

function handleNavigation(event) {
  // Log key events for debugging
  console.log('Key event:', event.key, event.keyCode);
  
  // Reset auto-hide timer on any navigation
  if (isPlayerPage && listsVisible) {
    resetAutoHideTimer();
  }

  // Handle number keys (0-9)
  if ((event.key >= '0' && event.key <= '9') || 
      (event.keyCode >= 48 && event.keyCode <= 57) || 
      (event.keyCode >= 96 && event.keyCode <= 105)) {
    
    // Convert keyCode to number string if needed
    let numberKey = event.key;
    if (event.keyCode >= 48 && event.keyCode <= 57) {
      numberKey = String(event.keyCode - 48);
    } else if (event.keyCode >= 96 && event.keyCode <= 105) {
      numberKey = String(event.keyCode - 96);
    }
    
    // Pass the complete channels array, not the filtered one
    handleNumberInput(numberKey, channels, (channelIndex) => {
      // Find the channel in the complete list
      const selectedChannel = channels[channelIndex];
      
      // If we're in a filtered view, find the channel's position in the filtered list
      if (filteredChannels.length > 0) {
        const filteredIndex = filteredChannels.findIndex(ch => ch.channelNo === selectedChannel.channelNo);
        if (filteredIndex !== -1) {
          // If the channel is in the current filtered view, update the index
          currentChannelIndex = filteredIndex;
        } else {
          // If the channel isn't in the current filter, clear filters and show all channels
          currentSection = 'home';
          currentCategory = '';
          currentLanguage = '';
          filteredChannels = channels;
          currentChannelIndex = channelIndex;
          updateCategoriesList();
        }
      } else {
        // If no filters are active, just update the index
        currentChannelIndex = channelIndex;
      }
      
      // Load and play the channel
      loadChannel(currentChannelIndex);
    });
    return;
  }

  // Map common TV remote keys to standard keys
  let key = event.key;
  
  // WebOS, Tizen, etc. might use different key codes
  if (event.keyCode === 13) key = 'Enter';
  if (event.keyCode === 37) key = 'ArrowLeft';
  if (event.keyCode === 38) key = 'ArrowUp';
  if (event.keyCode === 39) key = 'ArrowRight';
  if (event.keyCode === 40) key = 'ArrowDown';
  if (event.keyCode === 8 || event.keyCode === 27 || event.keyCode === 461) key = 'Back';

  if (isPlayerPage && !listsVisible) {
    if (key === 'ArrowRight') {
      toggleListsVisibility(true);
      return;
    }
    if (key === 'ArrowUp') {
      changeChannel(-1);
      return;
    }
    if (key === 'ArrowDown') {
      changeChannel(1);
      return;
    }
    return;
  }

  switch(key) {
    case 'ArrowLeft':
      if (activeColumn === 0 && isPlayerPage) {
        listsVisible = false;
        toggleListsVisibility(false);
      } else if (activeColumn > 0) {
        activeColumn--;
        updateActiveColumn();
      }
      break;

    case 'ArrowRight':
      if (activeColumn < 2 && isPlayerPage) {
        activeColumn++;
        updateActiveColumn();
      }
      break;

    case 'ArrowUp':
      if (activeColumn === 0 && currentNavIndex > 0) {
        currentNavIndex--;
        updateNavSelection();
      } else if (activeColumn === 1 && currentCategoryIndex > 0) {
        currentCategoryIndex--;
        updateCategorySelection();
      } else if (activeColumn === 2 && currentChannelIndex > 0 && isPlayerPage) {
        currentChannelIndex--;
        document.querySelectorAll('.channel-item').forEach((item, index) => {
          item.classList.toggle('selected', index === currentChannelIndex);
        });
        ensureChannelVisible(currentChannelIndex);
        listsVisible = true;
        loadChannel(currentChannelIndex);
      }
      break;

    case 'ArrowDown':
      const maxNav = document.querySelectorAll('.nav-item').length - 1;
      const maxCategory = document.querySelectorAll('.category-item')?.length - 1 || 0;
      const channelsToUse = filteredChannels.length > 0 ? filteredChannels : channels;
      const maxChannel = channelsToUse.length - 1;

      if (activeColumn === 0 && currentNavIndex < maxNav) {
        currentNavIndex++;
        updateNavSelection();
      } else if (activeColumn === 1 && currentCategoryIndex < maxCategory) {
        currentCategoryIndex++;
        updateCategorySelection();
      } else if (activeColumn === 2 && currentChannelIndex < maxChannel && isPlayerPage) {
        currentChannelIndex++;
        document.querySelectorAll('.channel-item').forEach((item, index) => {
          item.classList.toggle('selected', index === currentChannelIndex);
        });
        ensureChannelVisible(currentChannelIndex);
        listsVisible = true;
        loadChannel(currentChannelIndex);
      }
      break;

    case 'Enter':
      if (activeColumn === 0) {
        const navItems = document.querySelectorAll('.nav-item');
        const selectedNav = navItems[currentNavIndex];
        const section = selectedNav.querySelector('span:last-child').textContent.toLowerCase();
        
        if (section === 'home') {
          navigateToPage('index.html');
        } else if (section === 'about') {
          navigateToPage('about.html');
        } else if (section === 'settings') {
          navigateToPage('settings.html');
        } else if (section === 'language' || section === 'category') {
          if (!isPlayerPage) {
            navigateToPlayer();
          }
        }
      } else if (activeColumn === 2 && isPlayerPage) {
        listsVisible = false;
        loadChannel(currentChannelIndex);
      }
      break;
      
    case 'Back':
    case 'Escape':
      if (isPlayerPage) {
        listsVisible = false;
        toggleListsVisibility(false);
      } else {
        navigateToPage('index.html');
      }
      break;
  }
}

function updateActiveColumn() {
  if (!isPlayerPage) return;
  
  const mainNav = document.querySelector('.main-nav');
  const categoriesList = document.querySelector('.categories-list');
  const channelList = document.querySelector('.channel-list');
  
  if (!mainNav || !categoriesList || !channelList) return;
  
  mainNav.classList.toggle('active', activeColumn === 0);
  categoriesList.classList.toggle('active', activeColumn === 1);
  channelList.classList.toggle('active', activeColumn === 2);

  if (activeColumn === 1) {
    currentCategoryIndex = 0;
    updateCategorySelection();
  }
}

function ensureChannelVisible(index) {
  if (!isPlayerPage) return;
  
  const channelItem = document.querySelectorAll('.channel-item')[index];
  if (channelItem) {
    channelItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Setup gamepad support for TV remotes
function setupGamepadSupport() {
  let gamepadState = {};
  
  function checkGamepads() {
    const gamepads = navigator.getGamepads();
    
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (!gamepad) continue;
      
      // Initialize state for this gamepad if needed
      if (!gamepadState[gamepad.index]) {
        gamepadState[gamepad.index] = {
          buttons: Array(gamepad.buttons.length).fill(false),
          axes: Array(gamepad.axes.length).fill(0)
        };
      }
      
      // Check buttons
      for (let j = 0; j < gamepad.buttons.length; j++) {
        const buttonPressed = gamepad.buttons[j].pressed;
        
        // Button was just pressed (not held down)
        if (buttonPressed && !gamepadState[gamepad.index].buttons[j]) {
          handleGamepadButton(j);
        }
        
        // Update state
        gamepadState[gamepad.index].buttons[j] = buttonPressed;
      }
      
      // Check axes (D-pad is often on axes)
      for (let j = 0; j < gamepad.axes.length; j++) {
        const axisValue = gamepad.axes[j];
        const prevValue = gamepadState[gamepad.index].axes[j];
        
        // Detect significant change in axis value
        if (Math.abs(axisValue - prevValue) > 0.5) {
          handleGamepadAxis(j, axisValue);
        }
        
        // Update state
        gamepadState[gamepad.index].axes[j] = axisValue;
      }
    }
    
    requestAnimationFrame(checkGamepads);
  }
  
  function handleGamepadButton(buttonIndex) {
    console.log('Gamepad button pressed:', buttonIndex);
    
    // Map common gamepad buttons to keys
    switch (buttonIndex) {
      case 0: // A button (typically primary/select)
        handleNavigation({ key: 'Enter', keyCode: 13 });
        break;
      case 1: // B button (typically back/cancel)
        handleNavigation({ key: 'Back', keyCode: 27 });
        break;
      case 12: // D-pad up
        handleNavigation({ key: 'ArrowUp', keyCode: 38 });
        break;
      case 13: // D-pad down
        handleNavigation({ key: 'ArrowDown', keyCode: 40 });
        break;
      case 14: // D-pad left
        handleNavigation({ key: 'ArrowLeft', keyCode: 37 });
        break;
      case 15: // D-pad right
        handleNavigation({ key: 'ArrowRight', keyCode: 39 });
        break;
    }
  }
  
  function handleGamepadAxis(axisIndex, value) {
    console.log('Gamepad axis changed:', axisIndex, value);
    
    // First two axes are typically left stick
    if (axisIndex === 0 && value < -0.7) handleNavigation({ key: 'ArrowLeft', keyCode: 37 });
    if (axisIndex === 0 && value > 0.7) handleNavigation({ key: 'ArrowRight', keyCode: 39 });
    if (axisIndex === 1 && value < -0.7) handleNavigation({ key: 'ArrowUp', keyCode: 38 });
    if (axisIndex === 1 && value > 0.7) handleNavigation({ key: 'ArrowDown', keyCode: 40 });
  }
  
  window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected:', e.gamepad.id);
    checkGamepads();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  isPlayerPage = document.getElementById('videoPlayer') !== null;
  
  channels = await loadChannels();
  
  if (isPlayerPage) {
    updateCategoriesList();
    updateChannelList();
    updateActiveColumn();
    
    playSelectedChannel();
    
    // Setup gamepad support
    setupGamepadSupport();
  }
});

document.addEventListener('keydown', handleNavigation);