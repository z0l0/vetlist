import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; Back to Dentist List</Link>
        <div className="flex items-center mb-6">
          <Stethoscope className="text-blue-600 mr-2" size={32} />
          <h1 className="text-2xl sm:text-3xl font-bold">About DentistList.org</h1>
        </div>
        <div className="prose max-w-none">
          <p>
            DentistList.org is the world's largest and fastest dentist directory, dedicated to connecting patients with top-quality dental care providers across the globe. Our mission is to make finding the right dentist as easy and efficient as possible, ensuring that everyone has access to the dental care they need and deserve.
          </p>
          <p>
            Founded by a team of dental professionals and tech enthusiasts, DentistList.org combines comprehensive dental information with cutting-edge technology to create a user-friendly platform that benefits both patients and dental practitioners.
          </p>
          <h2>Our Features:</h2>
          <ul>
            <li>Extensive database of dentists across various specializations</li>
            <li>Detailed dentist profiles with qualifications, services, and patient reviews</li>
            <li>Advanced search functionality to find dentists by location and specialization</li>
            <li>Verified dentist profiles for added trust and credibility</li>
            <li>Educational resources on dental health and procedures</li>
          </ul>
          <p>
            Whether you're looking for a general dentist for routine check-ups, a specialist for a specific dental issue, or exploring cosmetic dentistry options, DentistList.org is your go-to resource for all things dental.
          </p>
          <p>
            Join our growing community of satisfied patients and dental professionals. Together, we're creating smiles and improving oral health, one connection at a time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;