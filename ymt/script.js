import { handleNumberInput, showNumberInput, hideNumberInput } from './channelInput.js';

async function fetchPlaylist() {
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

let selectedIndex = 0;
let channels = [];
let filteredChannels = [];
let navIndex = 0;
let isInNav = true;
let isInDropdown = false;
let languageIndex = 0;
let selectedLanguage = '';
let gridColumns = 4; // Default value, will be calculated based on screen size
let lastKeyTime = 0;
let lastKey = '';
let keyRepeatDelay = 300; // Delay in ms to prevent multiple key presses
let tvRemoteDebug = true; // Enable TV remote debugging

// Detect if we're on a Smart TV
const isSmartTV = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('smart-tv') || 
    userAgent.includes('tv') || 
    userAgent.includes('android tv') || 
    userAgent.includes('hbbtv') || 
    userAgent.includes('netcast') || 
    userAgent.includes('viera') || 
    userAgent.includes('webos') ||
    userAgent.includes('tizen')
  );
};

// Log if we're on a Smart TV
console.log(`Is Smart TV: ${isSmartTV()}`);
console.log(`User Agent: ${navigator.userAgent}`);

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

  if (isInDropdown) {
    languageIndex = selectedLanguage ? 
      sortedLanguages.indexOf(selectedLanguage) + 1 : 0;
  }
  
  // Add click handlers for language items
  document.querySelectorAll('.language-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      selectedLanguage = item.dataset.language;
      filterChannels();
      isInDropdown = false;
      updateSelectedNavItem();
    });
    
    // Add keyboard event listeners for Enter key
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        selectedLanguage = item.dataset.language;
        filterChannels();
        isInDropdown = false;
        updateSelectedNavItem();
      }
    });
  });
}

function filterChannels() {
  if (!selectedLanguage) {
    filteredChannels = channels;
  } else {
    filteredChannels = channels.filter(channel => channel.language === selectedLanguage);
  }
  updateChannelGrid();
}

function calculateGridColumns() {
  const container = document.querySelector('.channels-container');
  if (!container) return 4;
  
  const containerWidth = container.clientWidth;
  
  // For Smart TVs, use a simpler grid with fewer columns
  if (isSmartTV()) {
    if (containerWidth < 1280) return 3;
    if (containerWidth < 1920) return 4;
    return 5;
  }
  
  // For regular browsers
  if (containerWidth < 768) return 2;
  if (containerWidth < 1024) return 3;
  if (containerWidth < 1440) return 4;
  if (containerWidth < 1920) return 5;
  return 6;
}

function updateChannelGrid() {
  const channelList = document.getElementById('channelList');
  if (!channelList) return;

  channelList.innerHTML = '';
  
  // Add the channels from m3u data only
  filteredChannels.forEach((channel, index) => {
    const card = createChannelCard(channel, index);
    channelList.appendChild(card);
  });
  
  // Calculate grid columns based on container width
  gridColumns = calculateGridColumns();
  console.log(`Grid columns: ${gridColumns}`);
  
  selectedIndex = 0;
  updateSelectedCard();
}

