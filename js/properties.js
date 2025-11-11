// Property management and fetching
import { supabase } from './supabase-client.js';
import { allProperties, displayProperties } from './search.js';
import { amenityIcons } from './config.js';
import { showInlineMessage } from './ui.js';

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

    Object.assign(allProperties, propertiesWithDetails);
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

  // Image carousel with swipe
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
      const mainImg = document.getElementById('modal-main-image');
      const currentImageSpan = document.getElementById('current-image');
      let touchStartX = 0;

      document.getElementById('prev-image').addEventListener('click', () => {
        currentImageIndex = (currentImageIndex - 1 + property.images.length) % property.images.length;
        mainImg.src = property.images[currentImageIndex].image_url;
        currentImageSpan.textContent = currentImageIndex + 1;
      });

      document.getElementById('next-image').addEventListener('click', () => {
        currentImageIndex = (currentImageIndex + 1) % property.images.length;
        mainImg.src = property.images[currentImageIndex].image_url;
        currentImageSpan.textContent = currentImageIndex + 1;
      });

      // Swipe detection
      modalImages.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
      });

      modalImages.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50) {
          // Swiped left - next image
          currentImageIndex = (currentImageIndex + 1) % property.images.length;
        } else if (touchEndX - touchStartX > 50) {
          // Swiped right - prev image
          currentImageIndex = (currentImageIndex - 1 + property.images.length) % property.images.length;
        }
        mainImg.src = property.images[currentImageIndex].image_url;
        currentImageSpan.textContent = currentImageIndex + 1;
      });
    }
  } else {
    modalImages.innerHTML = '<div style="width: 100%; height: 300px; display: flex; align-items: center; justify-content: center; font-size: 3rem; background: #f0f0f0;">🏠</div>';
  }

  const amenitiesGrid = document.getElementById('modal-amenities');
  if (amenitiesGrid) {
    amenitiesGrid.innerHTML = property.amenities.map(a => {
      const icon = amenityIcons[a.amenity_name] || '✓';
      return `<div class="amenity-item">${icon} ${a.amenity_name}</div>`;
    }).join('');
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
    // Check if already applied
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

    showInlineMessage('Application submitted successfully! The landlord will review your application.');
    closeApplicationModal();
    document.getElementById('property-modal').classList.remove('active');
  } catch (error) {
    console.error('Error submitting application:', error);
    showInlineMessage('Failed to submit application: ' + error.message, 'error');
  }
};