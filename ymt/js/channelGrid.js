import { UIManager } from './uiManager.js';

/**
 * Manages the channel grid and card creation
 */
export class ChannelGrid {
  /**
   * @param {UIManager} uiManager - The UI manager instance
   */
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  /**
   * Create a channel card element
   * @param {Object} channel - Channel data
   * @param {number} index - Index of the channel
   * @param {Function} navigateCallback - Callback for navigation
   * @returns {HTMLElement} The created card element
   */
  createChannelCard(channel, index, navigateCallback) {
    const card = document.createElement('div');
    card.className = 'channel-card';
    card.dataset.channelNo = channel.channelNo;
    card.dataset.index = index.toString();
    card.setAttribute('tabindex', '0'); // Make focusable for TV remotes
    card.setAttribute('role', 'button');
    
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
      </div>
      <div class="tv-focus-indicator"></div>`;
    
    // Add click event
    card.addEventListener('click', () => {
      navigateCallback(index - 1); // Adjust for Aatral TV card
    });
    
    // Add keyboard event
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        navigateCallback(index - 1); // Adjust for Aatral TV card
      }
    });
    
    return card;
  }

  /**
   * Create the Aatral TV card
   * @returns {HTMLElement} The Aatral TV card element
   */
  createAatralTVCard() {
    const aatralCard = document.createElement('div');
    aatralCard.className = 'channel-card';
    aatralCard.dataset.index = '0';
    aatralCard.setAttribute('tabindex', '0'); // Make focusable for TV remotes
    aatralCard.setAttribute('role', 'button');
    aatralCard.innerHTML = `
      <div class="channel-logo-container">
        <img src="aatral-tv/data/aatral.png" alt="Aatral TV" class="channel-logo">
      </div>
      <div class="channel-info">
        <h3>Aatral TV</h3>
        <div class="channel-meta">
          <span class="channel-category">Entrt.</span>
          <span class="channel-language">Tamil</span>
        </div>
      </div>
      <div class="tv-focus-indicator"></div>
    `;
    
    // Add click event for Aatral TV
    aatralCard.addEventListener('click', () => {
      window.location.href = 'aatral-tv/aatral-tv.html';
    });
    
    // Add keyboard event for Aatral TV
    aatralCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        window.location.href = 'aatral-tv/aatral-tv.html';
      }
    });
    
    return aatralCard;
  }

  /**
   * Update the channel grid with filtered channels
   * @param {Array} filteredChannels - Array of filtered channel objects
   * @param {Function} navigateCallback - Callback for navigation
   * @returns {number} The number of columns in the grid
   */
  updateChannelGrid(filteredChannels, navigateCallback) {
    const channelList = document.getElementById('channelList');
    if (!channelList) return this.uiManager.gridColumns;

    channelList.innerHTML = '';
    
    // Add Aatral TV card first
    const aatralCard = this.createAatralTVCard();
    channelList.appendChild(aatralCard);
    
    // Add the rest of the channels
    filteredChannels.forEach((channel, index) => {
      const card = this.createChannelCard(channel, index + 1, navigateCallback); // +1 because Aatral TV is index 0
      channelList.appendChild(card);
    });
    
    // Calculate grid columns based on container width
    this.uiManager.gridColumns = this.uiManager.calculateGridColumns();
    console.log(`Grid columns: ${this.uiManager.gridColumns}`);
    
    return this.uiManager.gridColumns;
  }
}