import React from 'react';
import { Link } from 'react-router-dom';
import { locationDescriptions } from '../data/locations';
import { MapPin } from 'lucide-react';

const AllLocations: React.FC = () => {
  const sortedLocations = Object.keys(locationDescriptions).sort();
  const cities = sortedLocations.filter(loc => loc.includes(', '));
  const provinces = sortedLocations.filter(loc => !loc.includes(', '));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">All Locations</h1>
        
        <h2 className="text-xl font-semibold mb-4">Provinces</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {provinces.map((province) => (
            <Link
              key={province}
              to={`/location/${encodeURIComponent(province)}`}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <MapPin size={14} className="mr-1" />
              {province}
            </Link>
          ))}
        </div>

        <h2 className="text-xl font-semibold mb-4">Cities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cities.map((city) => (
            <Link
              key={city}
              to={`/location/${encodeURIComponent(city)}`}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <MapPin size={14} className="mr-1" />
              {city}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllLocations;