/**
 * lib/time.ts
 * Real timezone-aware time utilities.
 * All dates and times are derived from the device's system clock —
 * no mocking, no hardcoding.
 */

/**
 * Returns today's date string in YYYY-MM-DD format using the device's local time.
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day   = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns current time as HH:MM string in the device's local timezone.
 */
export const getCurrentTimeString = (): string => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Returns the current hours and minutes as numbers.
 */
export const getCurrentHHMM = (): { hours: number; minutes: number } => {
  const now = new Date();
  return { hours: now.getHours(), minutes: now.getMinutes() };
};

/**
 * Parses a "HH:MM" string into { hours, minutes }.
 */
export const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
};

/**
 * Converts HH:MM to total minutes since midnight — useful for comparing times.
 */
export const timeToMinutes = (timeStr: string): number => {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
};

/**
 * Returns true if the given HH:MM time on today's date is in the past.
 * A task is considered "overdue" if its scheduled time is more than
 * `graceMinutes` minutes in the past.
 */
export const isTimePast = (timeStr: string, graceMinutes = 5): boolean => {
  const taskMinutes    = timeToMinutes(timeStr);
  const { hours, minutes } = getCurrentHHMM();
  const nowMinutes     = hours * 60 + minutes;
  return nowMinutes > taskMinutes + graceMinutes;
};

/**
 * Returns true if the given date string (YYYY-MM-DD) is before today.
 */
export const isDateBeforeToday = (dateStr: string): boolean => {
  return dateStr < getTodayDateString();
};

/**
 * Returns true if the given date string is today.
 */
export const isToday = (dateStr: string): boolean => {
  return dateStr === getTodayDateString();
};

/**
 * Returns a human-readable time in 12-hour format: "9:30 AM"
 */
export const formatTime12h = (timeStr: string): string => {
  const { hours, minutes } = parseTime(timeStr);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12    = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Formats a Date object as a YYYY-MM-DD string.
 */
export const dateToString = (date: Date): string => {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a Date object as HH:MM.
 */
export const dateToTimeString = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Returns a full Date object for a given date string + time string,
 * in the device's local timezone.
 */
export const buildDateFromParts = (dateStr: string, timeStr: string): Date => {
  const { hours, minutes } = parseTime(timeStr);
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return d;
};

/**
 * Returns an array of YYYY-MM-DD strings for the last N days (inclusive of today).
 */
export const getLastNDays = (n: number): string[] => {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dateToString(d));
  }
  return days;
};

/**
 * Returns a friendly display label for a date string.
 * "Today", "Yesterday", or "Mon Jun 16"
 */
export const getFriendlyDate = (dateStr: string): string => {
  const today     = getTodayDateString();
  const yesterday = dateToString(new Date(Date.now() - 86400000));
  if (dateStr === today)     return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/**
 * Returns the day-of-week abbreviation for a date string: MON, TUE, WED...
 */
export const getDayAbbr = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return ['SUN','MON','TUE','WED','THU','FRI','SAT'][date.getDay()];
};

/**
 * Returns the next N dates that a recurring task should run on,
 * starting from startDate (YYYY-MM-DD), based on recurrence pattern.
 */
export const getRecurringDates = (
  startDate: string,
  recurrence: 'DAILY' | 'WEEKLY' | 'WEEKDAYS' | 'WEEKENDS',
  count: number = 30
): string[] => {
  const results: string[] = [];
  let current = new Date();
  // parse start
  const [y, m, d] = startDate.split('-').map(Number);
  current = new Date(y, m - 1, d);

  while (results.length < count) {
    const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat
    const str = dateToString(current);
    let include = false;

    if (recurrence === 'DAILY') {
      include = true;
    } else if (recurrence === 'WEEKLY') {
      // same day of week as the start date
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const startDOW = new Date(sy, sm - 1, sd).getDay();
      include = dayOfWeek === startDOW;
    } else if (recurrence === 'WEEKDAYS') {
      include = dayOfWeek >= 1 && dayOfWeek <= 5;
    } else if (recurrence === 'WEEKENDS') {
      include = dayOfWeek === 0 || dayOfWeek === 6;
    }

    if (include && str >= startDate) {
      results.push(str);
    }
    current.setDate(current.getDate() + 1);
    // Safety cap — don't loop forever
    if (results.length === 0 && current > new Date(Date.now() + 365 * 86400000)) break;
  }

  return results;
};
