import { isSmartTV } from './tvDetection.js';

/**
 * UI Manager for handling UI updates and interactions
 */
export class UIManager {
  constructor() {
    this.gridColumns = 4;
    this.lastKeyTime = 0;
    this.lastKey = '';
    this.keyRepeatDelay = 300;
  }

  /**
   * Calculate the number of columns for the channel grid
   * @returns {number} Number of columns
   */
  calculateGridColumns() {
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

  /**
   * Update the selected card in the UI
   * @param {number} selectedIndex - Index of the selected card
   * @param {boolean} isInNav - Whether navigation is in the nav bar
   * @param {boolean} isInDropdown - Whether navigation is in the dropdown
   */
  updateSelectedCard(selectedIndex, isInNav, isInDropdown) {
    document.querySelectorAll('.channel-card').forEach((card) => {
      const cardIndex = parseInt(card.dataset.index || '0');
      const isSelected = !isInNav && !isInDropdown && cardIndex === selectedIndex;
      
      card.classList.toggle('selected', isSelected);
      card.classList.toggle('tv-focused', isSelected);
      
      // For Smart TVs, also update focus
      if (isSelected) {
        setTimeout(() => {
          card.focus();
        }, 50);
      }
    });
  }

  /**
   * Update the selected nav item in the UI
   * @param {number} navIndex - Index of the selected nav item
   * @param {boolean} isInNav - Whether navigation is in the nav bar
   * @param {boolean} isInDropdown - Whether dropdown is open
   */
  updateSelectedNavItem(navIndex, isInNav, isInDropdown) {
    document.querySelectorAll('.nav-item').forEach((item, index) => {
      const isSelected = isInNav && index === navIndex;
      
      item.classList.toggle('selected', isSelected);
      item.classList.toggle('tv-focused', isSelected);
      
      if (index === 1) { // Filter nav item
        item.classList.toggle('open', isInDropdown);
      }
      
      // For Smart TVs, also update focus
      if (isSelected) {
        setTimeout(() => {
          item.focus();
        }, 50);
      }
    });
  }

  /**
   * Update the selected language in the dropdown
   * @param {number} languageIndex - Index of the selected language
   * @param {boolean} isInDropdown - Whether dropdown is open
   */
  updateSelectedLanguage(languageIndex, isInDropdown) {
    const languageItems = document.querySelectorAll('.language-item');
    languageItems.forEach((item, index) => {
      const isSelected = isInDropdown && index === languageIndex;
      
      item.classList.toggle('selected', isSelected);
      item.classList.toggle('tv-focused', isSelected);
      
      // For Smart TVs, also update focus
      if (isSelected) {
        setTimeout(() => {
          item.focus();
        }, 50);
      }
    });
  }

  /**
   * Add focus indicators to navigation items
   */
  addFocusIndicators() {
    document.querySelectorAll('.nav-item').forEach(item => {
      if (!item.querySelector('.tv-focus-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'tv-focus-indicator';
        item.appendChild(indicator);
      }
    });
  }

  /**
   * Check if a key event should be processed (prevents key repeat)
   * @param {string} key - The key that was pressed
   * @returns {boolean} Whether the key event should be processed
   */
  shouldProcessKey(key) {
    const now = Date.now();
    if (this.lastKey === key && now - this.lastKeyTime < this.keyRepeatDelay) {
      return false;
    }
    this.lastKey = key;
    this.lastKeyTime = now;
    return true;
  }

  /**
   * Ensure the selected card is visible in the viewport
   * @param {Element} selectedCard - The selected card element
   */
  ensureCardVisible(selectedCard) {
    if (selectedCard) {
      selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Set up special handling for TV remote controls
   * @param {Function} handleNavigation - The navigation handler function
   */
  setupTVRemoteHandling(handleNavigation) {
    if (!isSmartTV()) return;
    
    console.log('Smart TV detected, adding special remote control handling');
    
    // Add special handling for TV remote control events
    document.addEventListener('keypress', (e) => {
      console.log('Keypress event:', e.key, e.keyCode);
      
      // Map common Smart TV remote control keys to standard keys
      let key = e.key;
      
      // WebOS, Tizen, etc. might use different key codes
      if (e.keyCode === 13 || e.keyCode === 32) key = 'Enter';
      if (e.keyCode === 37) key = 'ArrowLeft';
      if (e.keyCode === 38) key = 'ArrowUp';
      if (e.keyCode === 39) key = 'ArrowRight';
      if (e.keyCode === 40) key = 'ArrowDown';
      if (e.keyCode === 8 || e.keyCode === 27 || e.keyCode === 461) key = 'Back';
      
      if (key !== e.key) {
        handleNavigation({ key });
      }
    });
  }
}