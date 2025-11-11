// Modal management
export function initializeModal() {
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('property-modal').classList.remove('active');
  });

  document.getElementById('property-modal').addEventListener('click', (e) => {
    if (e.target.id === 'property-modal') {
      document.getElementById('property-modal').classList.remove('active');
    }
  });
}