function createChannelCard(channel, index) {
  const card = document.createElement('div');
  card.className = 'channel-card';
  card.dataset.channelNo = channel.channelNo;
  card.dataset.index = index.toString();
  card.setAttribute('tabindex', '0'); // Make focusable for TV remotes
  
  card.innerHTML = `
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
  
  // Add click event
  card.addEventListener('click', () => {
    navigateToChannel(index);
  });
  
  // Add keyboard event for Enter key
  card.addEventListener('keydown', (e) => {
    if (tvRemoteDebug) console.log('Channel card keydown:', e.key, e.keyCode);
    
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault(); // Prevent default to ensure the action happens
      navigateToChannel(index);
    }
  });
  
  return card;
}

function updateSelectedCard() {
  document.querySelectorAll('.channel-card').forEach((card) => {
    const cardIndex = parseInt(card.dataset.index || '0');
    card.classList.toggle('selected', !isInNav && !isInDropdown && cardIndex === selectedIndex);
    
    // For Smart TVs, also update focus
    if (!isInNav && !isInDropdown && cardIndex === selectedIndex) {
      setTimeout(() => {
        try {
          card.focus();
          if (tvRemoteDebug) console.log('Focused card:', cardIndex);
        } catch (e) {
          console.error('Error focusing card:', e);
        }
      }, 50);
    }
  });
}

function updateSelectedNavItem() {
  document.querySelectorAll('.nav-item').forEach((item, index) => {
    item.classList.toggle('selected', isInNav && index === navIndex);
    if (index === 1) { // Filter nav item
      item.classList.toggle('open', isInDropdown);
    }
    
    // For Smart TVs, also update focus
    if (isInNav && index === navIndex) {
      setTimeout(() => {
        try {
          item.focus();
          if (tvRemoteDebug) console.log('Focused nav item:', index);
        } catch (e) {
          console.error('Error focusing nav item:', e);
        }
      }, 50);
    }
  });
}

function updateSelectedLanguage() {
  const languageItems = document.querySelectorAll('.language-item');
  languageItems.forEach((item, index) => {
    item.classList.toggle('selected', isInDropdown && index === languageIndex);
    
    // For Smart TVs, also update focus
    if (isInDropdown && index === languageIndex) {
      setTimeout(() => {
        try {
          item.focus();
          if (tvRemoteDebug) console.log('Focused language item:', index);
        } catch (e) {
          console.error('Error focusing language item:', e);
        }
      }, 50);
    }
  });
}

function navigateToChannel(channelIndex) {
  if (tvRemoteDebug) console.log('Navigating to channel:', channelIndex);
  
  const selectedChannel = filteredChannels[channelIndex];
  if (selectedChannel && selectedChannel.channelNo) {
    localStorage.setItem('selectedChannelNo', selectedChannel.channelNo.toString());
    localStorage.setItem('selectedChannelUrl', selectedChannel.url);
    window.location.href = 'player.html';
  }
}

// Unified key event handler for all input types
function handleKeyEvent(event) {
  // For debugging on TV devices
  if (tvRemoteDebug) {
    console.log('Key event:', {
      type: event.type,
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      target: event.target.tagName,
      targetClass: event.target.className
    });
  }
  
  // Prevent key repeat (important for TV remotes)
  const now = Date.now();
  if (lastKey === event.key && now - lastKeyTime < keyRepeatDelay) {
    return;
  }
  lastKey = event.key;
  lastKeyTime = now;
  
  // Map common TV remote keys to standard keys
  let key = event.key;
  
  // Handle numeric keypad and TV remote number buttons
  if (event.keyCode >= 48 && event.keyCode <= 57) {
    key = String(event.keyCode - 48); // Convert to string '0'-'9'
  } else if (event.keyCode >= 96 && event.keyCode <= 105) {
    key = String(event.keyCode - 96); // Convert numpad to string '0'-'9'
  }
  
  // WebOS, Tizen, etc. might use different key codes
  if (event.keyCode === 13) key = 'Enter';
  if (event.keyCode === 37) key = 'ArrowLeft';
  if (event.keyCode === 38) key = 'ArrowUp';
  if (event.keyCode === 39) key = 'ArrowRight';
  if (event.keyCode === 40) key = 'ArrowDown';
  if (event.keyCode === 8 || event.keyCode === 27 || event.keyCode === 461) key = 'Back';
  
  // Handle number input (0-9)
  if (key >= '0' && key <= '9') {
    handleNumberInput(key, channels, (channelIndex) => {
      navigateToChannel(channelIndex);
    });
    return;
  }

  // Process navigation based on current UI state
  processNavigation(key);
}

function processNavigation(key) {
  if (isInDropdown) {
    handleDropdownNavigation(key);
  } else if (isInNav) {
    handleNavBarNavigation(key);
  } else {
    handleChannelGridNavigation(key);
  }
}

function handleDropdownNavigation(key) {
  const languageItems = document.querySelectorAll('.language-item');
  const totalLanguages = languageItems.length;

  switch(key) {
    case 'ArrowLeft':
      if (languageIndex > 0) {
        languageIndex--;
        updateSelectedLanguage();
      }
      break;
    case 'ArrowRight':
      if (languageIndex < totalLanguages - 1) {
        languageIndex++;
        updateSelectedLanguage();
      }
      break;
    case 'Enter':
      const selectedItem = languageItems[languageIndex];
      if (selectedItem) {
        selectedLanguage = selectedItem.dataset.language;
        filterChannels();
        isInDropdown = false;
        updateSelectedNavItem();
        updateLanguageList();
      }
      break;
    case 'Escape':
    case 'Back':
      isInDropdown = false;
      updateSelectedNavItem();
      break;
  }
}

function handleNavBarNavigation(key) {
  const navItems = document.querySelectorAll('.nav-item');
  
  switch(key) {
    case 'ArrowLeft':
      if (navIndex > 0) {
        navIndex--;
        updateSelectedNavItem();
      }
      break;
    case 'ArrowRight':
      if (navIndex < navItems.length - 1) {
        navIndex++;
        updateSelectedNavItem();
      }
      break;
    case 'ArrowDown':
      isInNav = false;
      updateSelectedNavItem();
      updateSelectedCard();
      break;
    case 'Enter':
      if (navIndex === 1) { // Filter nav item
        isInDropdown = true;
        languageIndex = 0; // Reset language index when opening dropdown
        updateSelectedNavItem();
        updateSelectedLanguage();
      } else {
        const navItem = navItems[navIndex];
        const action = navItem.querySelector('span:last-child')?.textContent.toLowerCase();
        
        // Check if this is the Aatral TV button with a direct link
        const link = navItem.querySelector('a');
        if (link) {
          window.location.href = link.href;
          return;
        }
        
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
          case 'tv':
          case 'aatral tv':
            window.location.href = 'aatral-tv/aatral-tv.html';
            break;
        }
      }
      break;
  }
}

function handleChannelGridNavigation(key) {
  const channelCards = document.querySelectorAll('.channel-card');
  const totalCards = channelCards.length;

  switch(key) {
    case 'ArrowUp':
      if (selectedIndex === 0) {
        isInNav = true;
        updateSelectedNavItem();
        updateSelectedCard();
      } else if (selectedIndex >= gridColumns) {
        selectedIndex = Math.max(0, selectedIndex - gridColumns);
        updateSelectedCard();
      }
      break;
    case 'ArrowDown':
      const nextRowIndex = selectedIndex + gridColumns;
      if (nextRowIndex < totalCards) {
        selectedIndex = nextRowIndex;
        updateSelectedCard();
      }
      break;
    case 'ArrowLeft':
      if (selectedIndex > 0) {
        selectedIndex--;
        updateSelectedCard();
      }
      break;
    case 'ArrowRight':
      if (selectedIndex < totalCards - 1) {
        selectedIndex++;
        updateSelectedCard();
      }
      break;
    case 'Enter':
      const selectedCard = channelCards[selectedIndex];
      if (selectedCard) {
        navigateToChannel(selectedIndex);
      }
      break;
    case 'Escape':
    case 'Back':
      isInNav = true;
      updateSelectedNavItem();
      updateSelectedCard();
      break;
  }

  // Ensure the selected card is visible
  const selectedCard = document.querySelector('.channel-card.selected');
  if (selectedCard) {
    selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Handle window resize to recalculate grid columns
function handleResize() {
  const oldColumns = gridColumns;
  const newColumns = calculateGridColumns();
  
  if (oldColumns !== newColumns) {
    gridColumns = newColumns;
    console.log(`Grid columns updated: ${gridColumns}`);
    
    // If we're in the grid, make sure the selected index is still valid
    if (!isInNav && !isInDropdown) {
      updateSelectedCard();
    }
  }
}

// Setup direct click handlers for navigation elements
function setupClickHandlers() {
  // Nav items click handlers
  document.querySelectorAll('.nav-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      navIndex = index;
      isInNav = true;
      isInDropdown = false;
      updateSelectedNavItem();
      
      if (index === 1) { // Filter nav item
        isInDropdown = true;
        updateSelectedLanguage();
      } else {
        // Check if this is the Aatral TV button with a direct link
        const link = item.querySelector('a');
        if (link) {
          window.location.href = link.href;
          return;
        }
        
        const action = item.querySelector('span:last-child')?.textContent.toLowerCase();
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
          case 'tv':
          case 'aatral tv':
            window.location.href = 'aatral-tv/aatral-tv.html';
            break;
        }
      }
    });
  });
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
    if (tvRemoteDebug) console.log('Gamepad button pressed:', buttonIndex);
    
    // Map common gamepad buttons to keys
    switch (buttonIndex) {
      case 0: // A button (typically primary/select)
        processNavigation('Enter');
        break;
      case 1: // B button (typically back/cancel)
        processNavigation('Back');
        break;
      case 12: // D-pad up
        processNavigation('ArrowUp');
        break;
      case 13: // D-pad down
        processNavigation('ArrowDown');
        break;
      case 14: // D-pad left
        processNavigation('ArrowLeft');
        break;
      case 15: // D-pad right
        processNavigation('ArrowRight');
        break;
    }
  }
  
  function handleGamepadAxis(axisIndex, value) {
    if (tvRemoteDebug) console.log('Gamepad axis changed:', axisIndex, value);
    
    // First two axes are typically left stick
    if (axisIndex === 0 && value < -0.7) processNavigation('ArrowLeft');
    if (axisIndex === 0 && value > 0.7) processNavigation('ArrowRight');
    if (axisIndex === 1 && value < -0.7) processNavigation('ArrowUp');
    if (axisIndex === 1 && value > 0.7) processNavigation('ArrowDown');
  }
  
  window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected:', e.gamepad.id);
    checkGamepads();
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
  
  // Add event listeners for all input types
  document.addEventListener('keydown', handleKeyEvent);
  window.addEventListener('resize', handleResize);
  
  // Setup click handlers
  setupClickHandlers();
  
  // Setup gamepad support
  setupGamepadSupport();
  
  // For Smart TVs, add additional support
  if (isSmartTV()) {
    console.log('Smart TV detected, adding special TV remote handling');
    
    // Add a visible focus indicator for debugging
    if (tvRemoteDebug) {
      const style = document.createElement('style');
      style.textContent = `
        .debug-focus-indicator {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(255, 0, 0, 0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 9999;
        }
      `;
      document.head.appendChild(style);
      
      const indicator = document.createElement('div');
      indicator.className = 'debug-focus-indicator';
      indicator.textContent = 'Focus: None';
      document.body.appendChild(indicator);
      
      // Update the indicator when focus changes
      setInterval(() => {
        const activeElement = document.activeElement;
        indicator.textContent = `Focus: ${activeElement.tagName} ${activeElement.className}`;
      }, 500);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const isHomePage = document.querySelector('.home-page') !== null;
  if (isHomePage) {
    initializeChannelList();
  }
});