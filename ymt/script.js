import { handleNumberInput, showNumberInput, hideNumberInput } from './channelInput.js';

async function fetchPlaylist() {
  try {
    const response = await fetch('../ymt/data/channels.m3u');
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
const COLUMNS = 6;

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
    <div class="language-item ${!selectedLanguage ? 'selected' : ''}" data-language="">
      <span>All Languages</span>
      <span class="material-icons">check</span>
    </div>
    ${sortedLanguages.map(lang => `
      <div class="language-item ${selectedLanguage === lang ? 'selected' : ''}" data-language="${lang}">
        <span>${lang}</span>
        <span class="material-icons">check</span>
      </div>
    `).join('')}
  `;

  if (isInDropdown) {
    languageIndex = selectedLanguage ? 
      sortedLanguages.indexOf(selectedLanguage) + 1 : 0;
  }
}

function filterChannels() {
  if (!selectedLanguage) {
    filteredChannels = channels;
  } else {
    filteredChannels = channels.filter(channel => channel.language === selectedLanguage);
  }
  updateChannelGrid();
}

function updateChannelGrid() {
  const channelList = document.getElementById('channelList');
  if (!channelList) return;

  channelList.innerHTML = '';
  
  // Add Aatral TV card first
  const aatralCard = document.createElement('div');
  aatralCard.className = 'channel-card';
  aatralCard.innerHTML = `
    <a href="aatral-tv/aatral-tvMobile.html" style="text-decoration: none; color: inherit;">
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
    </a>
  `;
  channelList.appendChild(aatralCard);
  
  // Add the rest of the channels
  filteredChannels.forEach(channel => {
    channelList.appendChild(createChannelCard(channel));
  });
  
  selectedIndex = 0;
  updateSelectedCard();
}

function createChannelCard(channel) {
  const card = document.createElement('div');
  card.className = 'channel-card';
  card.dataset.channelNo = channel.channelNo;
  
  const content = `
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
    
  card.innerHTML = content;
  return card;
}

function updateSelectedCard() {
  document.querySelectorAll('.channel-card').forEach((card, index) => {
    card.classList.toggle('selected', !isInNav && !isInDropdown && index === selectedIndex);
  });
}

function updateSelectedNavItem() {
  document.querySelectorAll('.nav-item').forEach((item, index) => {
    item.classList.toggle('selected', isInNav && index === navIndex);
    if (index === 1) { // Filter nav item
      item.classList.toggle('open', isInDropdown);
    }
  });
}

function updateSelectedLanguage() {
  const languageItems = document.querySelectorAll('.language-item');
  languageItems.forEach((item, index) => {
    item.classList.toggle('selected', isInDropdown && index === languageIndex);
  });
}

function navigateToChannel(channelIndex) {
  const selectedChannel = channels[channelIndex];
  if (selectedChannel && selectedChannel.channelNo) {
    localStorage.setItem('selectedChannelNo', selectedChannel.channelNo.toString());
    localStorage.setItem('selectedChannelUrl', selectedChannel.url);
    window.location.href = 'player.html';
  }
}

function handleNavigation(event) {
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
          filterChannels();
          isInDropdown = false;
          updateSelectedNavItem();
          updateLanguageList();
        }
        break;
      case 'Escape':
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
          }
        }
        break;
    }
  } else {
    const totalChannels = filteredChannels.length + 1; // +1 for Aatral TV card
    const channelCards = document.querySelectorAll('.channel-card');
    const columns = Math.floor(document.querySelector('.channel-grid').clientWidth / channelCards[0]?.clientWidth) || 4;

    switch(event.key) {
      case 'ArrowUp':
        if (selectedIndex === 0) {
          isInNav = true;
          updateSelectedNavItem();
          updateSelectedCard();
        } else if (selectedIndex >= columns) {
          selectedIndex = Math.max(0, selectedIndex - columns);
          updateSelectedCard();
        }
        break;
      case 'ArrowDown':
        if (selectedIndex + columns < channelCards.length) {
          selectedIndex += columns;
          updateSelectedCard();
        } else {
          selectedIndex = Math.min(channelCards.length - 1, selectedIndex);
        }
        break;
      case 'ArrowLeft':
        if (selectedIndex > 0) {
          selectedIndex--;
          updateSelectedCard();
        }
        break;
      case 'ArrowRight':
        if (selectedIndex < channelCards.length - 1) {
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
  document.addEventListener('keydown', handleNavigation);
}

document.addEventListener('DOMContentLoaded', () => {
  const isHomePage = document.querySelector('.home-page') !== null;
  if (isHomePage) {
    initializeChannelList();
  }
});
