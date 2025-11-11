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
function initializeApp() {
  initializeElementSDK();
  initializeAuth();
  initializeNavigation();
  initializeSearch();
  initializeModal();
  initializeForms();
  initializePropertyPosting();
  initializeFAQ();
  initializePostPropertyForm();
  
  // Load initial properties
  fetchProperties();

  // Hamburger mobile menu with CTA button
  document.getElementById('create-account').addEventListener('click', () => {
    showPage('register');
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);