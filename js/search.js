import { amenityIcons } from './config.js';
import { showPropertyModal } from './properties.js';
import { showPage } from './navigation.js';

export let allProperties = [];
export let currentFilter = 'all';
let imageIntervals = {};

export function initializeSearch() {
  document.getElementById('search-button').addEventListener('click', performAdvancedSearch);
  
  const browseBtn = document.getElementById('browse-properties');
  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      showPage('browse');
      loadBrowsePage();
    });
  }
  
  document.getElementById('filters').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-button')) {
      document.querySelectorAll('#filters .filter-button').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      const filter = e.target.dataset.filter;
      currentFilter = filter;
      
      if (filter === 'all') {
        displayProperties(allProperties.slice(0, 6), 'home');
      } else {
        const filtered = allProperties.filter(p => p.type === filter);
        displayProperties(filtered.slice(0, 6), 'home');
      }
    }
  });

  // Browse page filters
  const browseFilters = document.getElementById('browse-filters');
  if (browseFilters) {
    browseFilters.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-button')) {
        document.querySelectorAll('#browse-filters .filter-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        const filter = e.target.dataset.filter;
        currentFilter = filter;
        
        if (filter === 'all') {
          displayProperties(allProperties, 'browse');
        } else {
          const filtered = allProperties.filter(p => p.type === filter);
          displayProperties(filtered, 'browse');
        }
      }
    });
  }
}

export function performAdvancedSearch() {
  const location = document.getElementById('location-filter').value.toLowerCase();
  const type = document.getElementById('type-filter').value;
  const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
  const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;

  const filtered = allProperties.filter(property => {
    const matchesLocation = !location || 
      (property.address || '').toLowerCase().includes(location) ||
      (property.city || '').toLowerCase().includes(location) ||
      (property.barangay || '').toLowerCase().includes(location);
    
    const matchesType = !type || property.type === type;
    
    const price = parseFloat(property.monthly_rent) || 0;
    const matchesPrice = price >= minPrice && price <= maxPrice;
    
    return matchesLocation && matchesType && matchesPrice;
  });

  displayProperties(filtered, 'browse');
}

export function displayProperties(properties, pageType = 'home') {
  const gridId = pageType === 'browse' ? 'browse-properties-grid' : 'properties-grid';
  const grid = document.getElementById(gridId);
  
  if (!grid) return;
  
  if (properties.length === 0) {
    grid.innerHTML = '<p class="loading">No properties found matching your criteria.</p>';
    return;
  }

  grid.innerHTML = properties.map(property => {
    const amenitiesDisplay = property.amenities.slice(0, 3).map(a => {
      const icon = amenityIcons[a.amenity_name] || '✓';
      return `<span class="amenity-tag">${icon} ${a.amenity_name}</span>`;
    }).join('');

    const moreAmenities = property.amenities.length > 3 ? 
      `<span class="amenity-tag">+${property.amenities.length - 3} more</span>` : '';

    const imageUrl = property.images && property.images.length > 0 ? property.images[0].image_url : null;

    return `
      <div class="property-card" data-property-id="${property.property_id}">
        <div class="property-image-carousel" data-property-id="${property.property_id}" data-image-count="${property.images?.length || 0}" style="position: relative; width: 100%; height: 200px; background: #f0f0f0; overflow: hidden; border-radius: 8px 8px 0 0;">
          ${imageUrl 
            ? `<img src="${imageUrl}" alt="Property" class="carousel-img" data-index="0" style="width: 100%; height: 100%; object-fit: cover; display: block;">` 
            : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem;">🏠</div>`}
          ${property.images && property.images.length > 1 ? `<span class="image-count" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">${property.images.length}</span>` : ''}
        </div>
        <div class="property-info">
          <span class="property-type">${property.type || 'Property'}</span>
          <h3 class="property-title">${property.type || 'Property'} in ${property.city || 'City'}</h3>
          <p class="property-location">📍 ${property.address || ''}, ${property.barangay || ''}, ${property.city || ''}</p>
          <div class="property-price">₱${parseFloat(property.monthly_rent || 0).toLocaleString()}/month</div>
          <div class="property-amenities">
            ${amenitiesDisplay}
            ${moreAmenities}
          </div>
          <button class="view-details-btn" data-property-id="${property.property_id}">View Details</button>
        </div>
      </div>
    `;
  }).join('');

  // Setup hover-triggered carousels
  properties.forEach(property => {
    if (property.images && property.images.length > 1) {
      setupHoverCarousel(property.property_id, property.images);
    }
  });

  // Add event listeners to all View Details buttons
  document.querySelectorAll(`#${gridId} .view-details-btn`).forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const propertyId = e.target.dataset.propertyId;
      const property = allProperties.find(p => p.property_id === propertyId);
      if (property) {
        showPropertyModal(property);
      }
    });
  });
}

function setupHoverCarousel(propertyId, images) {
  // Clear existing interval if any
  if (imageIntervals[propertyId]) {
    clearInterval(imageIntervals[propertyId]);
  }

  const carousel = document.querySelector(`[data-property-id="${propertyId}"] .carousel-img`);
  const carouselContainer = document.querySelector(`[data-property-id="${propertyId}"]`);

  if (!carousel || !carouselContainer) return;

  let currentIndex = 0;
  let isHovering = false;

  carouselContainer.addEventListener('mouseenter', () => {
    isHovering = true;
    
    // Clear any existing interval
    if (imageIntervals[propertyId]) {
      clearInterval(imageIntervals[propertyId]);
    }

    // Start carousel on hover
    imageIntervals[propertyId] = setInterval(() => {
      currentIndex = (currentIndex + 1) % images.length;
      carousel.src = images[currentIndex].image_url;
    }, 2000); // 2 second interval
  });

  carouselContainer.addEventListener('mouseleave', () => {
    isHovering = false;
    
    // Stop carousel when hover ends
    if (imageIntervals[propertyId]) {
      clearInterval(imageIntervals[propertyId]);
      imageIntervals[propertyId] = null;
    }

    // Reset to first image
    currentIndex = 0;
    carousel.src = images[0].image_url;
  });
}

export function loadBrowsePage() {
  displayProperties(allProperties, 'browse');
}