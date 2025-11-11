// Form submissions and handlers
import { supabase } from './supabase-client.js';
import { currentUser, loadProfilePage } from './auth.js';
import { showInlineMessage } from './ui.js';
import { handleLogin, handleRegister } from './auth.js';

export function initializeForms() {
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
  document.getElementById('register-form').addEventListener('submit', handleRegisterSubmit);
  document.getElementById('contact-form').addEventListener('submit', handleContactSubmit);
  document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Logging in...';
  
  try {
    const result = await handleLogin(email, password);
    if (result.success) {
      showInlineMessage('Login successful! Welcome back to HousinGo.');
      const { showPage } = await import('./navigation.js');
      const { loadAdminDashboard } = await import('./dashboard.js');
      const { loadLandlordDashboard } = await import('./dashboard.js');
      const { loadTenantDashboard } = await import('./dashboard.js');
      
      if (result.user.role === 'Admin') {
        showPage('admin-dashboard');
        loadAdminDashboard();
      } else if (result.user.role === 'Landlord') {
        showPage('landlord-dashboard');
        loadLandlordDashboard();
      } else {
        showPage('tenant-dashboard');
        loadTenantDashboard();
      }
    } else {
      showInlineMessage('Login failed: ' + result.error, 'error');
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Log In';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const firstName = document.getElementById('first-name').value;
  const lastName = document.getElementById('last-name').value;
  const email = document.getElementById('register-email').value;
  const mobile = document.getElementById('mobile-number').value;
  const role = document.getElementById('user-role').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Creating Account...';
  
  try {
    const result = await handleRegister(firstName, lastName, email, mobile, role, password, confirmPassword);
    if (result.success) {
      showInlineMessage('Registration successful! You can now log in.');
      document.getElementById('register-form').reset();
      const { showPage } = await import('./navigation.js');
      showPage('login');
    } else {
      showInlineMessage('Registration failed: ' + result.error, 'error');
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Create Account';
  }
}

async function handleContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('contact-name').value;
  const mobile = document.getElementById('contact-mobile').value;
  const email = document.getElementById('contact-email').value;
  const subject = document.getElementById('contact-subject').value;
  const message = document.getElementById('contact-message').value;
  
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';
  
  try {
    const { error } = await supabase
      .from('reports')
      .insert([{
        user_id: currentUser?.user_id || null,
        subject: subject,
        message: `Name: ${name}\nMobile: ${mobile}\nEmail: ${email}\n\nMessage: ${message}`
      }]);
    
    if (error) throw error;
    
    showInlineMessage('Message sent successfully! We will get back to you soon.');
    document.getElementById('contact-form').reset();
  } catch (error) {
    showInlineMessage('Failed to send message: ' + error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Send Message';
  }
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  
  if (!currentUser) {
    showInlineMessage('You must be logged in to update your profile', 'error');
    return;
  }

  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';

  try {
    const updateData = {
      first_name: document.getElementById('profile-first-name').value,
      last_name: document.getElementById('profile-last-name').value,
      email: document.getElementById('profile-email').value,
      mobile: document.getElementById('profile-mobile').value
    };

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    if (currentPassword || newPassword || confirmNewPassword) {
      if (!currentPassword) {
        throw new Error('Please enter your current password');
      }
      
      if (currentPassword !== currentUser.password) {
        throw new Error('Current password is incorrect');
      }
      
      if (!newPassword || !confirmNewPassword) {
        throw new Error('Please enter and confirm your new password');
      }
      
      if (newPassword !== confirmNewPassword) {
        throw new Error('New passwords do not match');
      }
      
      updateData.password = newPassword;
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', currentUser.user_id)
      .select()
      .single();

    if (error) throw error;

    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    const { updateUIForUser } = await import('./auth.js');
    updateUIForUser(updatedUser);

    showInlineMessage('Profile updated successfully!');
    
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
    
  } catch (error) {
    console.error('Error updating profile:', error);
    showInlineMessage('Failed to update profile: ' + error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Save Changes';
  }
}