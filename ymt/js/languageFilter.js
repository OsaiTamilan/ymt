/**
 * Manages the language filter functionality
 */
export class LanguageFilter {
  /**
   * @param {Function} filterCallback - Callback to apply the filter
   */
  constructor(filterCallback) {
    this.filterCallback = filterCallback;
  }

  /**
   * Get dimensions for the language grid
   * @param {Array} channels - Array of channel objects
   * @returns {Object} Grid dimensions
   */
  getLanguageGridDimensions(channels) {
    const languages = new Set(channels.map(channel => channel.language));
    const totalItems = languages.size + 1; // +1 for "All Languages"
    const columns = Math.min(4, totalItems);
    const rows = Math.ceil(totalItems / columns);
    return { columns, rows, totalItems };
  }

  /**
   * Update the language list in the UI
   * @param {Array} channels - Array of channel objects
   * @param {string} selectedLanguage - Currently selected language
   * @param {boolean} isInDropdown - Whether dropdown is open
   * @param {number} languageIndex - Index of the selected language
   * @param {Function} updateSelectedLanguage - Function to update selected language
   * @param {Function} updateSelectedNavItem - Function to update selected nav item
   */
  updateLanguageList(channels, selectedLanguage, isInDropdown, languageIndex, updateSelectedLanguage, updateSelectedNavItem) {
    const languages = new Set(channels.map(channel => channel.language));
    const languageList = document.querySelector('.language-list');
    if (!languageList) return;

    const sortedLanguages = Array.from(languages).sort();
    
    languageList.innerHTML = '';
    
    // Add "All Languages" option
    const allLangItem = document.createElement('div');
    allLangItem.className = `language-item ${!selectedLanguage ? 'selected' : ''}`;
    allLangItem.dataset.language = '';
    allLangItem.setAttribute('tabindex', '0');
    allLangItem.setAttribute('role', 'button');
    allLangItem.innerHTML = `
      <span>All Languages</span>
      <span class="material-icons">check</span>
      <div class="tv-focus-indicator"></div>
    `;
    
    // Add event listeners for "All Languages"
    allLangItem.addEventListener('click', () => {
      this.filterCallback('');
      updateSelectedNavItem();
    });
    
    allLangItem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        this.filterCallback('');
        updateSelectedNavItem();
      }
    });
    
    languageList.appendChild(allLangItem);
    
    // Add each language option
    sortedLanguages.forEach((lang, idx) => {
      const langItem = document.createElement('div');
      langItem.className = `language-item ${selectedLanguage === lang ? 'selected' : ''}`;
      langItem.dataset.language = lang;
      langItem.dataset.index = (idx + 1).toString();
      langItem.setAttribute('tabindex', '0');
      langItem.setAttribute('role', 'button');
      langItem.innerHTML = `
        <span>${lang}</span>
        <span class="material-icons">check</span>
        <div class="tv-focus-indicator"></div>
      `;
      
      // Add event listeners for this language
      langItem.addEventListener('click', () => {
        this.filterCallback(lang);
        updateSelectedNavItem();
      });
      
      langItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          this.filterCallback(lang);
          updateSelectedNavItem();
        }
      });
      
      languageList.appendChild(langItem);
    });

    if (isInDropdown) {
      const newLanguageIndex = selectedLanguage ? 
        sortedLanguages.indexOf(selectedLanguage) + 1 : 0;
      
      if (newLanguageIndex !== languageIndex) {
        updateSelectedLanguage(newLanguageIndex);
      }
    }
  }

  /**
   * Filter channels by language
   * @param {Array} channels - Array of all channel objects
   * @param {string} selectedLanguage - Selected language to filter by
   * @returns {Array} Filtered channels
   */
  filterChannels(channels, selectedLanguage) {
    if (!selectedLanguage) {
      return [...channels];
    } else {
      return channels.filter(channel => channel.language === selectedLanguage);
    }
  }
}