// Authentication and user management
import { supabase } from './supabase-client.js';

export let currentUser = null;

export function updateUIForUser(user) {
  currentUser = user;
  
  if (user) {
    document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'block');
    
    const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
    document.getElementById('user-avatar').textContent = initials || 'U';
    
    const dashboardLink = document.getElementById('dashboard-link');
    if (user.role === 'Admin') {
      dashboardLink.onclick = () => showPage('admin-dashboard');
    } else if (user.role === 'Landlord') {
      dashboardLink.onclick = () => showPage('landlord-dashboard');
    } else {
      dashboardLink.onclick = () => showPage('tenant-dashboard');
    }
  } else {
    document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'none');
  }
}

export function initializeAuth() {
  // User avatar dropdown
  document.getElementById('user-avatar').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('user-dropdown').classList.toggle('active');
  });

  document.addEventListener('click', () => {
    document.getElementById('user-dropdown').classList.remove('active');
  });

  document.getElementById('profile-link').addEventListener('click', () => {
    if (currentUser) {
      loadProfilePage();
      showPage('profile');
    }
  });

  document.getElementById('logout-link').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    currentUser = null;
    updateUIForUser(null);
    showPage('home');
    showInlineMessage('You have been logged out successfully.');
  });

  // Check for existing session
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      updateUIForUser(userData);
    } catch (error) {
      console.error('Error parsing stored user:', error);
      localStorage.removeItem('currentUser');
    }
  }
}

export function loadProfilePage() {
  if (!currentUser) return;
  
  document.getElementById('profile-first-name').value = currentUser.first_name || '';
  document.getElementById('profile-last-name').value = currentUser.last_name || '';
  document.getElementById('profile-email').value = currentUser.email || '';
  document.getElementById('profile-mobile').value = currentUser.mobile || '';
  document.getElementById('profile-role').value = currentUser.role || '';
  document.getElementById('profile-status').value = currentUser.status || '';
}

export async function handleLogin(email, password) {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();
    
    if (userError || !userData) {
      throw new Error('Invalid email or password');
    }
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
    updateUIForUser(userData);
    
    return { success: true, user: userData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function handleRegister(firstName, lastName, email, mobile, role, password, confirmPassword) {
  try {
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      throw new Error('Email already registered');
    }
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        first_name: firstName,
        last_name: lastName,
        email: email,
        mobile: mobile,
        role: role,
        password: password,
        status: 'Active'
      }])
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    return { success: true, user: newUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
}