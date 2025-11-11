// Navigation and page management
export function showPage(pageId) {
  document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
  document.getElementById(pageId + '-page').classList.add('active');
}

export function initializeNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.target.dataset.page;
      showPage(page);
      
      const navMenu = document.getElementById('nav-menu');
      const hamburger = document.getElementById('hamburger');
      navMenu.classList.remove('active');
      hamburger.classList.remove('active');
    });
  });

  // Hamburger menu functionality
  document.getElementById('hamburger').addEventListener('click', () => {
    const navMenu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('hamburger');
    
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
  });

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    const navMenu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('hamburger');
    
    if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
      navMenu.classList.remove('active');
      hamburger.classList.remove('active');
    }
  });
}

export async function goBackToDashboard() {
  const { currentUser } = await import('./auth.js');
  if (!currentUser) {
    showPage('home');
    return;
  }
  
  if (currentUser.role === 'Admin') {
    showPage('admin-dashboard');
  } else if (currentUser.role === 'Landlord') {
    showPage('landlord-dashboard');
  } else {
    showPage('tenant-dashboard');
  }
}