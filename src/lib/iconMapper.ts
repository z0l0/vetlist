/**
 * Icon Mapper for VetList Services and Animals
 * Maps standardized service names and animal types to emoji icons
 */

// Service emoji mappings
const SERVICE_ICONS: Record<string, string> = {
  // Emergency services
  'emergency': '🚑',
  'emergency care': '🚑',
  '24/7 emergency': '🚑',
  '24-hour emergency': '🚑',
  'urgent care': '🚑',
  
  // Surgery and medical procedures
  'surgery': '💉',
  'pet surgery': '💉',
  'surgical': '💉',
  'spay': '💉',
  'neuter': '💉',
  'spay & neuter': '💉',
  'vaccinations': '💉',
  'vaccines': '💉',
  
  // Dental services
  'dental': '🦷',
  'pet dental care': '🦷',
  'teeth cleaning': '🦷',
  'dental care': '🦷',
  'dentistry': '🦷',
  
  // Diagnostics and lab
  'diagnostics': '🔬',
  'lab testing': '🔬',
  'ultrasound': '🔬',
  'x-ray': '🔬',
  'radiology': '🔬',
  'laboratory': '🔬',
  
  // House calls and mobile
  'house calls': '🏠',
  'mobile': '🏠',
  'mobile vet': '🏠',
  'in-home': '🏠',
  
  // Virtual and telemedicine
  'virtual visits': '📹',
  'telemedicine': '📹',
  'online consultation': '📹',
  'virtual': '📹',
  
  // Boarding and grooming
  'boarding': '🛏️',
  'pet boarding': '🛏️',
  'grooming': '🛁',
  'pet grooming': '🛁',
  
  // Other services
  'euthanasia': '💔',
  'wellness': '🩺',
  'wellness exams': '🩺',
  'checkup': '🩺',
  'general care': '🩺',
};

// Animal emoji mappings
const ANIMAL_EMOJIS: Record<string, string> = {
  // Common pets
  'dog': '🐕',
  'dogs': '🐕',
  'canine': '🐕',
  
  'cat': '🐈',
  'cats': '🐈',
  'feline': '🐈',
  
  // Large animals
  'horse': '🐴',
  'horses': '🐴',
  'equine': '🐴',
  
  // Exotic and reptiles
  'exotic': '🦎',
  'reptile': '🦎',
  'reptiles': '🦎',
  'lizard': '🦎',
  'snake': '🐍',
  'snakes': '🐍',
  'turtle': '🐢',
  'turtles': '🐢',
  
  // Small animals
  'small animal': '🐹',
  'small animals': '🐹',
  'hamster': '🐹',
  'hamsters': '🐹',
  'guinea pig': '🐹',
  'guinea pigs': '🐹',
  'rabbit': '🐰',
  'rabbits': '🐰',
  'ferret': '🐹',
  'ferrets': '🐹',
  
  // Birds
  'bird': '🐦',
  'birds': '🐦',
  'avian': '🐦',
  'parrot': '🦜',
  'parrots': '🦜',
  
  // Aquatic
  'fish': '🐠',
  'aquatic': '🐠',
  'koi': '🐠',
  
  // Farm animals
  'farm animal': '🐄',
  'farm animals': '🐄',
  'farm_animals': '🐄',
  'cattle': '🐄',
  'cow': '🐄',
  'cows': '🐄',
  'pig': '🐷',
  'pigs': '🐷',
  'sheep': '🐑',
  'goat': '🐐',
  'goats': '🐐',
  'chicken': '🐔',
  'chickens': '🐔',
  'poultry': '🐔',
};

/**
 * Get emoji icon for a service name
 * @param serviceName - The service name to look up
 * @returns The emoji icon or a default icon if not found
 */
export function getServiceIcon(serviceName: string): string {
  if (!serviceName) return '🩺'; // Default to stethoscope for general care
  
  const normalized = serviceName.toLowerCase().trim();
  
  // Direct match
  if (SERVICE_ICONS[normalized]) {
    return SERVICE_ICONS[normalized];
  }
  
  // Partial match - check if any key is contained in the service name
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (normalized.includes(key)) {
      return icon;
    }
  }
  
  return '🩺'; // Default icon
}

/**
 * Get emoji for an animal type
 * @param animalName - The animal name to look up
 * @returns The emoji or a default paw print if not found
 */
export function getAnimalEmoji(animalName: string): string {
  if (!animalName) return '🐾'; // Default to paw print
  
  const normalized = animalName.toLowerCase().trim();
  
  // Direct match
  if (ANIMAL_EMOJIS[normalized]) {
    return ANIMAL_EMOJIS[normalized];
  }
  
  // Partial match - check if any key is contained in the animal name
  for (const [key, emoji] of Object.entries(ANIMAL_EMOJIS)) {
    if (normalized.includes(key)) {
      return emoji;
    }
  }
  
  return '🐾'; // Default emoji
}

/**
 * Get all service icons from a list of service names
 * @param services - Array of service names
 * @returns Array of unique emoji icons
 */
export function getServiceIcons(services: string[]): string[] {
  if (!services || !Array.isArray(services)) return [];
  
  const icons = services.map(service => getServiceIcon(service));
  return [...new Set(icons)]; // Remove duplicates
}

/**
 * Get all animal emojis from a list of animal names
 * @param animals - Array of animal names
 * @returns Array of unique emojis
 */
export function getAnimalEmojis(animals: string[]): string[] {
  if (!animals || !Array.isArray(animals)) return [];
  
  const emojis = animals.map(animal => getAnimalEmoji(animal));
  return [...new Set(emojis)]; // Remove duplicates
}
