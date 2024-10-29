import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Tag,
  Phone,
  Mail,
  Instagram,
  Twitter,
  Facebook,
  CheckCircle,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { Dentist, SearchFilters } from '../types';
import { dentists } from '../data/dentists';
import DentistCard from './DentistCard';
import FAQ from './FAQ';
import SearchBar from './SearchBar';
import { tagDescriptions } from '../data/tags';
import { locationDescriptions } from '../data/locations';

const DentistProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dentist = dentists.find((d) => d.id === Number(id));
  const [filters, setFilters] = useState<SearchFilters>({ specialization: '', location: '' });

  if (!dentist) {
    return <div className="text-center text-gray-600">Vet not found</div>;
  }

  const locationParts = dentist.location.split(', ');
  const city = locationParts[0]?.trim() || '';
  const province = locationParts[1]?.trim() || '';
  const cityWithProvince = `${city}, ${province}`;
  const cityProvinceURL = `/location/${encodeURIComponent(cityWithProvince)}`;
  const dentistSpecializationsLower = dentist.specialization.map(spec =>
    spec.toLowerCase().trim()
  );

  const allSpecializations = useMemo(() => {
    return [...new Set([...dentists.flatMap(d => d.specialization), ...Object.keys(tagDescriptions)])];
  }, []);

  const allLocations = useMemo(() => {
    return [...new Set([...dentists.map(d => d.location), ...Object.keys(locationDescriptions)])];
  }, []);

  const relatedDentists = useMemo(() => {
    const related = dentists
      .filter(
        (d) =>
          d.id !== dentist.id &&
          d.specialization.some((spec) =>
            dentistSpecializationsLower.includes(spec.toLowerCase().trim())
          )
      )
      .map((d) => {
        let proximityPriority = 3; 
        if (d.location === dentist.location) {
          proximityPriority = 1; 
        } else if (d.location.split(', ')[1]?.trim() === province) {
          proximityPriority = 2; 
        }

        return {
          ...d,
          proximityPriority,
        };
      })
      .sort((a, b) => {
        if (a.proximityPriority < b.proximityPriority) return -1;
        if (a.proximityPriority > b.proximityPriority) return 1;
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        if (a.profileWeight > b.profileWeight) return -1;
        if (a.profileWeight < b.profileWeight) return 1;
        return Math.random() - 0.5;
      })
      .slice(0, 5); 

    console.log('Related vets after filtering and sorting:', related);
    return related;
  }, [dentist, dentists, province, dentistSpecializationsLower]);

  const mapUrl = `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${dentist.mapCoordinates.lon},${dentist.mapCoordinates.lat}&z=15&l=map&size=600,400&pt=${dentist.mapCoordinates.lon},${dentist.mapCoordinates.lat},pm2rdm`;

  const handleSearchSelect = (suggestion: string) => {
    const selectedDentist = dentists.find(
      (d) => d.name.toLowerCase() === suggestion.toLowerCase()
    );

    if (selectedDentist) {
      navigate(`/dentist/${selectedDentist.id}`);
      return;
    }

    const specializationMatch = allSpecializations.find(
      (s) => s.toLowerCase() === suggestion.toLowerCase()
    );

    if (specializationMatch) {
      navigate(`/tags/${encodeURIComponent(specializationMatch)}`);
      return;
    }

    const locationMatch = allLocations.find(
      (l) => l.toLowerCase() === suggestion.toLowerCase()
    );
    if (locationMatch) {
      navigate(`/location/${encodeURIComponent(locationMatch)}`);
      return;
    }
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
                to={`/location/${encodeURIComponent(province)}`}
                className="text-blue-600 hover:underline"
              >
                {province} Veterinarians
              </Link>
              <ChevronRight className="inline-block mx-2" size={14} />
            </li>
          )}
          {city && province && (
            <li>
              <Link to={cityProvinceURL} className="text-blue-600 hover:underline">
                {city} Veterinarians
              </Link>
              <ChevronRight className="inline-block mx-2" size={14} />
            </li>
          )}
          <li>
            <span className="text-gray-500">{dentist.name}</span>
          </li>
        </ol>
      </nav>

      {/* Vet Profile */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start mb-4">
          <div className="relative mb-4 md:mb-0 md:mr-6 flex-shrink-0">
            <div className="w-32 h-32 rounded-full overflow-hidden">
              <img
                src={dentist.picture}
                alt={dentist.name}
                className={`w-full h-full object-cover rounded-full ${
                  dentist.isVerified ? 'border-4 border-blue-600' : ''
                }`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src =
                    'https://images.unsplash.com/photo-1629909615184-74f495363b67?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80';
                }}
              />
            </div>
            {dentist.isVerified && (
              <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1">
                <CheckCircle size={20} />
              </div>
            )}
          </div>
          <div className="flex-grow">
            <h1 className="text-3xl font-bold mb-2">{dentist.name}</h1>
            <p className="text-gray-600 mb-2">{dentist.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Contact Information</h2>
            <div className="space-y-2">
  <p className="flex items-center">
    <Phone className="mr-2 text-gray-500" size={18} />
    {dentist.phoneNumber}
  </p>
  {dentist.website && (
    <p className="flex items-center">
      <Globe className="mr-2 text-gray-500" size={18} />
      <a
        href={dentist.website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800"
      >
        {new URL(dentist.website).hostname}
      </a>
    </p>
  )}
  {dentist.emailAddress && (  // Conditionally render the email field
    <p className="flex items-center">
      <Mail className="mr-2 text-gray-500" size={18} />
      {dentist.emailAddress}
    </p>
  )}
  <p className="flex items-center">
    <Clock className="mr-2 text-gray-500" size={18} />
    {dentist.hoursOfOperation}
  </p>
</div>

            <div className="mt-4 flex space-x-4">
              {dentist.socialMedia.instagram && (
                <a
                  href={dentist.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="text-gray-500 hover:text-blue-600" size={24} />
                </a>
              )}
              {dentist.socialMedia.twitter && (
                <a
                  href={dentist.socialMedia.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="text-gray-500 hover:text-blue-600" size={24} />
                </a>
              )}
              {dentist.socialMedia.facebook && (
                <a
                  href={dentist.socialMedia.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="text-gray-500 hover:text-blue-600" size={24} />
                </a>
              )}
            </div>
            {!dentist.isVerified && (
              <div className="mt-4">
                <Link
                  to={`/verify-dentist/${dentist.id}`}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
                >
                  <CheckCircle className="mr-2" size={20} />
                  Verify this Vet
                </Link>
              </div>
            )}
          </div>
          <div>
            <p className="flex items-center mb-2">
              <MapPin className="mr-2 text-gray-500" size={18} />
              {dentist.address}
            </p>
            <img
              src={mapUrl}
              alt="Vet location"
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>
        </div>

        {/* About Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2">About {dentist.name}</h2>
          <div className="h-40 overflow-y-auto border rounded p-2">
            <p>{dentist.detailedDescription}</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      {dentist.isVerified && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
          <FAQ dentist={dentist} />
        </div>
      )}

      {/* Related Vets */}
      {relatedDentists.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Related Veterinarians</h2>
          <div className="space-y-4">
            {relatedDentists.map((relatedDentist) => (
              <DentistCard key={relatedDentist.id} dentist={relatedDentist} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default DentistProfile;
