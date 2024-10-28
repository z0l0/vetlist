// src/components/DentistCard.tsx

import React from 'react';
import { Clock, MapPin, Tag, CheckCircle } from 'lucide-react';
import { Dentist } from '../types';
import { Link } from 'react-router-dom';

interface DentistCardProps {
  dentist: Dentist;
}

const DentistCard: React.FC<DentistCardProps> = ({ dentist }) => {
  const placeholderImage =
    'https://images.unsplash.com/photo-1629909615184-74f495363b67?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80';

  // Safely split the location into city and province
  const locationParts = dentist.location.split(', ');
  const city = locationParts[0]?.trim() || '';
  const province = locationParts[1]?.trim() || '';

  // Log the extracted city and province
  console.log(`Card Dentist ID: ${dentist.id}`);
  console.log(`City: "${city}"`);
  console.log(`Province: "${province}"`);

  // Use full province name directly
  const fullProvinceName = province;

  // Build the cityWithProvince string with space after comma
  const cityWithProvince = province ? `${city}, ${fullProvinceName}` : city;

  // Log the constructed URL parts
  console.log(`CityWithProvince: "${cityWithProvince}"`);
  console.log(`Encoded CityWithProvince URL: "${encodeURIComponent(cityWithProvince)}"`);

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 hover:shadow-lg transition-shadow duration-300 ${
        dentist.isVerified ? 'border-2 border-blue-500' : ''
      }`}
    >
      <Link
        to={`/dentist/${dentist.id}`}
        className="block bg-blue-50 rounded-full p-4 mb-4 hover:bg-blue-100 transition-colors duration-300"
      >
        <div className="flex items-center">
          <div className="relative flex-shrink-0">
            <img
              src={dentist.picture}
              alt={dentist.name}
              className={`w-16 h-16 rounded-full object-cover ${
                dentist.isVerified ? 'border-4 border-blue-600' : ''
              }`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = placeholderImage;
              }}
            />
          </div>
          <div className="ml-4">
            <h2 className="text-lg sm:text-xl font-semibold text-blue-800">
              {dentist.name}
            </h2>
            <p className="text-sm text-blue-600">{dentist.description}</p>
          </div>
        </div>
      </Link>
      <div className="flex items-center mb-2 text-sm">
        <Clock className="mr-2 text-gray-500 flex-shrink-0" size={16} />
        <span>{dentist.hoursOfOperation}</span>
      </div>
      <div className="flex items-center mb-2 text-sm">
        <MapPin className="mr-2 text-gray-500 flex-shrink-0" size={16} />
        {/* Ensure both city and province are included in the URL */}
        <Link
          to={`/location/${encodeURIComponent(cityWithProvince)}`}
          className="text-blue-600 hover:text-blue-800 mr-1"
        >
          {city}
        </Link>
        {fullProvinceName && (
          <>
            <span className="mr-1">,</span>
            <Link
              to={`/location/${encodeURIComponent(fullProvinceName)}`}
              className="text-blue-600 hover:text-blue-800"
            >
              {fullProvinceName}
            </Link>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {dentist.isVerified && (
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center">
            <CheckCircle size={12} className="mr-1" />
            Verified
          </span>
        )}
        {dentist.specialization.map((spec, index) => (
          <Link
            key={index}
            to={`/tags/${encodeURIComponent(city)}/${encodeURIComponent(spec)}`}
            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center hover:bg-blue-200 transition-colors duration-300"
          >
            <Tag size={12} className="mr-1" />
            {spec}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DentistCard;
