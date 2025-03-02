let navIndex = 0;
let navHideTimeout = null;

function updateSelectedNavItem() {
  document.querySelectorAll('.nav-item').forEach((item, index) => {
    item.classList.toggle('selected', index === navIndex);
  });
}

function showNavBar() {
  const mainNav = document.querySelector('.main-nav');
  if (mainNav) {
    mainNav.classList.add('visible');
    resetNavHideTimer();
  }
}

function hideNavBar() {
  const mainNav = document.querySelector('.main-nav');
  if (mainNav) {
    mainNav.classList.remove('visible');
  }
}

function resetNavHideTimer() {
  if (navHideTimeout) {
    clearTimeout(navHideTimeout);
  }
  navHideTimeout = setTimeout(() => {
    hideNavBar();
  }, 3000); // 3 seconds
}

function handleNavigation(event) {
  const navItems = document.querySelectorAll('.nav-item');
  
  // Handle gamepad back button (usually button 1)
  if (event.gamepad) {
    const gamepad = event.gamepad;
    if (gamepad.buttons[1].pressed) { // Back button
      hideNavBar();
      return;
    }
  }
  
  switch(event.key) {
    case 'ArrowRight':
      if (!document.querySelector('.main-nav').classList.contains('visible')) {
        showNavBar();
      }
      break;
      
    case 'ArrowLeft':
      hideNavBar();
      break;
      
    case 'ArrowUp':
      if (navIndex > 0) {
        navIndex--;
        updateSelectedNavItem();
        resetNavHideTimer();
      }
      break;
      
    case 'ArrowDown':
      if (navIndex < navItems.length - 1) {
        navIndex++;
        updateSelectedNavItem();
        resetNavHideTimer();
      }
      break;
      
    case 'Enter':
      resetNavHideTimer();
      const action = navItems[navIndex].querySelector('span:last-child').textContent.toLowerCase();
      switch(action) {
        case 'home':
          window.location.href = '../../ymt/index.html';
          break;
        case 'language':
          window.location.href = '../../ymt/player.html';
          break;
        case 'category':
          window.location.href = '../../ymt/player.html';
          break;
        case 'about':
          window.location.href = '../../ymt/about.html';
          break;
        case 'settings':
          window.location.href = '../../ymt/settings.html';
          break;
      }
      break;
  }
}

// Handle gamepad input
function handleGamepadInput() {
  const gamepads = navigator.getGamepads();
  for (const gamepad of gamepads) {
    if (gamepad) {
      // D-pad inputs
      if (gamepad.buttons[12].pressed) { // Up
        handleNavigation({ key: 'ArrowUp', gamepad });
      }
      if (gamepad.buttons[13].pressed) { // Down
        handleNavigation({ key: 'ArrowDown', gamepad });
      }
      if (gamepad.buttons[14].pressed) { // Left
        handleNavigation({ key: 'ArrowLeft', gamepad });
      }
      if (gamepad.buttons[15].pressed) { // Right
        handleNavigation({ key: 'ArrowRight', gamepad });
      }
      if (gamepad.buttons[0].pressed) { // A button (Enter)
        handleNavigation({ key: 'Enter', gamepad });
      }
    }
  }
  requestAnimationFrame(handleGamepadInput);
}

document.addEventListener('DOMContentLoaded', () => {
  // Set initial selected nav item based on current page
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage === 'aatral-tv.html') {
    navIndex = 0; // Home nav item index
  }
  
  updateSelectedNavItem();
  document.addEventListener('keydown', handleNavigation);
  
  // Start gamepad input handling
  window.addEventListener('gamepadconnected', () => {
    handleGamepadInput();
  });
  
  // Add mousemove listener to show nav on mouse movement
  document.addEventListener('mousemove', () => {
    if (document.querySelector('.main-nav').classList.contains('visible')) {
      resetNavHideTimer();
    }
  });
});
