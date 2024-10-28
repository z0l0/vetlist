import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { dentists } from '../data/dentists';
import DentistCard from './DentistCard';
import { ChevronRight } from 'lucide-react';

// Province full names and abbreviations mapping
const provinceFullNames: { [key: string]: string } = {
  ON: 'Ontario',
  AB: 'Alberta',
  BC: 'British Columbia',
  // Add more provinces here as needed
};

// Reverse mapping for abbreviations
const provinceAbbreviations: { [key: string]: string } = Object.entries(provinceFullNames).reduce(
  (acc, [abbr, full]) => {
    acc[full.toLowerCase()] = abbr;
    return acc;
  },
  {} as { [key: string]: string }
);

const Location: React.FC = () => {
  const { location } = useParams<{ location: string }>(); // Get location from URL
  const decodedLocation = decodeURIComponent(location || '').trim();

  // Step 1: Split the location into city and province, if both exist
  const [city, provinceInput] = decodedLocation.includes(',')
    ? decodedLocation.split(',').map((part) => part.trim())
    : [decodedLocation, null];

  // Normalize province input to uppercase abbreviation
  let province = provinceInput;
  if (provinceInput) {
    const provinceKey = provinceInput.toLowerCase();
    province = provinceFullNames[provinceInput] ? provinceInput : provinceAbbreviations[provinceKey] || provinceInput;
  }

  // Get the full province name using the mapping
  const fullProvinceName = province
    ? provinceFullNames[province] || province
    : provinceFullNames[city] || city;

  // Determine if we are on a province-only page
  const isProvinceOnly = !provinceInput;

  // Step 2: Filter dentists by location
  const filteredDentists = dentists.filter((dentist) => {
    const dentistLocationParts = dentist.location.split(',').map((part) => part.trim());
    const dentistCity = dentistLocationParts[0];
    const dentistProvince = dentistLocationParts[1];

    if (isProvinceOnly) {
      // Match dentists whose province matches
      if (!dentistProvince) return false;
      return (
        dentistProvince.toLowerCase() === city.toLowerCase() ||
        provinceFullNames[dentistProvince]?.toLowerCase() === city.toLowerCase()
      );
    } else {
      // Match dentists whose city and province match
      const inputProvinceNormalized = provinceFullNames[province]
        ? province
        : provinceAbbreviations[province.toLowerCase()] || province;
      return (
        dentistCity.toLowerCase() === city.toLowerCase() &&
        (dentistProvince.toLowerCase() === inputProvinceNormalized.toLowerCase() ||
          provinceFullNames[dentistProvince]?.toLowerCase() === inputProvinceNormalized.toLowerCase())
      );
    }
  });

  // Debugging: Log filtered dentists
  console.log(`Filtering dentists for location: ${decodedLocation}`);
  console.log(`Filtered Dentists:`, filteredDentists);

  return (
    <>
      {/* Breadcrumbs */}
      <nav className="text-sm mb-6" aria-label="Breadcrumb">
        <ol className="list-reset flex text-gray-500">
          <li>
            <Link to="/" className="text-blue-600 hover:underline">
              Home
            </Link>
            <ChevronRight className="inline-block mx-2" size={14} />
          </li>
          {isProvinceOnly ? (
            <li>
              <span className="text-gray-500">{fullProvinceName} Veterinarians</span>
            </li>
          ) : (
            <>
              <li>
                <Link
                  to={`/location/${encodeURIComponent(province || '')}`}
                  className="text-blue-600 hover:underline"
                >
                  {fullProvinceName} Veterinarians
                </Link>
                <ChevronRight className="inline-block mx-2" size={14} />
              </li>
              <li>
                <span className="text-gray-500">{city} Veterinarians</span>
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* List of Veterinarians in this location */}
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">
        {isProvinceOnly ? `Veterinarians in ${fullProvinceName}` : `Veterinarians in ${decodedLocation}`}
      </h1>
      <div className="space-y-6">
        {filteredDentists.length > 0 ? (
          filteredDentists.map((dentist) => (
            <DentistCard key={dentist.id} dentist={dentist} />
          ))
        ) : (
          <p>No veterinarians found in this location.</p>
        )}
      </div>
    </>
  );
};

export default Location;
