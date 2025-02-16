async function fetchPlaylist() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/FunctionError/PiratesTv/main/combined_playlist.m3u');
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
      if (titleMatch) {
        currentChannel = {
          title: titleMatch[1].trim(),
          logo: logoMatch ? logoMatch[1] : '',
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
  
  const content = channel.logo 
    ? `<img src="${channel.logo}" alt="${channel.title}" class="channel-logo">
       <h2>${channel.title}</h2>`
    : `<h2>${channel.title}</h2>`;
    
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
      const params = new URLSearchParams();
      params.set('title', selectedChannel.title);
      params.set('url', selectedChannel.url);
      window.location.href = `player.html?${params.toString()}`;
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