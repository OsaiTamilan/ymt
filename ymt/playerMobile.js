let currentChannelIndex = 0;
let channels = [];
let filteredChannels = [];
let categories = new Set();
let languages = new Set();
let currentCategory = '';
let currentLanguage = '';
let videoPlayer = null;
let currentFilterType = '';
let numberInput = '';
let numberInputTimeout = null;

// Initialize the application
async function init() {
  // Load channels
  channels = await loadChannels();
  
  // Extract categories and languages
  channels.forEach(channel => {
    if (channel.category) categories.add(channel.category);
    if (channel.language) languages.add(channel.language);
  });
  
  // Initialize filtered channels
  filteredChannels = [...channels];
  
  // Set up UI
  updateChannelGrid();
  setupBottomNav();
  setupFilterPanel();
  
  // Load first channel
  if (filteredChannels.length > 0) {
    loadChannel(0);
  }
}

// Load channels from M3U file
async function loadChannels() {
  try {
    const response = await fetch('../ymt/data/channels.m3u');
    const data = await response.text();
    return parseM3U(data);
  } catch (error) {
    console.error('Error loading playlist:', error);
    return [];
  }
}

// Parse M3U file
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
      currentChannel = null;
    }
  }

  return channels;
}

// Set up bottom navigation
function setupBottomNav() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      
      // Update selected nav item
      navItems.forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      
      // Handle navigation actions
      switch(action) {
        case 'home':
          window.location.href = '../ymt/playerMobile.html';
          break;
        case 'language':
          showFilterPanel('language');
          break;
        case 'category':
          showFilterPanel('category');
          break;
        case 'info':
          window.location.href = '../ymt/aboutMobile.html';
          break;
        case 'settings':
          window.location.href = '../ymt/aatral-tv/aatral-tvMobile.html';
          break;
      }
    });
  });
}

// Set up filter panel
function setupFilterPanel() {
  const filterPanel = document.getElementById('filterPanel');
  const filterClose = document.getElementById('filterClose');
  
  filterClose.addEventListener('click', () => {
    filterPanel.classList.remove('visible');
  });
}

// Show filter panel
function showFilterPanel(type) {
  const filterPanel = document.getElementById('filterPanel');
  const filterTitle = document.getElementById('filterTitle');
  const filterOptions = document.getElementById('filterOptions');
  
  currentFilterType = type;
  
  // Set title
  filterTitle.textContent = type === 'language' ? 'Select Language' : 'Select Category';
  
  // Populate options
  const options = type === 'language' ? languages : categories;
  const currentValue = type === 'language' ? currentLanguage : currentCategory;
  
  filterOptions.innerHTML = `
    <div class="filter-option ${!currentValue ? 'selected' : ''}" data-value="">All</div>
    ${Array.from(options).map(option => 
      `<div class="filter-option ${currentValue === option ? 'selected' : ''}" data-value="${option}">${option}</div>`
    ).join('')}
  `;
  
  // Add event listeners
  filterOptions.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', () => {
      const value = option.dataset.value;
      
      // Update selected option
      filterOptions.querySelectorAll('.filter-option').forEach(el => 
        el.classList.remove('selected')
      );
      option.classList.add('selected');
      
      // Apply filter
      if (type === 'language') {
        currentLanguage = value;
      } else {
        currentCategory = value;
      }
      
      filterChannels();
      filterPanel.classList.remove('visible');
    });
  });
  
  // Show panel
  filterPanel.classList.add('visible');
}

// Filter channels based on current category and language
function filterChannels() {
  filteredChannels = channels.filter(channel => {
    let match = true;
    
    if (currentCategory && channel.category !== currentCategory) {
      match = false;
    }
    
    if (currentLanguage && channel.language !== currentLanguage) {
      match = false;
    }
    
    return match;
  });
  
  updateChannelGrid();
  
  // Reset channel index and load first channel if available
  if (filteredChannels.length > 0) {
    currentChannelIndex = 0;
    loadChannel(0);
  }
}

// Update channel grid
function updateChannelGrid() {
  const channelGrid = document.getElementById('channelGrid');
  if (!channelGrid) return;
  
  channelGrid.innerHTML = '';
  
  filteredChannels.forEach((channel, index) => {
    const channelCard = document.createElement('div');
    channelCard.className = 'channel-card';
    if (index === currentChannelIndex) {
      channelCard.classList.add('selected');
    }
    
    channelCard.innerHTML = `
      <div class="channel-logo-container">
        <img src="${channel.logo || 'placeholder.png'}" alt="" class="channel-logo">
      </div>
      <div class="channel-info">
        <h3>${channel.channelNo ? `${channel.channelNo}` : ''} ${channel.title}</h3>
        <div class="channel-meta">
          <span>${channel.category}</span>
        </div>
      </div>
    `;
    
    channelCard.addEventListener('click', () => {
      loadChannel(index);
    });
    
    channelGrid.appendChild(channelCard);
  });
}

