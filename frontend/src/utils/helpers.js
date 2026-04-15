/**
 * Corridoor utility helpers.
 */

/** Format a date string to readable format */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format datetime with time */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Check if NOC is expired */
export function isNocExpired(validTill) {
  if (!validTill) return false;
  return new Date(validTill) < new Date();
}

/** Time ago string */
export function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  // If the timestamp doesn't include timezone info, treat it as UTC
  const thenUTC = dateStr.includes('Z') || dateStr.includes('+') 
    ? then 
    : new Date(dateStr + 'Z');
  const seconds = Math.floor((now - thenUTC) / 1000);

  if (seconds < 0) return 'just now';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Occupancy group short label */
export function occupancyBadge(group) {
  if (!group) return '?';
  const match = group.match(/Group\s+(\w)/);
  return match ? match[1] : '?';
}

/** Number with commas */
export function formatNumber(n) {
  if (n == null) return '—';
  return n.toLocaleString('en-IN');
}

/** Status color mapping */
export function statusColor(status) {
  switch (status) {
    case 'active': return 'var(--color-hazard)';
    case 'acknowledged': return 'var(--color-acknowledged)';
    case 'resolved': return 'var(--color-success)';
    default: return 'var(--text-tertiary)';
  }
}

/** Building type icon (emoji for prototype) */
export function buildingIcon(type) {
  if (!type) return '🏢';
  const t = type.toLowerCase();
  if (t.includes('hospital') || t.includes('institutional')) return '🏥';
  if (t.includes('educational') || t.includes('school') || t.includes('university')) return '🎓';
  if (t.includes('residential')) return '🏠';
  if (t.includes('mall') || t.includes('mercantile')) return '🛍️';
  if (t.includes('industrial') || t.includes('petroleum')) return '🏭';
  if (t.includes('assembly') || t.includes('government') || t.includes('court')) return '🏛️';
  if (t.includes('station') || t.includes('railway')) return '🚉';
  if (t.includes('water park') || t.includes('amusement')) return '🎢';
  if (t.includes('storage') || t.includes('depot')) return '📦';
  if (t.includes('business') || t.includes('office')) return '💼';
  return '🏢';
}
