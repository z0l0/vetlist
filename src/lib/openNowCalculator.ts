/**
 * Open Now Calculator
 * Determines if a business is currently open based on hours of operation
 */

export interface OpenNowStatus {
  isOpen: boolean;
  status: string;
  nextChange?: string;
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTime(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  
  const cleanTime = timeStr.trim().replace(/[^\d:]/g, '');
  const parts = cleanTime.split(':');
  
  if (parts.length < 2) return -1;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return -1;
  }
  
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to readable time (e.g., "5:30 PM")
 */
function formatTime(minutes: number): string {
  if (minutes < 0 || minutes >= 1440) return '';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get day name from day number (0 = Sunday, 1 = Monday, etc.)
 */
function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || '';
}

/**
 * Parse hours_of_operation JSON string or object
 */
function parseHoursData(hours: any): Record<string, string[]> | null {
  if (!hours) return null;
  
  try {
    // If it's a string, parse it as JSON
    if (typeof hours === 'string') {
      return JSON.parse(hours);
    }
    
    // If it's already an object, return it
    if (typeof hours === 'object') {
      return hours;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a business is open now based on hours of operation
 * 
 * @param hours - Hours of operation object or JSON string
 *                Format: { "1": ["08:00-17:00"], "2": ["08:00-17:00"], ... }
 *                Keys: 1=Monday, 2=Tuesday, ..., 7=Sunday (or day names)
 * @param currentDate - Optional date to check (defaults to now)
 * @returns Status object with isOpen, status message, and next change time
 */
export function isOpenNow(hours: any, currentDate?: Date): OpenNowStatus {
  const now = currentDate || new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // Parse hours data
  const hoursData = parseHoursData(hours);
  
  if (!hoursData) {
    return {
      isOpen: false,
      status: 'Hours not available'
    };
  }
  
  // Convert JavaScript day (0=Sunday) to hours format (1=Monday, 7=Sunday)
  // Hours format: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
  const hoursDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  
  // Try to get today's hours using different key formats
  let todayHours: string[] | null = null;
  
  // Try numeric key (1-7)
  todayHours = hoursData[hoursDay.toString()] || hoursData[hoursDay];
  
  // Try day name if numeric didn't work
  if (!todayHours) {
    const dayName = getDayName(dayOfWeek);
    todayHours = hoursData[dayName] || hoursData[dayName.toLowerCase()];
  }
  
  // No hours for today
  if (!todayHours || !Array.isArray(todayHours) || todayHours.length === 0) {
    return {
      isOpen: false,
      status: 'Closed today'
    };
  }
  
  // Check if current time falls within any time range
  for (const timeRange of todayHours) {
    if (!timeRange || typeof timeRange !== 'string' || !timeRange.includes('-')) {
      continue;
    }
    
    const [openStr, closeStr] = timeRange.split('-').map(t => t.trim());
    const openTime = parseTime(openStr);
    const closeTime = parseTime(closeStr);
    
    if (openTime === -1 || closeTime === -1) {
      continue;
    }
    
    // Handle special case: 24/7 or overnight hours
    // e.g., "00:00-23:59" or "22:00-02:00"
    if (openTime === 0 && closeTime >= 1439) {
      // Open 24 hours
      return {
        isOpen: true,
        status: 'Open 24 hours'
      };
    }
    
    // Handle overnight hours (e.g., 22:00-02:00)
    if (closeTime < openTime) {
      // Split into two ranges: openTime to midnight, and midnight to closeTime
      if (currentTime >= openTime || currentTime < closeTime) {
        const nextChangeTime = currentTime >= openTime ? closeTime : closeTime;
        return {
          isOpen: true,
          status: 'Open Now',
          nextChange: `Closes at ${formatTime(nextChangeTime)}`
        };
      }
    } else {
      // Normal hours (e.g., 08:00-17:00)
      if (currentTime >= openTime && currentTime < closeTime) {
        return {
          isOpen: true,
          status: 'Open Now',
          nextChange: `Closes at ${formatTime(closeTime)}`
        };
      }
    }
  }
  
  // Not currently open - find next opening time
  // Check if there's a later time range today
  for (const timeRange of todayHours) {
    if (!timeRange || typeof timeRange !== 'string' || !timeRange.includes('-')) {
      continue;
    }
    
    const [openStr] = timeRange.split('-').map(t => t.trim());
    const openTime = parseTime(openStr);
    
    if (openTime > currentTime) {
      return {
        isOpen: false,
        status: 'Closed',
        nextChange: `Opens at ${formatTime(openTime)}`
      };
    }
  }
  
  // Closed for the rest of today
  return {
    isOpen: false,
    status: 'Closed'
  };
}

/**
 * Check if a business offers 24/7 emergency service
 */
export function is24x7(hours: any): boolean {
  const hoursData = parseHoursData(hours);
  
  if (!hoursData) return false;
  
  // Check if all days have 24-hour coverage
  const daysToCheck = ['1', '2', '3', '4', '5', '6', '7'];
  
  for (const day of daysToCheck) {
    const dayHours = hoursData[day];
    
    if (!dayHours || !Array.isArray(dayHours) || dayHours.length === 0) {
      return false;
    }
    
    // Check if any time range covers 24 hours
    let has24Hours = false;
    for (const timeRange of dayHours) {
      if (!timeRange || typeof timeRange !== 'string' || !timeRange.includes('-')) {
        continue;
      }
      
      const [openStr, closeStr] = timeRange.split('-').map(t => t.trim());
      const openTime = parseTime(openStr);
      const closeTime = parseTime(closeStr);
      
      if (openTime === 0 && closeTime >= 1439) {
        has24Hours = true;
        break;
      }
    }
    
    if (!has24Hours) {
      return false;
    }
  }
  
  return true;
}