// Load and play a channel
function loadChannel(index) {
  if (index < 0 || index >= filteredChannels.length) return;
  
  currentChannelIndex = index;
  const channel = filteredChannels[index];
  
  // Update selected channel in UI
  document.querySelectorAll('.channel-card').forEach((card, i) => {
    card.classList.toggle('selected', i === index);
  });
  
  // Get video player
  const video = document.getElementById('videoPlayer');
  if (!video) return;
  
  // Load and play video using HLS.js
  if (Hls.isSupported()) {
    if (videoPlayer) {
      videoPlayer.destroy();
    }
    
    videoPlayer = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60
    });
    
    videoPlayer.loadSource(channel.url);
    videoPlayer.attachMedia(video);
    videoPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(e => console.log('Playback failed:', e));
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // For Safari
    video.src = channel.url;
    video.addEventListener('loadedmetadata', () => {
      video.play().catch(e => console.log('Playback failed:', e));
    });
  }
  
  // Scroll to the selected channel in the grid
  const selectedCard = document.querySelectorAll('.channel-card')[index];
  if (selectedCard) {
    selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Handle number input for direct channel access
function handleNumberInput(number) {
  // Clear any existing timeout
  clearTimeout(numberInputTimeout);
  
  // Add the number to the current input (limit to 4 digits)
  if (numberInput.length < 4) {
    numberInput += number;
  }
  
  // Show the number input display
  showNumberDisplay(numberInput);
  
  // Check if the current number input matches any channel number
  const channelNumber = parseInt(numberInput);
  const channelIndex = channels.findIndex(ch => ch.channelNo === channelNumber);
  
  if (channelIndex !== -1) {
    // Valid channel found, set timeout to switch to it
    numberInputTimeout = setTimeout(() => {
      const channel = channels[channelIndex];
      const filteredIndex = filteredChannels.findIndex(ch => ch.channelNo === channel.channelNo);
      
      if (filteredIndex !== -1) {
        loadChannel(filteredIndex);
      } else {
        // If channel not in current filter, reset filters
        currentCategory = '';
        currentLanguage = '';
        filteredChannels = [...channels];
        updateChannelGrid();
        
        // Find index in full channel list
        loadChannel(filteredChannels.findIndex(ch => ch.channelNo === channel.channelNo));
      }
      
      numberInput = '';
      hideNumberDisplay();
    }, 1500);
  } else {
    // Check if any channel starts with the current input
    const possibleChannel = channels.some(ch => 
      ch.channelNo?.toString().startsWith(numberInput)
    );
    
    if (!possibleChannel) {
      // If no channel exists or could exist with this prefix, show error and reset
      showNumberDisplay(`${numberInput} - Not Available`, true);
      numberInputTimeout = setTimeout(() => {
        numberInput = '';
        hideNumberDisplay();
      }, 2000);
    } else {
      // Still potentially building a valid number, set timeout to reset if no more input
      numberInputTimeout = setTimeout(() => {
        numberInput = '';
        hideNumberDisplay();
      }, 3000);
    }
  }
}

/**
 * Show the number display with the current input
 * @param {string} text - Text to display
 * @param {boolean} isError - Whether this is an error message
 */
function showNumberDisplay(text, isError = false) {
  const numberDisplay = document.getElementById('numberDisplay');
  if (!numberDisplay) return;
  
  numberDisplay.textContent = text;
  numberDisplay.style.display = 'block';
  
  // Add error styling if needed
  if (isError) {
    numberDisplay.style.borderColor = 'rgba(255, 0, 0, 0.5)';
    numberDisplay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
  } else {
    numberDisplay.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    numberDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  }
}

/**
 * Hide the number display
 */
function hideNumberDisplay() {
  const numberDisplay = document.getElementById('numberDisplay');
  if (numberDisplay) {
    numberDisplay.style.display = 'none';
  }
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
  if (event.key >= '0' && event.key <= '9') {
    handleNumberInput(event.key);
  }
});

// Touch swipe for channel navigation in video section
let touchStartY = 0;
const videoSection = document.querySelector('.video-section');

if (videoSection) {
  videoSection.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  videoSection.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    
    // Swipe up = next channel, swipe down = previous channel
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        changeChannel(1); // Next channel
      } else {
        changeChannel(-1); // Previous channel
      }
    }
  }, { passive: true });
}

// Change channel up or down
function changeChannel(direction) {
  const newIndex = currentChannelIndex + direction;
  
  if (newIndex >= 0 && newIndex < filteredChannels.length) {
    loadChannel(newIndex);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);