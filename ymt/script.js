async function fetchPlaylist() {
  try {
    const response = await fetch('../ymt/data/channels.m3u');
    const data = await response.text();
    return parseM3U(data);
  } catch (error) {
    console.error('Error fetching playlist:', error);
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

let selectedIndex = 0;
let channels = [];
let filteredChannels = [];
let navIndex = 0;
let isInNav = true;
let isInDropdown = false;
let languageIndex = 0;
let selectedLanguage = '';
const COLUMNS = 4;

function updateLanguageList() {
  const languages = new Set(channels.map(channel => channel.language));
  const languageList = document.querySelector('.language-list');
  if (!languageList) return;

  languageList.innerHTML = `
    <div class="language-item ${!selectedLanguage ? 'selected' : ''}" data-language="">
      <span>All Languages</span>
      <span class="material-icons">check</span>
    </div>
    ${Array.from(languages).map(lang => `
      <div class="language-item ${selectedLanguage === lang ? 'selected' : ''}" data-language="${lang}">
        <span>${lang}</span>
        <span class="material-icons">check</span>
      </div>
    `).join('')}
  `;
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
  filteredChannels.forEach(channel => {
    channelList.appendChild(createChannelCard(channel));
  });
  selectedIndex = 0;
  updateSelectedCard();
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
  document.querySelectorAll('.language-item').forEach((item, index) => {
    item.classList.toggle('selected', isInDropdown && index === languageIndex);
  });
}

function handleNavigation(event) {
  if (isInDropdown) {
    const languageItems = document.querySelectorAll('.language-item');
    switch(event.key) {
      case 'ArrowUp':
        if (languageIndex > 0) {
          languageIndex--;
          updateSelectedLanguage();
        }
        break;
      case 'ArrowDown':
        if (languageIndex < languageItems.length - 1) {
          languageIndex++;
          updateSelectedLanguage();
        }
        break;
      case 'Enter':
        const selectedItem = languageItems[languageIndex];
        selectedLanguage = selectedItem.dataset.language;
        filterChannels();
        isInDropdown = false;
        updateSelectedNavItem();
        updateSelectedLanguage();
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
        if (navIndex === 1) { // Filter nav item
          isInDropdown = true;
          languageIndex = 0;
          updateSelectedNavItem();
          updateSelectedLanguage();
        } else {
          isInNav = false;
          updateSelectedNavItem();
          updateSelectedCard();
        }
        break;
      case 'Enter':
        if (navIndex === 1) { // Filter nav item
          isInDropdown = true;
          languageIndex = 0;
          updateSelectedNavItem();
          updateSelectedLanguage();
        } else {
          const selectedNav = navItems[navIndex];
          const action = selectedNav.querySelector('span:last-child').textContent.toLowerCase();
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

    switch(event.key) {
      case 'ArrowUp':
        if (currentRow === 0) {
          isInNav = true;
          updateSelectedNavItem();
          updateSelectedCard();
        } else if (selectedIndex >= COLUMNS) {
          selectedIndex -= COLUMNS;
          updateSelectedCard();
        }
        break;
      case 'ArrowDown':
        if (currentRow < totalRows - 1 && selectedIndex + COLUMNS < totalChannels) {
          selectedIndex += COLUMNS;
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
        if (selectedChannel && selectedChannel.channelNo) {
          localStorage.setItem('selectedChannelNo', selectedChannel.channelNo.toString());
          localStorage.setItem('selectedChannelUrl', selectedChannel.url);
          window.location.href = 'player.html';
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
