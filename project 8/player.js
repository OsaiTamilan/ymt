let currentChannelIndex = 0;
let channels = [];
let categories = new Set();
let languages = new Set();
let currentSection = 'home';
let currentCategory = '';
let currentLanguage = '';
let activeColumn = 0;
let listsVisible = true;
let numberInput = '';
let numberInputTimeout = null;
let isPlayerPage = false;

async function loadChannels() {
  try {
    const response = await fetch('../project 8/data/channels.m3u');
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
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
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
      
      if (currentChannel.category) categories.add(currentChannel.category);
      if (currentChannel.language) languages.add(currentChannel.language);
      
      currentChannel = null;
    }
  }

  return channels;
}

function showNumberInput() {
  if (!isPlayerPage) return;
  
  let numberDisplay = document.getElementById('numberDisplay');
  if (!numberDisplay) {
    numberDisplay = document.createElement('div');
    numberDisplay.id = 'numberDisplay';
    document.querySelector('.video-section')?.appendChild(numberDisplay);
  }
  numberDisplay.textContent = numberInput;
  numberDisplay.style.display = 'block';
}

function hideNumberInput() {
  const numberDisplay = document.getElementById('numberDisplay');
  if (numberDisplay) {
    numberDisplay.style.display = 'none';
    numberInput = '';
  }
}

function handleNumberInput(number) {
  if (!isPlayerPage) return;
  
  numberInput += number;
  showNumberInput();
  
  clearTimeout(numberInputTimeout);
  numberInputTimeout = setTimeout(() => {
    const channelNumber = parseInt(numberInput);
    const channel = channels.find(ch => ch.channelNo === channelNumber);
    if (channel) {
      const index = channels.indexOf(channel);
      if (index !== -1) {
        loadChannel(index);
      }
    }
    hideNumberInput();
  }, 2000);
}

function toggleListsVisibility(show) {
  if (!isPlayerPage) return;
  
  const mainNav = document.querySelector('.main-nav');
  const categoriesList = document.querySelector('.categories-list');
  const channelListSection = document.querySelector('.channel-list-section');
  const videoSection = document.querySelector('.video-section');
  
  if (!mainNav || !categoriesList || !channelListSection || !videoSection) return;
  
  if (show) {
    mainNav.style.width = '5%';
    categoriesList.style.width = '10%';
    channelListSection.style.width = '15%';
    videoSection.style.width = '70%';
    mainNav.style.display = 'flex';
    categoriesList.style.display = 'block';
    channelListSection.style.display = 'block';
  } else {
    mainNav.style.width = '0';
    categoriesList.style.width = '0';
    channelListSection.style.width = '0';
    videoSection.style.width = '100%';
    mainNav.style.display = 'none';
    categoriesList.style.display = 'none';
    channelListSection.style.display = 'none';
  }
  listsVisible = show;
}

function updateCategoriesList() {
  if (!isPlayerPage) return;
  
  const categoriesList = document.querySelector('.categories-list');
  if (!categoriesList) return;
  
  categoriesList.innerHTML = '';
  
  let items = [];
  if (currentSection === 'category') {
    items = Array.from(categories);
  } else if (currentSection === 'language') {
    items = Array.from(languages);
  }
  
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.dataset.index = index;
    if ((currentSection === 'category' && item === currentCategory) ||
        (currentSection === 'language' && item === currentLanguage)) {
      div.classList.add('selected');
    }
    div.textContent = item;
    categoriesList.appendChild(div);
  });
}

function updateChannelList() {
  if (!isPlayerPage) return;
  
  const channelList = document.getElementById('channelList');
  if (!channelList) return;
  
  channelList.innerHTML = '';
  
  const filteredChannels = channels.filter(channel => {
    if (currentSection === 'category') {
      return channel.category === currentCategory;
    } else if (currentSection === 'language') {
      return channel.language === currentLanguage;
    }
    return true;
  });
  
  filteredChannels.forEach((channel, index) => {
    channelList.appendChild(createChannelElement(channel, index));
  });
}

function createChannelElement(channel, index) {
  const element = document.createElement('div');
  element.className = 'channel-item';
  element.dataset.index = index;
  if (index === currentChannelIndex) element.classList.add('selected');
  
  element.innerHTML = `
    <div class="channel-info">
      ${channel.logo ? `<img src="${channel.logo}" alt="" class="channel-item-logo">` : ''}
      <h3>${channel.channelNo ? `${channel.channelNo} - ` : ''}${channel.title}</h3>
    </div>
  `;
  
  return element;
}

function loadChannel(index) {
  if (!isPlayerPage) return;
  
  const channel = channels[index];
  currentChannelIndex = index;
  
  const video = document.getElementById('videoPlayer');
  if (!video) return;
  
  document.querySelectorAll('.channel-item').forEach((item, i) => {
    item.classList.toggle('selected', i === index);
  });

  if (Hls.isSupported()) {
    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60
    });
    
    hls.loadSource(channel.url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(e => console.log('Playback failed:', e));
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = channel.url;
    video.addEventListener('loadedmetadata', () => {
      video.play().catch(e => console.log('Playback failed:', e));
    });
  }
  
  toggleListsVisibility(false);
}

function changeChannel(direction) {
  if (!isPlayerPage) return;
  
  const newIndex = currentChannelIndex + direction;
  if (newIndex >= 0 && newIndex < channels.length) {
    loadChannel(newIndex);
  }
}

