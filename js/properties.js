// Property management and fetching
import { supabase } from './supabase-client.js';
import { allProperties, displayProperties } from './search.js';
import { amenityIcons } from './config.js';
import { showInlineMessage } from './ui.js';
import { getCurrentUser } from './auth.js';

// load available properties to the grid (homepage)
async function loadAvailablePropertiesToGrid() {
  const grid = document.getElementById('properties-grid') || document.querySelector('.properties-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading properties...</div>';

  const props = typeof window.HousinGoSupabase?.getAvailableProperties === 'function'
    ? await window.HousinGoSupabase.getAvailableProperties()
    : [];

  grid.innerHTML = '';
  props.forEach(p => {
    const pid = p.property_id || p.id;
    const card = document.createElement('div');
    card.className = 'property-card';
    card.dataset.propertyId = pid;
    card.innerHTML = `
      <div class="property-image-carousel">
        <img src="${p.cover_image || 'assets/placeholder.png'}" alt="${p.title || p.address || 'Property'}">
      </div>
      <div class="property-info">
        <div class="property-type">${p.type || ''}</div>
        <h3 class="property-title">${p.title || p.address || 'Property'}</h3>
        <div class="property-location">${p.barangay || ''} ${p.city || ''}</div>
        <div class="property-price">₱${p.monthly_rent || 'N/A'}</div>
        <button class="view-details-btn" data-property-id="${pid}">View Details</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // after rendering, inject hearts and mark favorites (functions already in this file)
  if (typeof injectHearts === 'function') injectHearts();
  if (typeof markUserFavorites === 'function') markUserFavorites();
}

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('properties-grid') || document.querySelector('.properties-grid');

  // inject heart into each card (expects .property-card with data-property-id or data-property-id attr)
  function injectHearts() {
    if (!grid) return;
    const cards = grid.querySelectorAll('.property-card');
    cards.forEach(card => {
      const pid = card.dataset.propertyId || card.getAttribute('data-property-id') || card.id?.replace('property-card-','');
      if (!pid) return;
      if (card.querySelector('.hgo-fav-btn')) return; // already injected

      // container to place button (image area preferred)
      const imageArea = card.querySelector('.property-image') || card.querySelector('.property-image-carousel') || card;
      imageArea.style.position = imageArea.style.position || 'relative';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hgo-fav-btn';
      btn.dataset.propertyId = pid;
      btn.setAttribute('aria-label', 'Save to favorites');
      btn.innerHTML = `<span class="hgo-heart" aria-hidden="true">♡</span>`;
      // simple inline styles — replace with classes if you use Tailwind
      btn.style.cssText = 'position:absolute; top:10px; right:10px; background:rgba(255,255,255,0.9); border-radius:50%; padding:6px; border:none; cursor:pointer; z-index:30; font-size:18px;';
      imageArea.appendChild(btn);
    });
  }

  // mark favorites for current user
  async function markUserFavorites() {
    const userId = getCurrentUser() || localStorage.getItem('hgo_current_user') || null;
    // clear any previous marks first (keeps UI accurate for current user)
    document.querySelectorAll('.hgo-fav-btn.favorited').forEach(b => {
      b.classList.remove('favorited');
      const heart = b.querySelector('.hgo-heart');
      if (heart) heart.textContent = '♡';
    });

    if (!userId) return;
    try {
      const favIds = await window.HousinGoSupabase.getFavoritesByUser(userId);
      if (!favIds || !favIds.length) return;
      favIds.forEach(id => {
        const btn = document.querySelector(`.hgo-fav-btn[data-property-id="${id}"]`);
        if (btn) {
          btn.classList.add('favorited');
          btn.querySelector('.hgo-heart').textContent = '❤';
        }
      });
    } catch (err) {
      console.warn('markUserFavorites error', err);
    }
  }

  // UI-only: unheart all property cards (do not change DB)
  function unheartAll() {
    document.querySelectorAll('.hgo-fav-btn.favorited').forEach(btn => {
      btn.classList.remove('favorited');
      const heart = btn.querySelector('.hgo-heart');
      if (heart) heart.textContent = '♡';
    });
  }

  // Listen for login/logout changes via localStorage (works across tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === 'hgo_current_user') {
      // user logged out in another tab (newValue === null) -> unheart all
      if (!e.newValue) {
        unheartAll();
      } else {
        // user logged in in another tab -> refresh favorites for that user
        markUserFavorites();
      }
    }
  });

  // also listen for an in-page custom event if your app dispatches it on login/logout
  window.addEventListener('hgo:userChanged', (ev) => {
    const newUser = ev?.detail?.userId || null;
    if (!newUser) unheartAll();
    else markUserFavorites();
  });

  // handle clicks (event delegation)
  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('.hgo-fav-btn');
    if (!btn) return;
    e.preventDefault();
    const propertyId = btn.dataset.propertyId;
    // always check current user right before changing UI or calling API
    const userId = getCurrentUser() || localStorage.getItem('hgo_current_user') || null;
    if (!userId) {
      alert('Please log in to save favorites.');
      return;
    }

    // optimistic toggle (UI only until server confirms)
    const wasFavorited = btn.classList.contains('favorited');
    btn.disabled = true;
    btn.classList.toggle('favorited', !wasFavorited);
    btn.querySelector('.hgo-heart').textContent = wasFavorited ? '♡' : '❤';

    try {
      const res = await window.HousinGoSupabase.toggleFavorite(userId, propertyId);
      // ensure UI matches server
      if (res?.isFavorited) {
        btn.classList.add('favorited');
        btn.querySelector('.hgo-heart').textContent = '❤';
      } else {
        btn.classList.remove('favorited');
        btn.querySelector('.hgo-heart').textContent = '♡';
      }
    } catch (err) {
      // revert UI on error
      btn.classList.toggle('favorited', wasFavorited);
      btn.querySelector('.hgo-heart').textContent = wasFavorited ? '❤' : '♡';
      console.error('Unable to toggle favorite', err);
      alert('Unable to update favorite. See console for details.');
    } finally {
      btn.disabled = false;
    }
  });

  // initial run
  injectHearts();
  markUserFavorites();

  // observe grid for changes (e.g., search results)
  if (grid) {
    const obs = new MutationObserver(() => {
      injectHearts();
      markUserFavorites();
    });
    obs.observe(grid, { childList: true, subtree: true });
  }
});

export async function fetchProperties() {
  try {
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'Approved');

    if (propError) {
      console.error('Property fetch error:', propError);
      throw propError;
    }

    if (!properties || properties.length === 0) {
      allProperties.length = 0;
      displayProperties(allProperties.slice(0, 6), 'home');
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'none';
      return;
    }

    const propertiesWithDetails = await Promise.all(
      properties.map(async (property) => {
        try {
          const { data: amenities } = await supabase
            .from('amenities')
            .select('*')
            .eq('property_id', property.property_id)
            .eq('is_included', true);

          const { data: images } = await supabase
            .from('property_images')
            .select('*')
            .eq('property_id', property.property_id)
            .order('uploaded_at', { ascending: true });

          let landlordInfo = null;
          if (property.landlord_id) {
            const { data: landlord } = await supabase
              .from('users')
              .select('first_name, last_name, email, mobile')
              .eq('user_id', property.landlord_id)
              .single();
            landlordInfo = landlord;
          }

          return {
            ...property,
            amenities: amenities || [],
            images: images || [],
            landlord: landlordInfo
          };
        } catch (error) {
          console.warn('Error fetching details for property', property.property_id, error);
          return {
            ...property,
            amenities: [],
            images: [],
            landlord: null
          };
        }
      })
    );

    allProperties.splice(0, allProperties.length, ...propertiesWithDetails);
    displayProperties(allProperties.slice(0, 6), 'home');
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    
  } catch (error) {
    console.error('Error fetching properties:', error);
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }
}

export function showPropertyModal(property) {
  const modal = document.getElementById('property-modal');
  if (!modal) return;
  
  document.getElementById('modal-type').textContent = property.type || 'Property';
  document.getElementById('modal-title').textContent = `${property.type || 'Property'} in ${property.city || 'City'}`;
  document.getElementById('modal-location').textContent = `📍 ${property.address || ''}, ${property.barangay || ''}, ${property.city || ''}`;
  document.getElementById('modal-price').textContent = `₱${parseFloat(property.monthly_rent || 0).toLocaleString()}/month`;
  document.getElementById('modal-description').textContent = property.description || 'No description available.';
  document.getElementById('modal-rules').textContent = property.rules || 'No specific rules listed.';
  document.getElementById('modal-nearby').textContent = property.nearby_landmarks || 'No nearby places listed.';
  document.getElementById('modal-contact-name').textContent = property.contact_name || 'N/A';
  document.getElementById('modal-contact-number').textContent = property.contact_number || 'N/A';
  document.getElementById('modal-move-in').textContent = property.move_in_date || 'Flexible';
  document.getElementById('modal-availability').textContent = property.availability || 'Available';

  const amenitiesGrid = document.getElementById('modal-amenities');
  if (property.amenities && property.amenities.length > 0) {
    amenitiesGrid.innerHTML = property.amenities.map(a => {
      const icon = amenityIcons[a.amenity_name] || '✓';
      return `<div class="amenity-item">${icon} ${a.amenity_name}</div>`;
    }).join('');
  }

  // Image carousel
  const modalImages = document.getElementById('modal-images');
  let currentImageIndex = 0;

  if (property.images && property.images.length > 0) {
    modalImages.innerHTML = `
      <div class="modal-image-container" style="position: relative; width: 100%; height: 300px; overflow: hidden;">
        <img id="modal-main-image" src="${property.images[0].image_url}" alt="Property" 
             style="width: 100%; height: 100%; object-fit: cover; cursor: grab;">
        ${property.images.length > 1 ? `<div class="image-navigation" style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px;">
          <button id="prev-image" class="nav-btn" style="padding: 8px 12px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 4px; cursor: pointer;">❮</button>
          <span class="image-counter" style="background: rgba(0,0,0,0.5); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.875rem;"><span id="current-image">1</span>/${property.images.length}</span>
          <button id="next-image" class="nav-btn" style="padding: 8px 12px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 4px; cursor: pointer;">❯</button>
        </div>` : ''}
      </div>
    `;

    if (property.images.length > 1) {
      document.getElementById('prev-image').addEventListener('click', () => {
        currentImageIndex = (currentImageIndex - 1 + property.images.length) % property.images.length;
        document.getElementById('modal-main-image').src = property.images[currentImageIndex].image_url;
        document.getElementById('current-image').textContent = currentImageIndex + 1;
      });

      document.getElementById('next-image').addEventListener('click', () => {
        currentImageIndex = (currentImageIndex + 1) % property.images.length;
        document.getElementById('modal-main-image').src = property.images[currentImageIndex].image_url;
        document.getElementById('current-image').textContent = currentImageIndex + 1;
      });
    }
  }

  // Apply button
  const applyButton = document.getElementById('modal-apply-btn');
  if (applyButton) {
    const storedUser = localStorage.getItem('currentUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (property.availability === 'Available' && user && user.role === 'Tenant') {
      applyButton.style.display = 'block';
      applyButton.textContent = 'Apply Now';
      applyButton.onclick = () => handleApplyProperty(property.property_id);
    } else if (!user) {
      applyButton.style.display = 'block';
      applyButton.textContent = 'Login to Apply';
      applyButton.onclick = () => {
        const { showPage } = require('./navigation.js');
        showPage('login');
      };
    } else {
      applyButton.style.display = 'none';
    }
  }

  modal.classList.add('active');
}

export async function handleApplyProperty(propertyId) {
  const storedUser = localStorage.getItem('currentUser');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user || user.role !== 'Tenant') {
    showInlineMessage('Only tenants can apply for properties', 'error');
    return;
  }

  try {
    const { data: existingApp } = await supabase
      .from('property_applicants')
      .select('*')
      .eq('property_id', propertyId)
      .eq('tenant_id', user.user_id)
      .single();

    if (existingApp) {
      showInlineMessage('You have already applied for this property', 'error');
      return;
    }

    showApplicationForm(propertyId, user);
  } catch (error) {
    console.error('Error checking application:', error);
    showApplicationForm(propertyId, user);
  }
}

function showApplicationForm(propertyId, user) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'application-modal';
  modal.style.display = 'block';

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <button class="modal-close" onclick="closeApplicationModal()">×</button>
      <div class="modal-header">
        <h2 style="margin: 0;">Submit Your Application</h2>
      </div>
      <div style="padding: 20px;">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" value="${user.first_name} ${user.last_name}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" value="${user.email}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Mobile</label>
          <input type="tel" class="form-input" value="${user.mobile || ''}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Message to Landlord (Optional)</label>
          <textarea id="application-message" class="form-textarea" placeholder="Tell the landlord a bit about yourself or ask any questions..." style="min-height: 120px;"></textarea>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="action-button secondary" onclick="closeApplicationModal()" style="flex: 1;">Cancel</button>
          <button class="action-button" onclick="submitApplication('${propertyId}', '${user.user_id}')" style="flex: 1;">Submit Application</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeApplicationModal();
    }
  });
}

window.closeApplicationModal = function() {
  const modal = document.getElementById('application-modal');
  if (modal) {
    modal.remove();
  }
};

window.submitApplication = async function(propertyId, userId) {
  const message = document.getElementById('application-message').value;
  
  try {
    const { error } = await supabase
      .from('property_applicants')
      .insert([{
        property_id: propertyId,
        tenant_id: userId,
        status: 'Pending',
        message: message || null
      }]);

    if (error) throw error;

    showInlineMessage('Application submitted successfully!', 'success');
    setTimeout(closeApplicationModal, 2000);
  } catch (error) {
    console.error('Error submitting application:', error);
    showInlineMessage('Error submitting application. Please try again later.', 'error');
  }
};