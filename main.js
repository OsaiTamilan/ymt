import './style.css';
import videoData from './data.json';

// Initialize Lucide icons
lucide.createIcons();

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays/30)} months ago`;
  return `${Math.floor(diffDays/365)} years ago`;
}

function formatDuration(duration) {
  if (!duration) return '0:00';
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatViews(views) {
  if (!views) return '0 views';
  if (views >= 1000000) return `${(views/1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views/1000).toFixed(1)}K views`;
  return `${views} views`;
}

// Generate extended video data by repeating the original data
function generateExtendedData(originalData, count) {
  const extended = [];
  for (let i = 0; i < count; i++) {
    const baseVideo = originalData[i % originalData.length];
    extended.push({
      ...baseVideo,
      "Video URL": baseVideo["Video URL"] + `&clone=${i}`,
      "Title": `${baseVideo["Title"]} ${Math.floor(i / originalData.length) + 1}`,
      "View Count": Math.floor(baseVideo["View Count"] * (Math.random() * 0.5 + 0.75))
    });
  }
  return extended;
}

// DOM Elements
const app = document.getElementById('app');
const videoGrid = document.getElementById('videoGrid');
const videoPlayer = document.getElementById('videoPlayer');
const userLocation = document.getElementById('userLocation');

// Set user location after delay
setTimeout(() => {
  userLocation.textContent = 'San Francisco, CA';
}, 1000);

// Extract video ID from URL
function getVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1].split('&')[0] : null;
}

// Create video card
function createVideoCard(video) {
  const videoId = getVideoId(video["Video URL"]);
  if (!videoId) return null;
  
  const card = document.createElement('div');
  card.className = 'video-card';
  
  card.innerHTML = `
    <div class="video-thumbnail">
      <img 
        src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
        alt="${video["Title"]}"
        loading="lazy"
        onerror="this.src='https://img.youtube.com/vi/${videoId}/0.jpg'"
      />
      <div class="overlay">
        <i data-lucide="play" class="play-icon"></i>
      </div>
      <div class="duration">${formatDuration(video["Video Duration"])}</div>
    </div>
    <div class="video-info">
      <div class="video-title">
        <h2>${video["Title"]}</h2>
        <i data-lucide="external-link" class="w-5 h-5 text-gray-400"></i>
      </div>
      <div class="video-metadata">
        <div class="video-stats">
          <span>${video["Channel Title"]}</span>
          <span>${formatViews(video["View Count"])}</span>
        </div>
        <div class="video-date">
          <i data-lucide="clock" class="w-4 h-4"></i>
          <span>${formatDate(video["Video Published at"])}</span>
        </div>
      </div>
    </div>
  `;

  card.addEventListener('click', () => showVideo(video));
  return card;
}

// Create suggested video card
function createSuggestedVideoCard(video) {
  const videoId = getVideoId(video["Video URL"]);
  if (!videoId) return null;
  
  const card = document.createElement('div');
  card.className = 'suggested-video-card';
  
  card.innerHTML = `
    <div class="video-thumbnail">
      <img 
        src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
        alt="${video["Title"]}"
        loading="lazy"
        onerror="this.src='https://img.youtube.com/vi/${videoId}/0.jpg'"
      />
      <div class="duration">${formatDuration(video["Video Duration"])}</div>
    </div>
    <div class="video-info">
      <h3>${video["Title"]}</h3>
      <div class="video-metadata">
        <span>${video["Channel Title"]}</span>
        <span>${formatViews(video["View Count"])}</span>
      </div>
    </div>
  `;

  // Update click handler to properly show the video
  card.addEventListener('click', () => {
    const iframe = document.querySelector('.video-frame iframe');
    if (iframe) {
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
      
      // Update video details
      const container = document.querySelector('.video-container');
      if (container) {
        container.querySelector('h1').textContent = video["Title"];
        container.querySelector('.channel-info span:first-child').textContent = video["Channel Title"];
        container.querySelector('.channel-info span:last-child').textContent = formatViews(video["View Count"]);
        container.querySelector('.publish-date span').textContent = formatDate(video["Video Published at"]);
        
        const descriptionContainer = container.querySelector('.video-description');
        if (descriptionContainer) {
          descriptionContainer.textContent = video["Description"] || 'No description available.';
          descriptionContainer.classList.remove('expanded');
        }
        
        const readMoreButton = container.querySelector('.read-more-button');
        if (readMoreButton) {
          readMoreButton.textContent = 'Read More';
        }
      }
    }
    
    // Refresh icons
    setTimeout(() => lucide.createIcons(), 100);
    
    // Scroll to top
    videoPlayer.scrollTo(0, 0);
  });
  
  return card;
}

// Show video player
function showVideo(video) {
  const videoId = getVideoId(video["Video URL"]);
  if (!videoId) return;
  
  // Filter out current video from suggestions
  const suggestedVideos = extendedVideoData
    .filter(v => getVideoId(v["Video URL"]) !== videoId)
    .slice(0, 5);
  
  videoPlayer.innerHTML = `
    <div class="video-player-container">
      <header>
        <div class="container">
          <button 
            class="back-button"
            onclick="closeVideoPlayer()"
          >
            <i data-lucide="arrow-left"></i>
            Back to videos
          </button>
        </div>
      </header>

      <div class="video-content">
        <div class="video-container">
          <div class="video-frame">
            <iframe
              src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1"
              title="${video["Title"]}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
          
          <h1>${video["Title"]}</h1>
          
          <div class="video-details">
            <div class="channel-info">
              <span>${video["Channel Title"]}</span>
              <span>${formatViews(video["View Count"])}</span>
            </div>
            <div class="publish-date">
              <i data-lucide="clock"></i>
              <span>${formatDate(video["Video Published at"])}</span>
            </div>
          </div>
          
          <div>
            <p class="video-description">${video["Description"] || 'No description available.'}</p>
            <button class="read-more-button" onclick="toggleDescription(this)">Read More</button>
          </div>
        </div>

        <div class="suggested-videos">
          <h2>Suggested Videos</h2>
          <div class="suggested-video-grid">
            ${suggestedVideos.map(v => {
              const card = createSuggestedVideoCard(v);
              return card ? card.outerHTML : '';
            }).join('')}
          </div>
          <button id="showMoreSuggestions" class="show-more-button">
            Show More Suggestions
          </button>
        </div>
      </div>
    </div>
  `;

  videoPlayer.classList.remove('hidden');
  lucide.createIcons();

  // Add event listener for "Show More Suggestions" button
  const showMoreSuggestions = document.getElementById('showMoreSuggestions');
  let suggestedCount = 10;
  
  showMoreSuggestions.addEventListener('click', () => {
    const nextSuggestions = extendedVideoData
      .filter(v => getVideoId(v["Video URL"]) !== videoId)
      .slice(suggestedCount, suggestedCount + 10);
      
    const suggestedGrid = document.querySelector('.suggested-video-grid');
    nextSuggestions.forEach(v => {
      const card = createSuggestedVideoCard(v);
      if (card) suggestedGrid.appendChild(card);
    });
    
    suggestedCount += 10;
    if (suggestedCount >= extendedVideoData.length - 1) {
      showMoreSuggestions.style.display = 'none';
    }
    
    lucide.createIcons();
  });
}

// Close video player
function closeVideoPlayer() {
  const videoPlayer = document.getElementById('videoPlayer');
  if (videoPlayer) {
    videoPlayer.classList.add('hidden');
    // Clear the iframe to stop video playback
    const iframe = videoPlayer.querySelector('iframe');
    if (iframe) iframe.src = '';
  }
}

// Add toggleDescription function
function toggleDescription(button) {
  const description = button.previousElementSibling;
  description.classList.toggle('expanded');
  button.textContent = description.classList.contains('expanded') ? 'Show Less' : 'Read More';
}

// Add closeVideoPlayer and toggleDescription to window for the onclick handlers
window.closeVideoPlayer = closeVideoPlayer;
window.toggleDescription = toggleDescription;

// Generate extended video data
const extendedVideoData = generateExtendedData(videoData, 40);
let visibleVideos = 20; // Initial number of visible videos

// Function to render videos
function renderVideos() {
  const fragment = document.createDocumentFragment();
  
  extendedVideoData.slice(0, visibleVideos).forEach(video => {
    const card = createVideoCard(video);
    if (card) fragment.appendChild(card);
  });
  
  // Only clear if this is the first render
  if (visibleVideos === 20) {
    videoGrid.innerHTML = '';
  }
  videoGrid.appendChild(fragment);
  lucide.createIcons();
  
  // Update or remove "Show More" button
  const existingButton = document.getElementById('showMoreButton');
  if (existingButton) {
    existingButton.remove();
  }
  
  if (visibleVideos < extendedVideoData.length) {
    const showMoreButton = document.createElement('button');
    showMoreButton.id = 'showMoreButton';
    showMoreButton.textContent = 'Show More';
    showMoreButton.onclick = () => {
      visibleVideos += 20;
      renderVideos();
    };
    videoGrid.parentElement.appendChild(showMoreButton);
  }
}

// Initial render
renderVideos();