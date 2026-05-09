/**
 * Format a timestamp to a readable time string.
 */
export function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Group conversations by date label (Today, Yesterday, Earlier).
 */
export function groupConversationsByDate(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  conversations.forEach((conv) => {
    const convDate = new Date(conv.created_at);
    const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

    if (convDay.getTime() === today.getTime()) {
      groups.Today.push(conv);
    } else if (convDay.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(conv);
    } else {
      groups.Earlier.push(conv);
    }
  });

  return groups;
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text, maxLength = 40) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Generate a unique ID.
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
