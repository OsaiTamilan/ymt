// Function to fetch and parse the My Channels playlist
async function fetchMyChannels() {
  try {
    const response = await fetch('./data/myChannels.m3u');
    const data = await response.text();
    return parseM3U(data);
  } catch (error) {
    console.error('Error loading my channels playlist:', error);
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

function createChannelCard(channel, index) {
  const card = document.createElement('div');
  card.className = 'channel-card';
  card.setAttribute('tabindex', '0');
  card.dataset.index = index;
  
  const content = `
    <a href="${channel.url}" style="text-decoration: none; color: inherit; display: block; height: 100%;">
      <div class="channel-logo-container">
        <img src="${channel.logo}" alt="${channel.title}" class="channel-logo">
      </div>
      <div class="channel-info">
        <h3>${channel.channelNo ? `${channel.channelNo} - ` : ''}${channel.title}</h3>
        <div class="channel-meta">
          <span class="channel-category">${channel.category}</span>
          <span class="channel-language">${channel.language}</span>
        </div>
      </div>
    </a>`;
    
  card.innerHTML = content;
  return card;
}

function updateMyChannelsGrid(channels) {
  const container = document.getElementById('myChannelList');
  if (!container) return;

  container.innerHTML = '';
  
  if (channels.length === 0) {
    container.innerHTML = '<div class="loading">No channels found</div>';
    return;
  }
  
  channels.forEach((channel, index) => {
    container.appendChild(createChannelCard(channel, index));
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const myChannels = await fetchMyChannels();
  updateMyChannelsGrid(myChannels);
});
