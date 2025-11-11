// Property posting and editing functionality
import { supabase } from './supabase-client.js';
import { currentUser } from './auth.js';
import { IMGBB_API_KEY } from './config.js';
import { showInlineMessage } from './ui.js';
import { showPage } from './navigation.js';
import { loadLandlordDashboard } from './dashboard.js';
import { fetchProperties } from './properties.js';

let uploadedImages = [];
let editingPropertyId = null;

export function initializePropertyPosting() {
  document.getElementById('image-upload-area').addEventListener('click', () => {
    document.getElementById('property-images').click();
  });

  document.getElementById('property-images').addEventListener('change', handleImageUpload);
  document.getElementById('preview-btn').addEventListener('click', handlePreview);
  document.getElementById('save-draft-btn').addEventListener('click', handleSaveDraft);
  document.getElementById('post-property-form').addEventListener('submit', handlePostProperty);
}

function handleImageUpload(e) {
  const files = Array.from(e.target.files);
  const maxSize = 30 * 1024 * 1024;
  
  if (uploadedImages.length + files.length > 10) {
    showInlineMessage('You can only upload up to 10 images', 'error');
    return;
  }

  const totalImages = uploadedImages.length + files.length;
  if (totalImages < 5) {
    showInlineMessage('Please upload at least 5 images (up to 10 images allowed)', 'error');
  }

  for (const file of files) {
    if (file.size > maxSize) {
      showInlineMessage(`Image "${file.name}" exceeds 30MB limit`, 'error');
      continue;
    }
    
    if (!file.type.startsWith('image/')) {
      showInlineMessage(`"${file.name}" is not a valid image file`, 'error');
      continue;
    }
    
    if (uploadedImages.length < 10) {
      uploadedImages.push(file);
    }
  }

  displayImagePreviews();
}

function displayImagePreviews() {
  const grid = document.getElementById('image-preview-grid');
  grid.innerHTML = uploadedImages.map((file, index) => `
    <div class="image-preview-item">
      📷
      <button type="button" class="image-remove-btn" onclick="removeImage(${index})">×</button>
    </div>
  `).join('');
}

window.removeImage = function(index) {
  uploadedImages.splice(index, 1);
  displayImagePreviews();
};

