// src/components/SearchBar.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { SearchFilters } from '../types';
import { dentists } from '../data/dentists';
import { tagDescriptions } from '../data/tags';
import { locationDescriptions } from '../data/locations';

// Province abbreviations mapping
const provinceAbbreviations: { [key: string]: string } = {
  Ontario: 'ON',
  Alberta: 'AB',
  'British Columbia': 'BC',
  // Add more as needed
};

interface SearchBarProps {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  onSelect?: (suggestion: string) => void; // New prop for handling selection
}

const SearchBar: React.FC<SearchBarProps> = ({ filters, setFilters, onSelect }) => {
  const [specializationSuggestions, setSpecializationSuggestions] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const searchBarRef = useRef<HTMLDivElement>(null); // Ref for detecting clicks outside

  // Deduplicate specializations (case-insensitive) and preserve original casing
  const allSpecializations = useMemo(() => {
    const combined = [...dentists.flatMap(d => d.specialization), ...Object.keys(tagDescriptions)];
    const uniqueMap = new Map<string, string>();
    combined.forEach(s => {
      const key = s.toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, s);
      }
    });
    return Array.from(uniqueMap.values());
  }, [dentists, tagDescriptions]);

  // Deduplicate locations (case-insensitive) and preserve original casing
  const allLocations = useMemo(() => {
    const combined = [...dentists.map(d => d.location), ...Object.keys(locationDescriptions)];
    const uniqueMap = new Map<string, string>();
    combined.forEach(l => {
      const key = l.toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, l);
      }
    });
    return Array.from(uniqueMap.values());
  }, [dentists, locationDescriptions]);

  const allDentistNames = useMemo(() => {
    const names = dentists.map(d => d.name);
    // Deduplicate names (case-insensitive) and preserve original casing
    const uniqueMap = new Map<string, string>();
    names.forEach(n => {
      const key = n.toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, n);
      }
    });
    return Array.from(uniqueMap.values());
  }, [dentists]);

  // Normalize location strings by trimming and lowercasing
  const normalizeLocation = (location: string) => location.toLowerCase().trim();

  useEffect(() => {
    // Handle Specialization Suggestions
    if (filters.specialization.length > 0) {
      const searchTerm = filters.specialization.toLowerCase().trim();

      // Filter specializations and names based on the search term
      const specializations = allSpecializations.filter(s =>
        s.toLowerCase().includes(searchTerm)
      );
      const names = allDentistNames.filter(n =>
        n.toLowerCase().includes(searchTerm)
      );

      // Combine and deduplicate suggestions
      const combinedSuggestions = [...specializations, ...names];
      const uniqueSuggestions = Array.from(new Set(combinedSuggestions.map(s => s.toLowerCase())))
        .map(lower => combinedSuggestions.find(s => s.toLowerCase() === lower)!)
        .slice(0, 5); // Limit to top 5

      setSpecializationSuggestions(uniqueSuggestions);
    } else {
      setSpecializationSuggestions([]);
    }

    // Handle Location Suggestions
    if (filters.location.length > 0) {
      const searchLocation = normalizeLocation(filters.location);

      const matchedLocations = allLocations
        .filter(l => normalizeLocation(l).includes(searchLocation))
        .map((l) => {
          // If location is a province abbreviation, map to full name
          const provinceFullName = Object.keys(provinceAbbreviations).find(
            key => normalizeLocation(l) === normalizeLocation(provinceAbbreviations[key])
          );
          return provinceFullName ? provinceFullName : l;
        })
        .slice(0, 5); // Limit to top 5

      // Deduplicate matchedLocations (in case mapping creates duplicates)
      const uniqueMatchedLocations = Array.from(new Set(matchedLocations.map(l => l.toLowerCase())))
        .map(lower => matchedLocations.find(l => l.toLowerCase() === lower)!)
        .slice(0, 5);

      setLocationSuggestions(uniqueMatchedLocations);
    } else {
      setLocationSuggestions([]);
    }
  }, [filters.specialization, filters.location, allSpecializations, allDentistNames, allLocations]);

  // Handle clicks outside the search bar to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setSpecializationSuggestions([]);
        setLocationSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSpecializationSelect = (suggestion: string) => {
    setFilters({ ...filters, specialization: suggestion });
    if (onSelect) {
      onSelect(suggestion); // Trigger onSelect callback
    }
    setTimeout(() => {
      setSpecializationSuggestions([]); // Clear suggestions after a small delay
    }, 0);
  };

  const handleLocationSelect = (suggestion: string) => {
    const normalizedSuggestion = normalizeLocation(suggestion);
    const provinceAbbreviation = provinceAbbreviations[suggestion] || suggestion;
    setFilters({ ...filters, location: provinceAbbreviation });
    if (onSelect) {
      onSelect(suggestion); // Trigger onSelect callback
    }
    setTimeout(() => {
      setLocationSuggestions([]); // Clear suggestions after a small delay
    }, 0);
  };

  const handleClearSpecialization = () => {
    setFilters({ ...filters, specialization: '' });
    setSpecializationSuggestions([]);
  };

  const handleClearLocation = () => {
    setFilters({ ...filters, location: '' });
    setLocationSuggestions([]);
  };

  return (
    <div ref={searchBarRef} className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
      {/* Specialization / Name Search */}
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search by specialization or veterinarian name"
          className="w-full p-2 pl-10 pr-10 border rounded-md"
          value={filters.specialization}
          onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        {filters.specialization && (
          <X
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            size={20}
            onClick={handleClearSpecialization}
            aria-label="Clear specialization search"
          />
        )}
        {specializationSuggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-md shadow-lg">
            {specializationSuggestions.map((suggestion, index) => (
              <li
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSpecializationSelect(suggestion)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Location Search */}
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search by location"
          className="w-full p-2 pl-10 pr-10 border rounded-md"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        {filters.location && (
          <X
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            size={20}
            onClick={handleClearLocation}
            aria-label="Clear location search"
          />
        )}
        {locationSuggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-md shadow-lg">
            {locationSuggestions.map((suggestion, index) => (
              <li
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleLocationSelect(suggestion)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