let currentNavIndex = 0;
let currentCategoryIndex = 0;

function updateNavSelection() {
  document.querySelectorAll('.nav-item').forEach((item, index) => {
    item.classList.toggle('selected', index === currentNavIndex);
  });
}

function updateCategorySelection() {
  if (!isPlayerPage) return;
  
  document.querySelectorAll('.category-item').forEach((item, index) => {
    item.classList.toggle('selected', index === currentCategoryIndex);
  });
}

function navigateToPage(page) {
  const video = document.getElementById('videoPlayer');
  
  if (video) {
    video.pause();
    video.src = '';
  }
  
  window.location.href = page;
}

function handleNavigation(event) {
  // Handle number keys (0-9)
  if (event.key >= '0' && event.key <= '9' && isPlayerPage) {
    handleNumberInput(event.key);
    return;
  }

  if (isPlayerPage && !listsVisible) {
    if (event.key === 'ArrowRight') {
      toggleListsVisibility(true);
      return;
    }
    if (event.key === 'ArrowUp') {
      changeChannel(-1);
      return;
    }
    if (event.key === 'ArrowDown') {
      changeChannel(1);
      return;
    }
    return;
  }

  switch(event.key) {
    case 'ArrowUp':
      if (activeColumn === 0 && currentNavIndex > 0) {
        currentNavIndex--;
        updateNavSelection();
      } else if (activeColumn === 1 && currentCategoryIndex > 0) {
        currentCategoryIndex--;
        updateCategorySelection();
      } else if (activeColumn === 2 && currentChannelIndex > 0 && isPlayerPage) {
        currentChannelIndex--;
        document.querySelectorAll('.channel-item').forEach((item, index) => {
          item.classList.toggle('selected', index === currentChannelIndex);
        });
        ensureChannelVisible(currentChannelIndex);
        loadChannel(currentChannelIndex);
      }
      break;

    case 'ArrowDown':
      const maxNav = document.querySelectorAll('.nav-item').length - 1;
      const maxCategory = document.querySelectorAll('.category-item')?.length - 1 || 0;
      const maxChannel = document.querySelectorAll('.channel-item')?.length - 1 || 0;

      if (activeColumn === 0 && currentNavIndex < maxNav) {
        currentNavIndex++;
        updateNavSelection();
      } else if (activeColumn === 1 && currentCategoryIndex < maxCategory) {
        currentCategoryIndex++;
        updateCategorySelection();
      } else if (activeColumn === 2 && currentChannelIndex < maxChannel && isPlayerPage) {
        currentChannelIndex++;
        document.querySelectorAll('.channel-item').forEach((item, index) => {
          item.classList.toggle('selected', index === currentChannelIndex);
        });
        ensureChannelVisible(currentChannelIndex);
        loadChannel(currentChannelIndex);
      }
      break;

    case 'ArrowRight':
      if (activeColumn < 2 && isPlayerPage) {
        activeColumn++;
        updateActiveColumn();
      }
      break;

    case 'ArrowLeft':
      if (activeColumn > 0 && isPlayerPage) {
        activeColumn--;
        updateActiveColumn();
      }
      break;

    case 'Enter':
      if (activeColumn === 0) {
        const navItems = document.querySelectorAll('.nav-item');
        const selectedNav = navItems[currentNavIndex];
        const section = selectedNav.querySelector('span:last-child').textContent.toLowerCase();
        
        if (section === 'home') {
          navigateToPage('index.html');
        } else if (section === 'about') {
          navigateToPage('about.html');
        } else if (section === 'settings') {
          navigateToPage('settings.html');
        } else if (isPlayerPage) {
          currentSection = section;
          currentCategory = '';
          currentLanguage = '';
          updateCategoriesList();
          updateChannelList();
        }
      } else if (activeColumn === 1 && isPlayerPage) {
        const categoryItems = document.querySelectorAll('.category-item');
        const selectedCategory = categoryItems[currentCategoryIndex];
        if (selectedCategory) {
          if (currentSection === 'category') {
            currentCategory = selectedCategory.textContent;
          } else if (currentSection === 'language') {
            currentLanguage = selectedCategory.textContent;
          }
          updateChannelList();
        }
      } else if (activeColumn === 2 && isPlayerPage) {
        loadChannel(currentChannelIndex);
      }
      break;
  }
}

function updateActiveColumn() {
  if (!isPlayerPage) return;
  
  const mainNav = document.querySelector('.main-nav');
  const categoriesList = document.querySelector('.categories-list');
  const channelList = document.querySelector('.channel-list');
  
  if (!mainNav || !categoriesList || !channelList) return;
  
  mainNav.classList.toggle('active', activeColumn === 0);
  categoriesList.classList.toggle('active', activeColumn === 1);
  channelList.classList.toggle('active', activeColumn === 2);
}

function ensureChannelVisible(index) {
  if (!isPlayerPage) return;
  
  const channelItem = document.querySelectorAll('.channel-item')[index];
  if (channelItem) {
    channelItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Check if we're on the player page
  isPlayerPage = document.getElementById('videoPlayer') !== null;
  
  channels = await loadChannels();
  
  if (isPlayerPage) {
    updateCategoriesList();
    updateChannelList();
    updateActiveColumn();
    
    if (channels.length > 0) {
      loadChannel(0);
    }
  }
});

document.addEventListener('keydown', handleNavigation);
