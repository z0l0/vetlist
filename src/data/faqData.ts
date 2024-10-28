// src/data/faqData.ts

export type FAQItem = {
  question: string;
  answerYes: string;
  answerNo: string;
};

// Define a generic set of FAQs
export const genericFAQs: FAQItem[] = [
  {
    question: 'Does {name} accept pet insurance?',
    answerYes:
      '{name} accepts pet insurance. Contact their office for more details on accepted providers.',
    answerNo:
      'At this time, {name} does not accept pet insurance. Payment is due at the time of service.',
  },
  {
    question: 'Is {name} accepting new patients?',
    answerYes:
      '{name} is currently accepting new patients. Contact their office to schedule your first appointment.',
    answerNo:
      'At this time, {name} is not accepting new patients. Please check back later.',
  },
  {
    question: 'Does {name} offer emergency services?',
    answerYes:
      '{name} provides emergency services for urgent pet care. Contact them immediately if your pet needs help.',
    answerNo:
      '{name} does not offer emergency services. Please contact a dedicated emergency vet clinic for urgent needs.',
  },
  {
    question: 'Can {name} treat both cats and dogs?',
    answerYes:
      '{name} provides services for both cats and dogs. Contact their office for specific treatments.',
    answerNo:
      '{name} specializes in other types of animals. Contact them for more information.',
  },
  {
    question: 'Does {name} offer X-rays and imaging?',
    answerYes:
      '{name} has X-ray and imaging capabilities on-site to assist with diagnosing health issues.',
    answerNo:
      '{name} does not offer X-ray or imaging services. They may refer you to another clinic if needed.',
  },
  {
    question: 'Is {name} open on weekends?',
    answerYes:
      '{name} is open on weekends to accommodate your pet care needs. Call to confirm specific hours.',
    answerNo:
      '{name} is closed on weekends. Please visit during their weekday hours for care.',
  },
  {
    question: 'Does {name} provide dental care for pets?',
    answerYes:
      '{name} offers dental services for pets, including cleanings and exams. Call to learn more.',
    answerNo:
      '{name} does not provide pet dental services. You may need to find a specialized provider.',
  },
  {
    question: 'Can {name} perform surgeries on-site?',
    answerYes:
      '{name} has surgical facilities and can perform a range of surgeries on-site.',
    answerNo:
      '{name} does not perform surgeries. They may refer you to a specialist if needed.',
  },
  {
    question: 'Does {name} offer wellness and vaccination packages?',
    answerYes:
      '{name} offers wellness and vaccination packages. Contact their office for package details.',
    answerNo:
      '{name} does not offer packages, but vaccinations and wellness checks can be scheduled individually.',
  },
  {
    question: 'Does {name} offer pet daycare services?',
    answerYes:
      '{name} provides boarding or daycare services for pets. Contact their office for availability.',
    answerNo:
      '{name} does not offer boarding or daycare. You may need to contact a dedicated facility.',
  },
  // ... more generic FAQs
];

// Dentist-specific FAQs by dentist ID
export const dentistSpecificFAQs: { [dentistId: number]: FAQItem[] } = {
  24: [
    {
      question: 'Does {name} offer pet boarding services?',
      answerYes: '{name} offers comfortable pet boarding services.',
      answerNo: '{name} does not provide pet boarding services at this time.',
    },
    // Add more specific FAQs for dentist ID 24 if needed
  ],
  36: [
    {
      question: 'Does {name} provide in-home pet care?',
      answerYes: '{name} offers in-home pet care services for your convenience.',
      answerNo: '{name} does not provide in-home pet care services.',
    },
    // Add more specific FAQs for dentist ID 36 if needed
  ],
  // Add other dentist-specific FAQs
};

// Map `isYes` responses by dentist ID and FAQ type (generic or specific) with question index
export const isYesMapping: {
  [dentistId: number]: {
    generic?: { [questionIndex: number]: boolean };
    specific?: { [questionIndex: number]: boolean };
  };
} = {
  24: {
    generic: {
      0: true,
      1: false,
      2: true,
      3: true,
      4: true,
      5: true,
      6: true,
      7: true,
      8: true,
      9: true,
    },
    specific: {
      0: false,
      // Add more specific isYes mappings if you have more specific FAQs
    },
  },
  36: {
    generic: {
      0: true,
      1: true,
      2: false,
      3: true,
      4: true,
      5: false,
      6: true,
      7: false,
      8: true,
      9: false,
    },
    specific: {
      0: true,
      // Add more specific isYes mappings for dentist ID 36
    },
  },
  // Define `isYes` mappings for other dentist profiles
};
