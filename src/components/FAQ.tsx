// src/components/FAQ.tsx

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Dentist } from '../types';
import { genericFAQs, dentistSpecificFAQs, isYesMapping } from '../data/faqData';

type FAQProps = {
  dentist: Dentist;
};

const FAQ: React.FC<FAQProps> = ({ dentist }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Fetch dentist-specific FAQs if any
  const specificFAQs = dentistSpecificFAQs[dentist.id] || [];

  // Combine specific FAQs first, then generic FAQs
  const combinedFAQs: { faq: FAQItem; type: 'specific' | 'generic'; index: number }[] = [
    ...specificFAQs.map((faq, index) => ({ faq, type: 'specific', index })),
    ...genericFAQs.map((faq, index) => ({ faq, type: 'generic', index })),
  ];

  // Toggle FAQ accordion
  const toggleFAQ = (index: number) => {
    setActiveIndex(index === activeIndex ? null : index);
  };

  return (
    <div className="space-y-4">
      {combinedFAQs.map((item, index) => {
        const { faq, type, index: faqIndex } = item;

        // Determine `isYes` based on `isYesMapping`
        const isYes = isYesMapping[dentist.id]?.[type]?.[faqIndex] ?? true;

        return (
          <div key={index} className="border border-gray-200 rounded-lg">
            <button
              className="w-full text-left p-4 flex justify-between items-center focus:outline-none"
              onClick={() => toggleFAQ(index)}
            >
              <span className="font-medium">{faq.question.replace('{name}', dentist.name)}</span>
              {activeIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {activeIndex === index && (
              <div className="p-4 bg-gray-50">
                <p>
                  {isYes
                    ? faq.answerYes.replace('{name}', dentist.name)
                    : faq.answerNo.replace('{name}', dentist.name)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FAQ;
