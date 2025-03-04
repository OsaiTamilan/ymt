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
      
      // For TV remote support, also set focus on the selected card
      try {
        cards[selectedIndex].focus();
      } catch (e) {
        console.error('Error focusing card:', e);
      }
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
      
      // For TV remote support, also set focus on the selected nav item
      try {
        navItems[navIndex].focus();
      } catch (e) {
        console.error('Error focusing nav item:', e);
      }
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
    
    // For TV remote support, also set focus on the selected language item
    if (isInDropdown && index === languageIndex) {
      try {
        item.focus();
      } catch (e) {
        console.error('Error focusing language item:', e);
      }
    }
  });
}

// Handle keyboard navigation
function handleNavigation(event, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList) {
  // Map common TV remote keys to standard keys
  let key = event.key;
  
  // WebOS, Tizen, etc. might use different key codes
  if (event.keyCode === 13) key = 'Enter';
  if (event.keyCode === 37) key = 'ArrowLeft';
  if (event.keyCode === 38) key = 'ArrowUp';
  if (event.keyCode === 39) key = 'ArrowRight';
  if (event.keyCode === 40) key = 'ArrowDown';
  if (event.keyCode === 8 || event.keyCode === 27 || event.keyCode === 461) key = 'Back';
  
  // If video player is open, handle its navigation first
  if (document.getElementById('videoPlayerOverlay') && 
      document.getElementById('videoPlayerOverlay').style.display === 'block') {
    if (key === 'Escape' || key === 'Backspace' || key === 'Back') {
      closeVideoPlayer();
      return;
    }
    
    // Allow video controls to work
    return;
  }
  
  // Handle number input (0-9)
  if (key >= '0' && key <= '9' || 
      (event.keyCode >= 48 && event.keyCode <= 57) || 
      (event.keyCode >= 96 && event.keyCode <= 105)) {
    
    // Convert keyCode to number string if needed
    let numberKey = key;
    if (event.keyCode >= 48 && event.keyCode <= 57) {
      numberKey = String(event.keyCode - 48);
    } else if (event.keyCode >= 96 && event.keyCode <= 105) {
      numberKey = String(event.keyCode - 96);
    }
    
    handleNumberInput(numberKey, channels, (channelIndex) => {
      navigateToChannel(channelIndex);
    });
    return;
  }

  if (isInDropdown) {
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
          // Check if there's a direct link
          const link = navItem.querySelector('a');
          if (link) {
            window.location.href = link.href;
            return;
          }
          
          // Otherwise use the text content
          const action = navItem.querySelector('span:last-child')?.textContent.toLowerCase();
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
      case 'Escape':
      case 'Backspace':
      case 'Back':
        // On the main page, back button should do nothing or exit the app
        break;
    }
  } else {
    const totalChannels = filteredChannels.length + 1; // +1 for Aatral TV card
    const cards = document.querySelectorAll('.channel-card');

    switch(key) {
      case 'ArrowUp':
        if (selectedIndex === 0) {
          isInNav = true;
          updateSelectedNavItem();
          updateSelectedCard();
        } else {
          // Move up one card at a time
          selectedIndex = Math.max(0, selectedIndex - 1);
          updateSelectedCard();
        }
        break;
      case 'ArrowDown':
        // Move down one card at a time
        if (selectedIndex < totalChannels - 1) {
          selectedIndex++;
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
        if (selectedIndex < totalChannels - 1) {
          selectedIndex++;
          updateSelectedCard();
        }
        break;
      case 'Enter':
        const selectedCard = cards[selectedIndex];
        if (selectedCard) {
          // Check if there's a direct link
          const link = selectedCard.querySelector('a');
          if (link) {
            window.location.href = link.href;
            return;
          }
          
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
      case 'Backspace':
      case 'Back':
        isInNav = true;
        updateSelectedNavItem();
        updateSelectedCard();
        break;
    }
  }

  // Ensure the selected card is visible
  const selectedCard = document.querySelector('.channel-card.selected');
  if (selectedCard) {
    selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Setup gamepad support for TV remotes
function setupGamepadSupport(channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList) {
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
        handleNavigation({ key: 'Enter', keyCode: 13 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
        break;
      case 1: // B button (typically back/cancel)
        handleNavigation({ key: 'Back', keyCode: 27 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
        break;
      case 12: // D-pad up
        handleNavigation({ key: 'ArrowUp', keyCode: 38 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
        break;
      case 13: // D-pad down
        handleNavigation({ key: 'ArrowDown', keyCode: 40 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
        break;
      case 14: // D-pad left
        handleNavigation({ key: 'ArrowLeft', keyCode: 37 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
        break;
      case 15: // D-pad right
        handleNavigation({ key: 'ArrowRight', keyCode: 39 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
        break;
    }
  }
  
  function handleGamepadAxis(axisIndex, value) {
    console.log('Gamepad axis changed:', axisIndex, value);
    
    // First two axes are typically left stick
    if (axisIndex === 0 && value < -0.7) handleNavigation({ key: 'ArrowLeft', keyCode: 37 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
    if (axisIndex === 0 && value > 0.7) handleNavigation({ key: 'ArrowRight', keyCode: 39 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
    if (axisIndex === 1 && value < -0.7) handleNavigation({ key: 'ArrowUp', keyCode: 38 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
    if (axisIndex === 1 && value > 0.7) handleNavigation({ key: 'ArrowDown', keyCode: 40 }, channels, filteredChannels, handleNumberInput, navigateToChannel, closeVideoPlayer, selectedLanguage, filterChannels, updateLanguageList);
  }
  
  window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected:', e.gamepad.id);
    checkGamepads();
  });
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
  handleNavigation,
  setupGamepadSupport
};