// Navigation state management
let navIndex = 0;
let isInNav = true;
let isInDropdown = false;
let languageIndex = 0;
let selectedIndex = 0;
const COLUMNS = 6;

// Update UI based on navigation state
function updateSelectedCard() {
  // First, remove 'selected' class from all cards
  document.querySelectorAll('.channel-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  // Then, add 'selected' class only to the currently selected card
  if (!isInNav && !isInDropdown) {
    const cards = document.querySelectorAll('.channel-card');
    if (cards[selectedIndex]) {
      cards[selectedIndex].classList.add('selected');
    }
  }
}

function updateSelectedNavItem() {
  // First, remove 'selected' class from all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  // Then, add 'selected' class only to the currently selected nav item
  if (isInNav) {
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems[navIndex]) {
      navItems[navIndex].classList.add('selected');
    }
  }
  
  // Handle dropdown separately
  const filterNavItem = document.querySelectorAll('.nav-item')[1]; // Filter nav item
  if (filterNavItem) {
    filterNavItem.classList.toggle('open', isInDropdown);
  }
}

function updateSelectedLanguage() {
  const languageItems = document.querySelectorAll('.language-item');
  languageItems.forEach((item, index) => {
    item.classList.toggle('selected', isInDropdown && index === languageIndex);
  });
}

// Handle keyboard navigation
function handleNavigation(event, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList) {
  // If video player is open, handle its navigation first
  if (document.getElementById('videoPlayerOverlay').style.display === 'block') {
    if (event.key === 'Escape' || event.key === 'Backspace' || event.key === 'Back') {
      closeVideoPlayer();
      return;
    }
    
    // Allow video controls to work
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
    const languageItems = document.querySelectorAll('.language-item');
    const totalLanguages = languageItems.length;

    switch(event.key) {
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
          filterChannels(selectedLanguage);
          isInDropdown = false;
          updateSelectedNavItem();
          updateLanguageList(selectedLanguage);
        }
        break;
      case 'Escape':
      case 'Backspace':
      case 'Back':
        isInDropdown = false;
        updateSelectedNavItem();
        break;
    }
  } else if (isInNav) {
    const navItems = document.querySelectorAll('.nav-item');
    switch(event.key) {
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
            case 'watch aatral tv':
              window.location.href = 'aatral-tv/aatral-tv.html';
              break;
          }
        }
        break;
    }
  } else {
    const totalChannels = filteredChannels.length + 1; // +1 for Aatral TV card

    switch(event.key) {
      case 'ArrowUp':
        if (selectedIndex === 0) {
          isInNav = true;
          updateSelectedNavItem();
          updateSelectedCard();
        } else {
          selectedIndex = Math.max(0, selectedIndex - COLUMNS);
          updateSelectedCard();
        }
        break;
      case 'ArrowDown':
        selectedIndex = Math.min(totalChannels - 1, selectedIndex + COLUMNS);
        updateSelectedCard();
        break;
      case 'ArrowLeft':
        if (selectedIndex > 0) {
          selectedIndex--;
          updateSelectedCard();
        }
        break;
      case 'ArrowRight':
        if (selectedIndex < totalChannels - 1) {
          selectedIndex++;
          updateSelectedCard();
        }
        break;
      case 'Enter':
        const selectedCard = document.querySelectorAll('.channel-card')[selectedIndex];
        if (selectedIndex === 0) {
          // Aatral TV card
          window.location.href = 'aatral-tv/aatral-tv.html';
        } else {
          const channelIndex = selectedIndex - 1; // Adjust for Aatral TV card
          navigateToChannel(channelIndex);
        }
        break;
    }
  }

  const selectedCard = document.querySelector('.channel-card.selected');
  if (selectedCard) {
    selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Export navigation functions
export {
  navIndex,
  isInNav,
  isInDropdown,
  languageIndex,
  selectedIndex,
  COLUMNS,
  updateSelectedCard,
  updateSelectedNavItem,
  updateSelectedLanguage,
  handleNavigation
};