async function uploadImageToImgBB(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      try {
        const base64String = e.target.result.split(',')[1];
        
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64String);

        const response = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (data.success) {
          resolve(data.data.display_url);
        } else {
          reject(new Error('Image upload failed'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read image file'));
    
    reader.readAsDataURL(file);
  });
}

async function handlePreview() {
  const propertyData = {
    type: document.getElementById('property-type').value,
    monthly_rent: document.getElementById('monthly-rent').value,
    address: document.getElementById('property-address').value,
    barangay: document.getElementById('property-barangay').value,
    city: document.getElementById('property-city').value,
    description: document.getElementById('property-description').value,
    amenities: Array.from(document.querySelectorAll('input[name="amenity"]:checked')).map(cb => ({ amenity_name: cb.value })),
    rules: document.getElementById('property-rules').value,
    nearby_landmarks: document.getElementById('nearby-landmarks').value,
    contact_name: document.getElementById('landlord-name').value,
    contact_number: document.getElementById('landlord-mobile').value,
    move_in_date: document.getElementById('move-in-date').value,
    min_stay: document.getElementById('minimum-stay').value
  };
  
  const { showPropertyModal } = await import('./properties.js');
  showPropertyModal(propertyData);
}

async function handleSaveDraft() {
  if (!currentUser || currentUser.role !== 'Landlord') {
    showInlineMessage('Only landlords can save property drafts', 'error');
    return;
  }

  if (uploadedImages.length > 0 && (uploadedImages.length < 5 || uploadedImages.length > 10)) {
    showInlineMessage('If uploading images, please provide between 5 and 10 images', 'error');
    return;
  }

  const draftButton = document.getElementById('save-draft-btn');
  draftButton.disabled = true;
  draftButton.textContent = 'Saving...';

  try {
    const selectedAmenities = Array.from(document.querySelectorAll('input[name="amenity"]:checked'))
      .map(cb => cb.value);

    const { data: property, error: propError } = await supabase
      .from('properties')
      .insert([{
        landlord_id: currentUser.user_id,
        type: document.getElementById('property-type').value,
        monthly_rent: parseFloat(document.getElementById('monthly-rent').value) || 0,
        available_slots: parseInt(document.getElementById('available-slots').value) || 1,
        address: document.getElementById('property-address').value,
        barangay: document.getElementById('property-barangay').value,
        city: document.getElementById('property-city').value,
        nearby_landmarks: document.getElementById('nearby-landmarks').value,
        description: document.getElementById('property-description').value,
        rules: document.getElementById('property-rules').value,
        contact_name: document.getElementById('landlord-name').value,
        contact_number: document.getElementById('landlord-mobile').value,
        move_in_date: document.getElementById('move-in-date').value,
        min_stay: document.getElementById('minimum-stay').value,
        status: 'Draft'
      }])
      .select()
      .single();

    if (propError) throw propError;

    if (selectedAmenities.length > 0) {
      const amenitiesData = selectedAmenities.map(amenity => ({
        property_id: property.property_id,
        amenity_name: amenity,
        is_included: true
      }));

      await supabase.from('amenities').insert(amenitiesData);
    }

    showInlineMessage('Property saved as draft successfully!');
    document.getElementById('post-property-form').reset();
    uploadedImages = [];
    displayImagePreviews();
    showPage('landlord-dashboard');
    loadLandlordDashboard();
    
  } catch (error) {
    console.error('Error saving draft:', error);
    showInlineMessage('Failed to save draft: ' + error.message, 'error');
  } finally {
    draftButton.disabled = false;
    draftButton.textContent = 'Save as Draft';
  }
}

async function handlePostProperty(e) {
  e.preventDefault();
  
  if (!currentUser || currentUser.role !== 'Landlord') {
    showInlineMessage('Only landlords can post properties', 'error');
    return;
  }

  if (!editingPropertyId && (uploadedImages.length < 5 || uploadedImages.length > 10)) {
    showInlineMessage('Please upload between 5 and 10 images', 'error');
    return;
  }

  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Publishing...';

  try {
    const selectedAmenities = Array.from(document.querySelectorAll('input[name="amenity"]:checked'))
      .map(cb => cb.value);

    const propertyData = {
      landlord_id: currentUser.user_id,
      type: document.getElementById('property-type').value,
      monthly_rent: parseFloat(document.getElementById('monthly-rent').value),
      available_slots: parseInt(document.getElementById('available-slots').value),
      address: document.getElementById('property-address').value,
      barangay: document.getElementById('property-barangay').value,
      city: document.getElementById('property-city').value,
      nearby_landmarks: document.getElementById('nearby-landmarks').value,
      loc_link: document.getElementById('loc-link').value,
      description: document.getElementById('property-description').value,
      rules: document.getElementById('property-rules').value,
      contact_name: document.getElementById('landlord-name').value,
      contact_number: document.getElementById('landlord-mobile').value,
      move_in_date: document.getElementById('move-in-date').value,
      min_stay: document.getElementById('minimum-stay').value,
      status: editingPropertyId ? undefined : 'Pending'
    };

    let property;
    if (editingPropertyId) {
      const { data, error: propError } = await supabase
        .from('properties')
        .update(propertyData)
        .eq('property_id', editingPropertyId)
        .select()
        .single();
      
      if (propError) throw propError;
      property = data;

      await supabase.from('amenities').delete().eq('property_id', editingPropertyId);
      await supabase.from('property_images').delete().eq('property_id', editingPropertyId);
    } else {
      const { data, error: propError } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

      if (propError) throw propError;
      property = data;
    }

    if (selectedAmenities.length > 0) {
      const amenitiesData = selectedAmenities.map(amenity => ({
        property_id: property.property_id,
        amenity_name: amenity,
        is_included: true
      }));

      await supabase.from('amenities').insert(amenitiesData);
    }

    if (uploadedImages.length > 0) {
      let successCount = 0;
      
      for (let i = 0; i < uploadedImages.length; i++) {
        submitButton.textContent = `Uploading images (${i + 1}/${uploadedImages.length})...`;
        
        try {
          const imageUrl = await uploadImageToImgBB(uploadedImages[i]);
          
          await supabase.from('property_images').insert([{
            property_id: property.property_id,
            image_url: imageUrl
          }]);
          
          successCount++;
        } catch (imgError) {
          console.error(`Failed to upload image ${i + 1}:`, imgError);
        }
      }
    }

    const message = editingPropertyId 
      ? 'Property updated successfully!' 
      : '🎉 Property posted successfully! Your listing is now pending admin approval.';
    
    showInlineMessage(message);
    document.getElementById('post-property-form').reset();
    uploadedImages = [];
    editingPropertyId = null;
    displayImagePreviews();
    showPage('landlord-dashboard');
    loadLandlordDashboard();
    fetchProperties();
    
  } catch (error) {
    console.error('Error posting property:', error);
    showInlineMessage('Failed to post property: ' + error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = editingPropertyId ? 'Update Property' : 'Publish Property';
  }
}

export function initializePostPropertyForm() {
  if (currentUser && currentUser.role === 'Landlord') {
    const landlordName = `${currentUser.first_name} ${currentUser.last_name}`;
    document.getElementById('landlord-name').value = landlordName;
    document.getElementById('landlord-mobile').value = currentUser.mobile || '';
  }
}