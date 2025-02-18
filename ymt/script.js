async function fetchPlaylist() {
  try {
    const response = await fetch('/data/channels.m3u');
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
const COLUMNS = 4;

function updateSelectedCard() {
  document.querySelectorAll('.channel-card').forEach((card, index) => {
    card.classList.toggle('selected', index === selectedIndex);
  });
}

function handleKeyPress(event) {
  const totalChannels = channels.length;
  const currentRow = Math.floor(selectedIndex / COLUMNS);
  const currentCol = selectedIndex % COLUMNS;
  const totalRows = Math.ceil(totalChannels / COLUMNS);

  switch(event.key) {
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
    case 'ArrowUp':
      if (currentRow > 0) {
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
    case 'Enter':
      const selectedChannel = channels[selectedIndex];
      window.location.href = `player.html`;
      break;
  }

  const selectedCard = document.querySelector('.channel-card.selected');
  if (selectedCard) {
    selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

async function initializeChannelList() {
  const channelList = document.getElementById('channelList');
  channels = await fetchPlaylist();
  
  if (channels.length === 0) {
    channelList.innerHTML = '<p>No channels found</p>';
    return;
  }

  channelList.innerHTML = '';
  channels.forEach(channel => {
    channelList.appendChild(createChannelCard(channel));
  });

  updateSelectedCard();
  document.addEventListener('keydown', handleKeyPress);
}

initializeChannelList();