// Supabase initialization
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(
  'https://myeqpxnpyurmxqtovdec.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZXFweG5weXVybXhxdG92ZGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzA0MzgsImV4cCI6MjA3ODEwNjQzOH0.X5aSsAzjvHvaaiOjM9f_M7gajFOpobn3IX623WFUzBA'
);

// helper: looks like UUID
function looksLikeUUID(v) {
  return typeof v === 'string' && /^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/.test(v);
}

// resolve identifier (uuid or email) -> tenant_id uuid
async function resolveTenantId(identifier) {
  // 1) explicit uuid
  if (identifier && looksLikeUUID(identifier)) return identifier;

  // 2) if email-like, try users table
  if (typeof identifier === 'string' && identifier.includes('@')) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', identifier)
        .maybeSingle();
      if (!error && data?.user_id) return data.user_id;
    } catch (e) {
      console.warn('resolveTenantId users lookup failed', e);
    }
  }

  // 3) fallback: current auth session
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch (e) {
    console.warn('resolveTenantId auth lookup failed', e);
    return null;
  }
}

// toggle favorite: insert/delete in favorites (tenant_id, property_id)
export async function toggleFavorite(userIdentifier, propertyId) {
  if (!propertyId) throw new Error('Missing propertyId');
  const tenantId = await resolveTenantId(userIdentifier);
  if (!tenantId) throw new Error('Unable to resolve tenant_id (user not found)');

  // check existing favorite
  const { data: existing, error: selErr } = await supabase
    .from('favorites')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error: delErr } = await supabase
      .from('favorites')
      .delete()
      .eq('favorite_id', existing.favorite_id);
    if (delErr) throw delErr;
    return { isFavorited: false };
  } else {
    const { error: insErr } = await supabase
      .from('favorites')
      .insert([{ tenant_id: tenantId, property_id: propertyId }]);
    if (insErr) throw insErr;
    return { isFavorited: true };
  }
}

// get favorites property_ids for a user identifier
export async function getFavoritesByUser(userIdentifier) {
  const tenantId = await resolveTenantId(userIdentifier);
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('favorites')
    .select('property_id')
    .eq('tenant_id', tenantId);
  if (error) {
    console.error('getFavoritesByUser error', error);
    return [];
  }
  return (data || []).map(r => r.property_id);
}

// get properties by property_id array
export async function getPropertiesByIds(ids = []) {
  if (!ids || !ids.length) return [];
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .in('property_id', ids);
  if (error) {
    console.error('getPropertiesByIds error', error);
    return [];
  }
  return data || [];
}

// get available properties
export async function getAvailableProperties() {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('availability', 'Available') // only not-occupied properties
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getAvailableProperties error', err);
    return [];
  }
}

// expose helpers for non-module scripts
window.HousinGoSupabase = {
  supabase,
  toggleFavorite,
  getFavoritesByUser,
  getPropertiesByIds,
  getAvailableProperties
};