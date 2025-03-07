// Navigation state management
let isInNav = true;
let isInDropdown = false;
let navIndex = 0;
let languageIndex = 0;
let selectedIndex = 0;
const COLUMNS = 6;

// Update UI based on navigation state
function updateSelectedCard() {
  document.querySelectorAll('.channel-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  if (!isInNav && !isInDropdown) {
    const cards = document.querySelectorAll('.channel-card');
    if (cards[selectedIndex]) {
      cards[selectedIndex].classList.add('selected');
      
      // Ensure smooth scrolling and proper focus for TV
      try {
        cards[selectedIndex].focus();
        cards[selectedIndex].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      } catch (e) {
        console.error('Error focusing card:', e);
      }
    }
  }
}

function updateSelectedNavItem() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  if (isInNav) {
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems[navIndex]) {
      navItems[navIndex].classList.add('selected');
      
      try {
        navItems[navIndex].focus();
      } catch (e) {
        console.error('Error focusing nav item:', e);
      }
    }
  }
  
  const filterNavItem = document.querySelectorAll('.nav-item')[1];
  if (filterNavItem) {
    filterNavItem.classList.toggle('open', isInDropdown);
  }
}

function updateSelectedLanguage() {
  document.querySelectorAll('.language-item').forEach((item, index) => {
    item.classList.toggle('selected', isInDropdown && index === languageIndex);
    
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
  let key = event.key;
  
  // Map TV remote keys
  if (event.keyCode === 13) key = 'Enter';
  if (event.keyCode === 37) key = 'ArrowLeft';
  if (event.keyCode === 38) key = 'ArrowUp';
  if (event.keyCode === 39) key = 'ArrowRight';
  if (event.keyCode === 40) key = 'ArrowDown';
  if (event.keyCode === 8 || event.keyCode === 27 || event.keyCode === 461) key = 'Back';
  
  // Handle number input
  if (key >= '0' && key <= '9') {
    handleNumberInput(key, channels, (channelIndex) => {
      navigateToChannel(channelIndex);
    });
    return;
  }

  if (isInDropdown) {
    const languageItems = document.querySelectorAll('.language-item');
    const totalLanguages = languageItems.length;

    switch(key) {
      case 'ArrowUp':
        if (languageIndex > 0) {
          languageIndex--;
          updateSelectedLanguage();
        }
        break;
      case 'ArrowDown':
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
        selectedIndex = 0;
        updateSelectedNavItem();
        updateSelectedCard();
        break;
      case 'Enter':
        if (navIndex === 1) {
          isInDropdown = true;
          languageIndex = 0;
          updateSelectedNavItem();
          updateSelectedLanguage();
        } else {
          const navItem = navItems[navIndex];
          const link = navItem.querySelector('a');
          if (link) {
            window.location.href = link.href;
            return;
          }
          
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
          }
        }
        break;
    }
  } else {
    const totalChannels = filteredChannels.length;
    const currentRow = Math.floor(selectedIndex / COLUMNS);
    const currentCol = selectedIndex % COLUMNS;
    const totalRows = Math.ceil(totalChannels / COLUMNS);

    switch(key) {
      case 'ArrowUp':
        if (currentRow === 0) {
          isInNav = true;
          updateSelectedNavItem();
          updateSelectedCard();
        } else {
          const newIndex = selectedIndex - COLUMNS;
          if (newIndex >= 0) {
            selectedIndex = newIndex;
            updateSelectedCard();
          }
        }
        break;
      case 'ArrowDown':
        const newIndex = selectedIndex + COLUMNS;
        if (newIndex < totalChannels) {
          selectedIndex = newIndex;
          updateSelectedCard();
        }
        break;
      case 'ArrowLeft':
        if (currentCol > 0) {
          selectedIndex--;
          updateSelectedCard();
        }
        break;
      case 'ArrowRight':
        if (currentCol < COLUMNS - 1 && selectedIndex < totalChannels - 1) {
          selectedIndex++;
          updateSelectedCard();
        }
        break;
      case 'Enter':
        const selectedChannel = filteredChannels[selectedIndex];
        if (selectedChannel) {
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
  }
}

export {
  isInNav,
  isInDropdown,
  navIndex,
  languageIndex,
  selectedIndex,
  COLUMNS,
  updateSelectedCard,
  updateSelectedNavItem,
  updateSelectedLanguage,
  handleNavigation
};