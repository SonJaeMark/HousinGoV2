// Dashboard functions for admin, landlord, and tenant
import { supabase } from './supabase-client.js';
import { showInlineMessage } from './ui.js';

export async function loadAdminDashboard() {
  const storedUser = localStorage.getItem('currentUser');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  if (!user || user.role !== 'Admin') return;
  
  try {
    const { data: properties } = await supabase.from('properties').select('*');
    const { data: users } = await supabase.from('users').select('*');
    const pendingProperties = properties?.filter(p => p.status === 'Pending') || [];
    
    const adminStats = document.getElementById('admin-total-properties');
    if (adminStats) {
      adminStats.textContent = properties?.length || 0;
      document.getElementById('admin-total-users').textContent = users?.length || 0;
      document.getElementById('admin-pending-properties').textContent = pendingProperties.length;
      document.getElementById('admin-monthly-views').textContent = Math.floor(Math.random() * 1000);
    }
    
    const tbody = document.getElementById('admin-pending-tbody');
    if (tbody) {
      if (pendingProperties.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📋</div><p>No pending approvals</p></td></tr>';
      } else {
        tbody.innerHTML = pendingProperties.map(p => `
          <tr>
            <td>${p.type}</td>
            <td>${p.barangay}, ${p.city}</td>
            <td>${p.contact_name}</td>
            <td>₱${parseFloat(p.monthly_rent).toLocaleString()}</td>
            <td>${new Date(p.created_at).toLocaleDateString()}</td>
            <td>
              <button class="action-button secondary" onclick="viewPendingProperty('${p.property_id}')" style="margin-bottom: 0.25rem;">View</button>
              <button class="action-button" onclick="approveProperty('${p.property_id}')">Approve</button>
              <button class="action-button danger" onclick="rejectProperty('${p.property_id}')">Reject</button>
            </td>
          </tr>
        `).join('');
      }
    }
    
    const usersTbody = document.getElementById('admin-users-tbody');
    if (usersTbody) {
      if (!users || users.length === 0) {
        usersTbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">👥</div><p>No users found</p></td></tr>';
      } else {
        usersTbody.innerHTML = users.map(u => `
          <tr>
            <td>${u.first_name} ${u.last_name}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td><span class="status-badge active">${u.status}</span></td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
              <button class="action-button secondary" onclick="viewUser('${u.user_id}')">View</button>
            </td>
          </tr>
        `).join('');
      }
    }

    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const reportsList = document.getElementById('admin-reports-list');
    if (reportsList) {
      if (!reports || reports.length === 0) {
        reportsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><p>No reports or feedback</p></div>';
      } else {
        reportsList.innerHTML = reports.map(r => `
          <div class="message-item">
            <div class="message-header">
              <span class="message-sender">${r.subject || 'Report'}</span>
              <span class="message-time">${new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <div class="message-preview">${r.message?.substring(0, 100) || 'No message'}${r.message?.length > 100 ? '...' : ''}</div>
          </div>
        `).join('');
      }
    }
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

export async function loadLandlordDashboard() {
  const storedUser = localStorage.getItem('currentUser');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  if (!user || user.role !== 'Landlord') return;
  
  try {
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', user.user_id);
    
    const availableCount = properties?.filter(p => p.availability === 'Available').length || 0;
    const occupiedCount = properties?.filter(p => p.availability === 'Occupied').length || 0;
    
    const statsDiv = document.getElementById('landlord-total-properties');
    if (statsDiv) {
      statsDiv.textContent = properties?.length || 0;
      document.getElementById('landlord-available-properties').textContent = availableCount;
      document.getElementById('landlord-occupied-properties').textContent = occupiedCount;
      document.getElementById('landlord-messages-count').textContent = 0;
    }
    
    const tbody = document.getElementById('landlord-properties-tbody');
    if (!tbody) return;
    
    if (!properties || properties.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">🏠</div><p>No properties posted yet. Click "Post New Property" to get started!</p></td></tr>';
    } else {
      // Fetch applicant counts for each property
      const applicantCounts = {};
      for (const prop of properties) {
        const { count } = await supabase
          .from('property_applicants')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', prop.property_id)
          .eq('status', 'Pending');
        applicantCounts[prop.property_id] = count || 0;
      }

      tbody.innerHTML = properties.map(p => {
        const applicantCount = applicantCounts[p.property_id] || 0;
        return `
          <tr>
            <td>${p.type}</td>
            <td>${p.barangay}, ${p.city}</td>
            <td>₱${parseFloat(p.monthly_rent).toLocaleString()}</td>
            <td><span class="status-badge ${p.status.toLowerCase()}">${p.status}</span></td>
            <td>${new Date(p.created_at).toLocaleDateString()}</td>
            <td>
              <div style="position: relative; display: inline-block;">
                <button class="action-button secondary user-icon-btn" onclick="viewLandlordProperty('${p.property_id}')" title="View Applicants">
                  👤
                  ${applicantCount > 0 ? `<span class="applicant-badge">${applicantCount}</span>` : ''}
                </button>
              </div>
              ${p.status === 'Draft' ? `<button class="action-button" onclick="publishDraft('${p.property_id}')">Publish</button>` : ''}
              <button class="action-button secondary" onclick="editProperty('${p.property_id}')">Edit</button>
              <button class="action-button danger" onclick="deleteProperty('${p.property_id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading landlord dashboard:', error);
    showInlineMessage('Error loading dashboard', 'error');
  }
}

export async function loadTenantDashboard() {
  const storedUser = localStorage.getItem('currentUser');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  if (!user || user.role !== 'Tenant') return;
  
  try {
    // Fetch applied properties count
    const { count: appliedCount } = await supabase
      .from('property_applicants')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.user_id);

    // Fetch favorites count
    const { count: favCount } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.user_id);

    const statsDiv = document.getElementById('tenant-saved-count');
    if (statsDiv) {
      statsDiv.textContent = favCount || 0;
      document.getElementById('tenant-messages-count').textContent = 0;
      document.getElementById('tenant-applied-count').textContent = appliedCount || 0;
    }
  } catch (error) {
    console.error('Error loading tenant dashboard:', error);
  }
}

export async function viewLandlordProperty(propertyId) {
  try {
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('property_id', propertyId)
      .single();

    if (!property) {
      showInlineMessage('Property not found', 'error');
      return;
    }

    // Fetch applicants with nested tenant data
    const { data: applicants } = await supabase
      .from('property_applicants')
      .select(`
        applicant_id,
        property_id,
        tenant_id,
        application_date,
        status,
        message,
        tenant_id (
          first_name,
          last_name,
          email,
          mobile
        )
      `)
      .eq('property_id', propertyId)
      .order('application_date', { ascending: false });

    // Manually join the data
    const applicantsWithTenant = applicants?.map(app => ({
      ...app,
      tenant: {
        first_name: app.tenant_id?.first_name || 'N/A',
        last_name: app.tenant_id?.last_name || 'N/A',
        email: app.tenant_id?.email || 'N/A',
        mobile: app.tenant_id?.mobile || 'N/A'
      }
    })) || [];

    showApplicantsModal(property, applicantsWithTenant);
  } catch (error) {
    console.error('Error fetching property applicants:', error);
    showInlineMessage('Error loading applicants', 'error');
  }
}

function showApplicantsModal(property, applicants) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'applicants-modal';
  modal.style.display = 'block';

  const applicantsHTML = applicants.length === 0 
    ? '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No applications yet</p></div>'
    : `
      <div class="applicants-list">
        ${applicants.map(app => `
          <div class="applicant-card">
            <div class="applicant-header">
              <div class="applicant-info">
                <h4>${app.tenant.first_name} ${app.tenant.last_name}</h4>
                <p>📧 ${app.tenant.email}</p>
                <p>📱 ${app.tenant.mobile}</p>
              </div>
              <div class="applicant-status">
                <span class="status-badge ${app.status.toLowerCase()}">${app.status}</span>
                <p style="font-size: 0.875rem; color: #666; margin-top: 0.5rem;">
                  Applied: ${new Date(app.application_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div class="applicant-message">
              <p><strong>Message:</strong> ${app.message || 'No message provided'}</p>
            </div>
            <div class="applicant-actions">
              <button class="action-button" onclick="approveApplicant('${app.applicant_id}', '${property.property_id}')">
                ✓ Approve
              </button>
              <button class="action-button secondary" onclick="rejectApplicant('${app.applicant_id}')">
                ✗ Reject
              </button>
              <button class="action-button secondary" onclick="contactApplicant('${app.tenant.email}', '${app.tenant.first_name}')">
                💬 Contact
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
      <button class="modal-close" onclick="closeApplicantsModal()">×</button>
      <div class="modal-header">
        <h2 style="margin: 0;">Applicants for ${property.type} in ${property.city}</h2>
        <p style="color: #666; margin: 0.5rem 0 0 0;">
          ${property.address}, ${property.barangay}
        </p>
      </div>
      ${applicantsHTML}
    </div>
  `;

  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeApplicantsModal();
    }
  });
}

export async function approveApplicant(applicantId, propertyId) {
  try {
    // Update applicant status
    const { error: appError } = await supabase
      .from('property_applicants')
      .update({ status: 'Approved' })
      .eq('applicant_id', applicantId);

    if (appError) throw appError;

    // Update property availability
    const { error: propError } = await supabase
      .from('properties')
      .update({ availability: 'Occupied' })
      .eq('property_id', propertyId);

    if (propError) throw propError;

    // Reject other applicants for this property
    const { data: otherApplicants } = await supabase
      .from('property_applicants')
      .select('applicant_id')
      .eq('property_id', propertyId)
      .neq('applicant_id', applicantId)
      .neq('status', 'Rejected');

    if (otherApplicants && otherApplicants.length > 0) {
      await supabase
        .from('property_applicants')
        .update({ status: 'Rejected' })
        .in('applicant_id', otherApplicants.map(a => a.applicant_id));
    }

    showInlineMessage('Applicant approved! Property marked as occupied.');
    closeApplicantsModal();
    loadLandlordDashboard();
  } catch (error) {
    console.error('Error approving applicant:', error);
    showInlineMessage('Failed to approve applicant', 'error');
  }
}

export async function rejectApplicant(applicantId) {
  try {
    const { error } = await supabase
      .from('property_applicants')
      .update({ status: 'Rejected' })
      .eq('applicant_id', applicantId);

    if (error) throw error;

    showInlineMessage('Applicant rejected.');
    closeApplicantsModal();
    loadLandlordDashboard();
  } catch (error) {
    console.error('Error rejecting applicant:', error);
    showInlineMessage('Failed to reject applicant', 'error');
  }
}

function contactApplicant(email, firstName) {
  const mailtoLink = `mailto:${email}?subject=Regarding Your Application at HousinGo&body=Hello ${firstName},\n\nThank you for your interest in our property. We would like to discuss your application further.\n\nBest regards`;
  window.open(mailtoLink);
}

window.closeApplicantsModal = function() {
  const modal = document.getElementById('applicants-modal');
  if (modal) {
    modal.remove();
  }
};

window.viewLandlordProperty = viewLandlordProperty;
window.approveApplicant = approveApplicant;
window.rejectApplicant = rejectApplicant;
window.contactApplicant = contactApplicant;