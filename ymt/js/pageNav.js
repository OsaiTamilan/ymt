// Simple navigation script for about and settings pages
document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item');
  let selectedIndex = 0;

  // Find the initially selected item
  navItems.forEach((item, index) => {
    if (item.classList.contains('selected')) {
      selectedIndex = index;
    }
  });

  // Function to update the selected nav item
  function updateSelectedNav() {
    navItems.forEach((item, index) => {
      item.classList.remove('selected');
      if (index === selectedIndex) {
        item.classList.add('selected');
      }
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      selectedIndex = (selectedIndex + 1) % navItems.length;
      updateSelectedNav();
    } else if (event.key === 'ArrowUp') {
      selectedIndex = (selectedIndex - 1 + navItems.length) % navItems.length;
      updateSelectedNav();
    } else if (event.key === 'Enter') {
      // Handle navigation based on selected item
      const selectedItem = navItems[selectedIndex].querySelector('span:last-child').textContent.toLowerCase();
      
      switch (selectedItem) {
        case 'home':
          window.location.href = 'index.html';
          break;
        case 'language':
        case 'category':
          window.location.href = 'player.html';
          break;
        case 'about':
          window.location.href = 'about.html';
          break;
        case 'settings':
          window.location.href = 'settings.html';
          break;
        case 'aatral tv':
          window.location.href = 'aatral-tv/aatral-tv.html';
          break;
      }
    }
  });
});