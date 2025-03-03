import { handleNumberInput } from './channelInput.js';
import { fetchPlaylist } from './js/m3uParser.js';
import { UIManager } from './js/uiManager.js';
import { ChannelGrid } from './js/channelGrid.js';
import { LanguageFilter } from './js/languageFilter.js';
import { logDeviceInfo } from './js/tvDetection.js';

// State variables
let selectedIndex = 0;
let channels = [];
let filteredChannels = [];
let navIndex = 0;
let isInNav = true;
let isInDropdown = false;
let languageIndex = 0;
let selectedLanguage = '';

// Initialize managers
const uiManager = new UIManager();
const channelGrid = new ChannelGrid(uiManager);
let languageFilter;

/**
 * Navigate to a specific channel
 * @param {number} channelIndex - Index of the channel to navigate to
 */
function navigateToChannel(channelIndex) {
  const selectedChannel = filteredChannels[channelIndex];
  if (selectedChannel && selectedChannel.channelNo) {
    localStorage.setItem('selectedChannelNo', selectedChannel.channelNo.toString());
    localStorage.setItem('selectedChannelUrl', selectedChannel.url);
    window.location.href = 'player.html';
  }
}

/**
 * Apply language filter and update UI
 * @param {string} language - Language to filter by
 */
function applyLanguageFilter(language) {
  selectedLanguage = language;
  filteredChannels = languageFilter.filterChannels(channels, selectedLanguage);
  
  // Update UI
  uiManager.gridColumns = channelGrid.updateChannelGrid(filteredChannels, navigateToChannel);
  selectedIndex = 0;
  isInDropdown = false;
  
  // Update language list
  languageFilter.updateLanguageList(
    channels, 
    selectedLanguage, 
    isInDropdown, 
    languageIndex,
    updateLanguageIndex,
    updateNavigation
  );
  
  // Update selected card
  uiManager.updateSelectedCard(selectedIndex, isInNav, isInDropdown);
}

/**
 * Update the language index and UI
 * @param {number} index - New language index
 */
function updateLanguageIndex(index) {
  languageIndex = index;
  uiManager.updateSelectedLanguage(languageIndex, isInDropdown);
}

/**
 * Update navigation state and UI
 */
function updateNavigation() {
  isInDropdown = false;
  uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
}

