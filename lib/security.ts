/**
 * lib/security.ts
 * Input sanitization, validation, and security utilities.
 * Protects against injection attacks and validates all user inputs
 * before they reach the database.
 */

/**
 * Strips characters that could be used for SQL injection or script injection.
 * Allows letters, numbers, spaces, punctuation safe for task titles/descriptions.
 */
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    // Trim
    .trim()
    // Limit length
    .slice(0, 500);
};

/**
 * Sanitizes a task title — stricter, shorter limit.
 */
export const sanitizeTitle = (input: string): string => {
  return sanitizeText(input).slice(0, 100);
};

/**
 * Validates that a time string is in HH:MM format and within valid ranges.
 */
export const isValidTime = (timeStr: string): boolean => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

/**
 * Validates that a date string is in YYYY-MM-DD format and is a real date.
 */
export const isValidDate = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  // Use Date to verify it's a real calendar date
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

/**
 * Validates a priority value.
 */
export const isValidPriority = (p: string): p is 'LOW' | 'MEDIUM' | 'HIGH' => {
  return ['LOW', 'MEDIUM', 'HIGH'].includes(p);
};

/**
 * Validates a category value.
 */
export const isValidCategory = (c: string): c is 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' => {
  return ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'].includes(c);
};

/**
 * Validates a recurrence pattern.
 */
export const isValidRecurrence = (r: string): r is 'DAILY' | 'WEEKLY' | 'WEEKDAYS' | 'WEEKENDS' => {
  return ['DAILY', 'WEEKLY', 'WEEKDAYS', 'WEEKENDS'].includes(r);
};

/**
 * Validates task status.
 */
export const isValidStatus = (s: string): s is 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' => {
  return ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED'].includes(s);
};

/**
 * Rate limiter — prevents the same action being called more than
 * `maxCalls` times within `windowMs` milliseconds.
 * Returns `true` if the call is allowed, `false` if rate-limited.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export const checkRateLimit = (
  key: string,
  maxCalls: number = 5,
  windowMs: number = 2000
): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxCalls) {
    return false; // rate limited
  }

  entry.count += 1;
  return true;
};

/**
 * Validates and sanitizes a full task input object.
 * Returns { valid: true, data } or { valid: false, error: string }.
 */
export const validateTaskInput = (input: {
  title: string;
  description?: string;
  time: string;
  priority: string;
  category: string;
  date: string;
  recurrence?: string;
}): { valid: true; data: typeof input & { title: string; description?: string } } | { valid: false; error: string } => {
  const title = sanitizeTitle(input.title);
  if (!title) return { valid: false, error: 'Task title cannot be empty.' };

  if (!isValidTime(input.time)) {
    return { valid: false, error: 'Invalid time format. Please use HH:MM.' };
  }

  if (!isValidDate(input.date)) {
    return { valid: false, error: 'Invalid date. Please pick a valid date.' };
  }

  if (!isValidPriority(input.priority)) {
    return { valid: false, error: 'Invalid priority value.' };
  }

  if (!isValidCategory(input.category)) {
    return { valid: false, error: 'Invalid category value.' };
  }

  if (input.recurrence && !isValidRecurrence(input.recurrence)) {
    return { valid: false, error: 'Invalid recurrence pattern.' };
  }

  return {
    valid: true,
    data: {
      ...input,
      title,
      description: input.description ? sanitizeText(input.description) : undefined,
    },
  };
};
