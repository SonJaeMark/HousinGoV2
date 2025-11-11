// UI utilities
import { defaultConfig } from './config.js';

export function showInlineMessage(message, type = 'success') {
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    ${type === 'success' ? 'background-color: #d4edda; color: #155724;' : 'background-color: #f8d7da; color: #721c24;'}
  `;
  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);
  setTimeout(() => messageDiv.remove(), 3000);
}

export function onConfigChange(config) {
  document.getElementById('site-name').textContent = config.site_name || defaultConfig.site_name;
  document.getElementById('hero-title').textContent = config.site_name || defaultConfig.site_name;
  document.getElementById('tagline').textContent = config.tagline || defaultConfig.tagline;
  document.getElementById('footer-text').textContent = config.footer_text || defaultConfig.footer_text;
  document.getElementById('contact-email').textContent = config.contact_email || defaultConfig.contact_email;
}

export function mapToCapabilities(config) {
  return {
    recolorables: [],
    borderables: [],
    fontEditable: undefined,
    fontSizeable: undefined
  };
}

export function mapToEditPanelValues(config) {
  return new Map([
    ['site_name', config.site_name || defaultConfig.site_name],
    ['tagline', config.tagline || defaultConfig.tagline],
    ['footer_text', config.footer_text || defaultConfig.footer_text],
    ['contact_email', config.contact_email || defaultConfig.contact_email]
  ]);
}

export function initializeElementSDK() {
  if (window.elementSdk) {
    window.elementSdk.init({
      defaultConfig,
      onConfigChange,
      mapToCapabilities,
      mapToEditPanelValues
    });
  }
}

export function initializeFAQ() {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('faq-question')) {
      const answer = e.target.nextElementSibling;
      const isActive = answer.classList.contains('active');
      
      document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('active'));
      
      if (!isActive) {
        answer.classList.add('active');
      }
    }
  });
}