/**
 * Handle keyboard navigation
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleNavigation(event) {
  // Prevent key repeat (important for TV remotes)
  if (!uiManager.shouldProcessKey(event.key)) {
    return;
  }
  
  // Handle number input (0-9)
  if (event.key >= '0' && event.key <= '9') {
    handleNumberInput(event.key, channels, (channelIndex) => {
      navigateToChannel(channelIndex);
    });
    return;
  }

  if (isInDropdown) {
    handleDropdownNavigation(event);
  } else if (isInNav) {
    handleNavBarNavigation(event);
  } else {
    handleGridNavigation(event);
  }

  // Ensure the selected card is visible
  const selectedCard = document.querySelector('.channel-card.selected');
  uiManager.ensureCardVisible(selectedCard);
}

/**
 * Handle navigation within the dropdown
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleDropdownNavigation(event) {
  const languageItems = document.querySelectorAll('.language-item');
  const totalLanguages = languageItems.length;

  switch(event.key) {
    case 'ArrowLeft':
      if (languageIndex > 0) {
        languageIndex--;
        uiManager.updateSelectedLanguage(languageIndex, isInDropdown);
      }
      break;
    case 'ArrowRight':
      if (languageIndex < totalLanguages - 1) {
        languageIndex++;
        uiManager.updateSelectedLanguage(languageIndex, isInDropdown);
      }
      break;
    case 'ArrowUp':
      if (languageIndex >= 4) { // Assuming 4 items per row
        languageIndex -= 4;
        uiManager.updateSelectedLanguage(languageIndex, isInDropdown);
      } else {
        // Exit dropdown and go back to nav
        isInDropdown = false;
        uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
      }
      break;
    case 'ArrowDown':
      if (languageIndex + 4 < totalLanguages) { // Assuming 4 items per row
        languageIndex += 4;
        uiManager.updateSelectedLanguage(languageIndex, isInDropdown);
      }
      break;
    case 'Enter':
      const selectedItem = languageItems[languageIndex];
      if (selectedItem) {
        selectedLanguage = selectedItem.dataset.language;
        applyLanguageFilter(selectedLanguage);
      }
      break;
    case 'Escape':
    case 'Back':
      isInDropdown = false;
      uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
      break;
  }
}

/**
 * Handle navigation within the nav bar
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleNavBarNavigation(event) {
  const navItems = document.querySelectorAll('.nav-item');
  switch(event.key) {
    case 'ArrowLeft':
      if (navIndex > 0) {
        navIndex--;
        uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
      }
      break;
    case 'ArrowRight':
      if (navIndex < navItems.length - 1) {
        navIndex++;
        uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
      }
      break;
    case 'ArrowDown':
      isInNav = false;
      uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
      uiManager.updateSelectedCard(selectedIndex, isInNav, isInDropdown);
      break;
    case 'Enter':
      if (navIndex === 1) { // Filter nav item
        isInDropdown = true;
        languageIndex = 0; // Reset language index when opening dropdown
        uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
        uiManager.updateSelectedLanguage(languageIndex, isInDropdown);
      } else {
        const action = navItems[navIndex].querySelector('span:last-child').textContent.toLowerCase();
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
        }
      }
      break;
  }
}

/**
 * Handle navigation within the channel grid
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleGridNavigation(event) {
  const channelCards = document.querySelectorAll('.channel-card');
  const totalCards = channelCards.length;

  switch(event.key) {
    case 'ArrowUp':
      if (selectedIndex === 0) {
        isInNav = true;
        uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
        uiManager.updateSelectedCard(selectedIndex, isInNav, isInDropdown);
      } else if (selectedIndex >= uiManager.gridColumns) {
        selectedIndex = Math.max(0, selectedIndex - uiManager.gridColumns);
        uiManager.updateSelectedCard(selectedIndex, isInNav, isInDropdown);
      }
      break;
    case 'ArrowDown':
      const nextRowIndex = selectedIndex + uiManager.gridColumns;
      if (nextRowIndex < totalCards) {
        selectedIndex = nextRowIndex;
        uiManager.updateSelectedCard(selectedIndex, isInNav, isInDropdown);
      }
      break;
    case 'ArrowLeft':
      if (selectedIndex > 0) {
        selectedIndex--;
        uiManager.updateSelectedCard(selectedIndex, isInNav, isInDropdown);
      }
      break;
    case 'ArrowRight':
      if (selectedIndex < totalCards - 1) {
        selectedIndex++;
        uiManager.updateSelectedCard(selectedIndex, isInNav, isInDropdown);
      }
      break;
    case 'Enter':
      const selectedCard = channelCards[selectedIndex];
      if (selectedCard) {
        if (selectedIndex === 0) {
          // Aatral TV card
          window.location.href = 'aatral-tv/aatral-tv.html';
        } else {
          const channelIndex = selectedIndex - 1; // Adjust for Aatral TV card
          navigateToChannel(channelIndex);
        }
      }
      break;
    case 'Escape':
    case 'Back':
      isInNav = true;
      uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
      uiManager.updateSelectedCard(selectedIndex, isInNav, isInDropdown);
      break;
  }
}

/**
 * Handle window resize
 */
function handleResize() {
  const oldColumns = uiManager.gridColumns;
  const newColumns = uiManager.calculateGridColumns();
  
  if (oldColumns !== newColumns) {
    uiManager.gridColumns = newColumns;
    console.log(`Grid columns updated: ${uiManager.gridColumns}`);
    
    // If we're in the grid, make sure the selected index is still valid
    if (!isInNav && !isInDropdown) {
      uiManager.updateSelectedCard(selectedIndex, isInNav, isInDropdown);
    }
  }
}

/**
 * Initialize the channel list
 */
async function initializeChannelList() {
  const channelList = document.getElementById('channelList');
  if (!channelList) return;
  
  // Log device info
  logDeviceInfo();
  
  // Fetch channels
  channels = await fetchPlaylist('data/channels.m3u');
  filteredChannels = [...channels];
  
  if (channels.length === 0) {
    channelList.innerHTML = '<p>No channels found</p>';
    return;
  }

  // Initialize language filter
  languageFilter = new LanguageFilter(applyLanguageFilter);
  
  // Update UI
  languageFilter.updateLanguageList(
    channels, 
    selectedLanguage, 
    isInDropdown, 
    languageIndex,
    updateLanguageIndex,
    updateNavigation
  );
  
  uiManager.gridColumns = channelGrid.updateChannelGrid(filteredChannels, navigateToChannel);
  uiManager.updateSelectedNavItem(navIndex, isInNav, isInDropdown);
  
  // Add event listeners
  document.addEventListener('keydown', handleNavigation);
  window.addEventListener('resize', handleResize);
  
  // Add focus indicators
  uiManager.addFocusIndicators();
  
  // Set up TV remote handling
  uiManager.setupTVRemoteHandling(handleNavigation);
}

document.addEventListener('DOMContentLoaded', () => {
  const isHomePage = document.querySelector('.home-page') !== null;
  if (isHomePage) {
    initializeChannelList();
  }
});