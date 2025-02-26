let navIndex = 0;

function updateSelectedNavItem() {
  document.querySelectorAll('.nav-item').forEach((item, index) => {
    item.classList.toggle('selected', index === navIndex);
  });
}

function handleNavigation(event) {
  const navItems = document.querySelectorAll('.nav-item');
  
  switch(event.key) {
    case 'ArrowUp':
      if (navIndex > 0) {
        navIndex--;
        updateSelectedNavItem();
      }
      break;
    case 'ArrowDown':
      if (navIndex < navItems.length - 1) {
        navIndex++;
        updateSelectedNavItem();
      }
      break;
    case 'Enter':
      const action = navItems[navIndex].querySelector('span:last-child').textContent.toLowerCase();
      switch(action) {
        case 'home':
          window.location.href = 'index.html';
          break;
        case 'language':
          window.location.href = 'player.html';
          break;
        case 'category':
          window.location.href = 'player.html';
          break;
        case 'about':
          window.location.href = 'about.html';
          break;
        case 'settings':
          window.location.href = 'settings.html';
          break;
      }
      break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Set initial selected nav item based on current page
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage === 'about.html') {
    navIndex = 3; // About nav item index
  } else if (currentPage === 'settings.html') {
    navIndex = 4; // Settings nav item index
  }
  
  updateSelectedNavItem();
  document.addEventListener('keydown', handleNavigation);
});