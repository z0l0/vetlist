// src/components/Locations.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { dentists } from '../data/dentists';
import { locationDescriptions } from '../data/locations';
import { tagDescriptions } from '../data/tags';
import DentistCard from './DentistCard';
import SearchBar from './SearchBar';
import { SearchFilters } from '../types';

interface BreadcrumbItem {
  label: string;
  to?: string; // If 'to' is provided, render as Link; otherwise, render as plain text
}

const Locations: React.FC = () => {
  const { location } = useParams<{ location: string }>();
  const navigate = useNavigate();
  const decodedLocation = decodeURIComponent(location || '').trim();

  // Determine if the page is Province-Level or City-Level
  const isProvincePage = !decodedLocation.includes(',');

  // Split the location into city and province if it's a City-Level page
  const [city, province] = isProvincePage
    ? [null, decodedLocation]
    : decodedLocation.split(',').map(part => part.trim());

  // Define breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', to: '/' },
  ];

  if (!isProvincePage && province) {
    // City-Level Page
    // Add Province as a link
    breadcrumbItems.push({
      label: `${province} Veterinarians`,
      to: `/location/${encodeURIComponent(province)}`,
    });

    // Add City as plain text (current page)
    breadcrumbItems.push({
      label: `${city} Veterinarians`,
    });
  } else if (isProvincePage && province) {
    // Province-Level Page
    // Add Province as plain text (current page)
    breadcrumbItems.push({
      label: `${province} Veterinarians`,
    });
  }

  // Get the location description
  const locationDescription = isProvincePage
    ? locationDescriptions[province || '']
    : locationDescriptions[`${city}, ${province}`];

  // Define allSpecializations and allLocations using useMemo
  const allSpecializations = useMemo(() => {
    return [...new Set([...dentists.flatMap(d => d.specialization), ...Object.keys(tagDescriptions)])];
  }, []);

  const allLocations = useMemo(() => {
    return [...new Set([...dentists.map(d => d.location), ...Object.keys(locationDescriptions)])];
  }, []);

  // Manage Search Filters
  const [filters, setFilters] = useState<SearchFilters>({ specialization: '', location: '' });

  // Enhance related dentists by filtering and sorting
  const filteredDentists = useMemo(() => {
    if (isProvincePage) {
      // Province-Level Page: Filter vets in the same province
      return dentists.filter(d => {
        const dProvince = d.location.split(', ')[1]?.trim().toLowerCase() || '';
        return d.location.toLowerCase().endsWith(`, ${province?.toLowerCase()}`);
      });
    } else {
      // City-Level Page: Filter vets in the same city
      return dentists.filter(d => {
        return d.location.toLowerCase() === decodedLocation.toLowerCase();
      });
    }
  }, [isProvincePage, province, decodedLocation]);

  const sortedDentists = useMemo(() => {
    const sorted = [...filteredDentists].sort((a, b) => {
      // Secondary sort: isVerified (true first)
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;

      // Tertiary sort: profileWeight (higher first)
      if (a.profileWeight > b.profileWeight) return -1;
      if (a.profileWeight < b.profileWeight) return 1;

      // Quaternary sort: random
      return Math.random() - 0.5;
    });

    // Limit to top 5
    return sorted.slice(0, 5);
  }, [filteredDentists]);

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

      {/* Breadcrumbs */}
      <nav className="text-sm mb-6 flex overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
        <ol className="flex text-gray-500">
          {breadcrumbItems.map((item, index) => (
            <li key={index} className="flex items-center">
              {item.to ? (
                <Link to={item.to} className="text-blue-600 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-500">{item.label}</span>
              )}
              {index < breadcrumbItems.length - 1 && (
                <ChevronRight className="inline-block mx-2" size={14} />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Page Heading */}
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">
        {isProvincePage ? `Veterinarians in ${province}` : `Veterinarians in ${city}, ${province}`}
      </h1>

      {/* Location Description Subheading */}
      {locationDescription && (
        <p className="text-sm text-gray-600 mb-6">
          {locationDescription}
        </p>
      )}

      {/* Veterinarian Listings */}
      <div className="space-y-6">
        {sortedDentists.length > 0 ? (
          sortedDentists.map((dentist) => (
            <DentistCard key={dentist.id} dentist={dentist} />
          ))
        ) : (
          <p className="text-gray-600">No veterinarians found in this location.</p>
        )}
      </div>
    </>
  );
};

export default Locations;
