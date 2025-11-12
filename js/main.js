// Main entry point - Import and initialize all modules
import { supabase } from './supabase-client.js';
import { initializeAuth } from './auth.js';
import { initializeNavigation, showPage, goBackToDashboard } from './navigation.js';
import { initializeSearch, performAdvancedSearch } from './search.js';
import { initializeModal } from './modal.js';
import { initializeForms } from './forms.js';
import { initializePropertyPosting, initializePostPropertyForm } from './property-posting.js';
import { fetchProperties } from './properties.js';
import { initializeElementSDK, initializeFAQ } from './ui.js';

// Make functions globally accessible
window.showPage = showPage;
window.goBackToDashboard = goBackToDashboard;
window.performAdvancedSearch = performAdvancedSearch;

// Initialize all modules
async function initializeApp() {
  try {
    console.log('Starting app initialization...');
    
    initializeElementSDK();
    initializeAuth();
    initializeNavigation();
    initializeSearch();
    initializeModal();
    initializeForms();
    initializePropertyPosting();
    initializeFAQ();
    initializePostPropertyForm();
    
    console.log('Fetching properties...');
    // Load initial properties
    await fetchProperties();

    // Hamburger mobile menu with CTA button
    const createAccountBtn = document.getElementById('create-account');
    if (createAccountBtn) {
      createAccountBtn.addEventListener('click', () => {
        showPage('register');
      });
    }
    
    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);