// src/components/Tags.tsx

import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Tag as TagIcon, ChevronRight } from 'lucide-react';
import { dentists } from '../data/dentists';
import { tagDescriptions, relatedTags } from '../data/tags';
import DentistCard from './DentistCard';
import SearchBar from './SearchBar';
import { SearchFilters } from '../types';

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Reference Location (e.g., Calgary, Alberta)
const referenceLocation = {
  lat: 51.0447,
  lon: -114.0719,
};

const Tags: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const decodedTag = decodeURIComponent(tag || '');

  // Define allSpecializations and allLocations using useMemo
  const allSpecializations = useMemo(() => {
    return [...new Set([...dentists.flatMap(d => d.specialization), ...Object.keys(tagDescriptions)])];
  }, []);

  const allLocations = useMemo(() => {
    return [...new Set([...dentists.map(d => d.location), ...Object.keys(tagDescriptions)])];
  }, []);

  // Manage Search Filters
  const [filters, setFilters] = useState<SearchFilters>({ specialization: '', location: '' });

  // Get the tag description
  const description =
    tagDescriptions[decodedTag] ||
    'Specialized veterinary care focusing on specific treatments and procedures.';
  const related = relatedTags[decodedTag] || [];

  // Filter dentists by specialization
  const filteredDentists = useMemo(() => {
    return dentists.filter((dentist) =>
      dentist.specialization.includes(decodedTag)
    );
  }, [decodedTag]);

  // Enhance dentists with distance from reference location
  const enhancedDentists = useMemo(() => {
    return filteredDentists.map((dentist) => ({
      ...dentist,
      distance: calculateDistance(
        referenceLocation.lat,
        referenceLocation.lon,
        dentist.mapCoordinates.lat,
        dentist.mapCoordinates.lon
      ),
    }));
  }, [filteredDentists]);

  // Sort the enhanced dentists
  const sortedDentists = useMemo(() => {
    const sorted = [...enhancedDentists].sort((a, b) => {
      // Secondary sort: isVerified (true first)
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;

      // Tertiary sort: profileWeight (higher first)
      if (a.profileWeight > b.profileWeight) return -1;
      if (a.profileWeight < b.profileWeight) return 1;

      // Quaternary sort: distance (ascending)
      if (a.distance < b.distance) return -1;
      if (a.distance > b.distance) return 1;

      // Quinary sort: random
      return Math.random() - 0.5;
    });

    return sorted;
  }, [enhancedDentists]);

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

      {/* Page Heading */}
      <h1 className="text-xl sm:text-2xl font-bold mb-2">
        Veterinarians specializing in {decodedTag.toLowerCase()}
      </h1>
      <p className="text-gray-600 text-sm mb-6">{description}</p>
      {sortedDentists.length === 0 ? (
        <p className="text-center text-gray-600">
          No veterinarians found with this specialization.
        </p>
      ) : (
        <div className="space-y-6">
          {sortedDentists.map((dentist) => (
            <DentistCard key={dentist.id} dentist={dentist} />
          ))}
        </div>
      )}

      {related.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4">Related Specializations</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((relatedTag) => (
              <Link
                key={relatedTag}
                to={`/tags/${encodeURIComponent(relatedTag)}`}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center hover:bg-blue-200 transition-colors duration-300"
              >
                <TagIcon size={14} className="mr-1" />
                {relatedTag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Tags;
