import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Stethoscope, CheckCircle, Star, TrendingUp, Search, Award, Users } from 'lucide-react';
import { dentists } from '../data/dentists';

const VerifyDentist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dentist = dentists.find((d) => d.id === Number(id));

  const [formData, setFormData] = useState({
    name: dentist?.name || '',
    licenseNumber: '',
    yearsOfPractice: '',
    website: '',
    additionalCredentials: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    console.log('Verification form submitted:', formData);
    alert('Thank you for submitting your verification request! We will review your information shortly.');
  };

  if (!dentist) {
    return <div>Dentist not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <Link to={`/dentist/${id}`} className="text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; Back to Dentist Profile</Link>
        <div className="flex items-center mb-6">
          <Stethoscope className="text-blue-600 mr-2" size={32} />
          <h1 className="text-2xl sm:text-3xl font-bold">Verify Your Dental Practice</h1>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Elevate Your Practice with Verified Status</h2>
          <p className="text-gray-600 mb-4">
            Stand out from the crowd and attract more patients by verifying your dental practice on DentistList.org. 
            For just $29 a month or $299 a year, you can unlock a suite of benefits designed to boost your online presence and grow your practice.
          </p>
          <ul className="space-y-2">
            <li className="flex items-center"><TrendingUp className="text-green-500 mr-2" size={20} /> Enhanced Visibility: Your profile will be highlighted and appear higher in search results.</li>
            <li className="flex items-center"><Users className="text-green-500 mr-2" size={20} /> Increased Patient Inquiries: Verified profiles receive up to 5x more patient inquiries.</li>
            <li className="flex items-center"><Search className="text-green-500 mr-2" size={20} /> SEO Boost: Improve your search engine rankings with a verified profile.</li>
            <li className="flex items-center"><CheckCircle className="text-green-500 mr-2" size={20} /> Trust Badge: Display a verified badge to build trust with potential patients.</li>
            <li className="flex items-center"><Star className="text-green-500 mr-2" size={20} /> Patient Reviews: Collect and showcase patient reviews to boost credibility.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Practice Name</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">Dental License Number</label>
            <input type="text" id="licenseNumber" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="yearsOfPractice" className="block text-sm font-medium text-gray-700">Years of Practice</label>
            <input type="number" id="yearsOfPractice" name="yearsOfPractice" value={formData.yearsOfPractice} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700">Practice Website</label>
            <input type="url" id="website" name="website" value={formData.website} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="additionalCredentials" className="block text-sm font-medium text-gray-700">Additional Credentials or Certifications</label>
            <textarea id="additionalCredentials" name="additionalCredentials" value={formData.additionalCredentials} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"></textarea>
          </div>
          <div>
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Submit Verification Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyDentist;