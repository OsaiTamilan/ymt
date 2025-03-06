// Constants for timing
const AD_DISPLAY_DURATION = 10000; // 10 seconds
const AD_INTERVAL = 30000; // 30 seconds

class AdManager {
  constructor() {
    this.adContainer = document.querySelector('.ad-container');
    if (!this.adContainer) return;

    this.isAdVisible = false;
    this.initialize();
  }

  initialize() {
    // Initial hide
    this.hideAd();
    
    // Start the ad cycle
    this.startAdCycle();
  }

  showAd() {
    if (!this.adContainer) return;
    
    this.adContainer.style.display = 'flex';
    this.isAdVisible = true;

    // Hide after display duration
    setTimeout(() => {
      this.hideAd();
    }, AD_DISPLAY_DURATION);
  }

  hideAd() {
    if (!this.adContainer) return;
    
    this.adContainer.style.display = 'none';
    this.isAdVisible = false;
  }

  startAdCycle() {
    // Show ad immediately
    this.showAd();

    // Set up the interval
    setInterval(() => {
      this.showAd();
    }, AD_INTERVAL);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AdManager();
});