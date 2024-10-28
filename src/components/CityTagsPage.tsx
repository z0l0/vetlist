// src/components/CityTagsPage.tsx

import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Tag as TagIcon } from 'lucide-react';
import { dentists } from '../data/dentists';
import { tagDescriptions, relatedTags } from '../data/tags';
import DentistCard from './DentistCard';
import SearchBar from './SearchBar';
import { SearchFilters } from '../types';

const CityTagsPage: React.FC = () => {
  const { city, tag } = useParams<{ city: string; tag: string }>();
  const navigate = useNavigate();
  const decodedCity = decodeURIComponent(city || '').trim().toLowerCase();
  const decodedTag = decodeURIComponent(tag || '').trim().toLowerCase();

  // Define allSpecializations and allLocations using useMemo
  const allSpecializations = useMemo(() => {
    return [...new Set([...dentists.flatMap(d => d.specialization), ...Object.keys(tagDescriptions)])];
  }, []);

  const allLocations = useMemo(() => {
    return [...new Set([...dentists.map(d => d.location), ...Object.keys(tagDescriptions)])];
  }, []);

  // Manage Search Filters
  const [filters, setFilters] = useState<SearchFilters>({ specialization: '', location: '' });

  // Filter dentists by city and specialization
  const filteredDentists = useMemo(() => {
    return dentists.filter((d) => {
      const dentistCity = d.location.split(', ')[0]?.trim().toLowerCase();
      const specializations = d.specialization.map((spec) => spec.toLowerCase());

      return dentistCity === decodedCity && specializations.includes(decodedTag);
    });
  }, [decodedCity, decodedTag]);

  // Extract province from the first matching dentist
  const province = filteredDentists.length > 0
    ? filteredDentists[0].location.split(', ')[1]?.trim() || ''
    : '';

  // Construct URLs for breadcrumbs
  const provinceURL = `/location/${encodeURIComponent(province)}`;
  const cityWithProvince = `${decodeURIComponent(city)}, ${province}`;
  const cityURL = `/location/${encodeURIComponent(cityWithProvince)}`;

  // Handle selection from SearchBar
  const handleSearchSelect = (suggestion: string) => {
    // Check if the suggestion matches a dentist's name
    const selectedDentist = dentists.find(
      (d) => d.name.toLowerCase() === suggestion.toLowerCase()
    );

    if (selectedDentist) {
      // Navigate to the selected dentist's profile
      navigate(`/dentist/${selectedDentist.id}`);
      return;
    }

    // Check if the suggestion matches a specialization
    const specializationMatch = allSpecializations.find(
      (s) => s.toLowerCase() === suggestion.toLowerCase()
    );

    if (specializationMatch) {
      navigate(`/tags/${encodeURIComponent(specializationMatch)}`);
      return;
    }

    // Check if the suggestion matches a location
    const locationMatch = allLocations.find(
      (l) => l.toLowerCase() === suggestion.toLowerCase()
    );
    if (locationMatch) {
      navigate(`/location/${encodeURIComponent(locationMatch)}`);
      return;
    }

    // If no match found, optionally navigate to a generic search page or show a message
    // For now, we'll do nothing
  };

  return (
    <>
      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          filters={filters}
          setFilters={setFilters}
          onSelect={handleSearchSelect}
        />
      </div>

      {/* Breadcrumb */}
      <nav
        className="text-sm mb-6 flex overflow-x-auto whitespace-nowrap"
        aria-label="Breadcrumb"
      >
        <ol className="flex text-gray-500">
          <li>
            <Link to="/" className="text-blue-600 hover:underline">
              Home
            </Link>
            <ChevronRight className="inline-block mx-2" size={14} />
          </li>
          {province && (
            <li>
              <Link
                to={provinceURL}
                className="text-blue-600 hover:underline"
              >
                {province} Veterinarians
              </Link>
              <ChevronRight className="inline-block mx-2" size={14} />
            </li>
          )}
          {city && province && (
            <li>
              <Link to={cityURL} className="text-blue-600 hover:underline">
                {decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1)} Veterinarians
              </Link>
              <ChevronRight className="inline-block mx-2" size={14} />
            </li>
          )}
          <li>
            <span className="text-gray-500">
              {decodedTag.charAt(0).toUpperCase() + decodedTag.slice(1)}
            </span>
          </li>
        </ol>
      </nav>

      {/* Page Heading */}
      <h1 className="text-2xl font-bold mb-4">
        {decodedTag.charAt(0).toUpperCase() + decodedTag.slice(1)} in{' '}
        {decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1)}
      </h1>
      {filteredDentists.length > 0 ? (
        <div className="space-y-4">
          {filteredDentists.map((dentist) => (
            <DentistCard key={dentist.id} dentist={dentist} />
          ))}
        </div>
      ) : (
        <div className="text-gray-600">
          No veterinarians found for the "{decodedTag}" specialization in{' '}
          {decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1)}.
        </div>
      )}
    </>
  );
};

export default CityTagsPage;
