// src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { Stethoscope, UserPlus } from 'lucide-react';
import SearchBar from './components/SearchBar';
import DentistCard from './components/DentistCard';
import { dentists } from './data/dentists';
import DentistProfile from './components/DentistProfile';
import Tags from './components/Tags';
import CityTagsPage from './components/CityTagsPage';
import Locations from './components/Locations';
import SubmitDentist from './components/SubmitDentist';
import VerifyDentist from './components/VerifyDentist';
import Admin from './components/Admin';
import About from './components/About';
import AllTags from './components/AllTags';
import ScrollToTop from './components/ScrollToTop';

function App() {
  const [filters, setFilters] = React.useState({
    specialization: '',
    location: '',
  });

  const filteredDentists = React.useMemo(() => {
    return dentists
      .filter((dentist) => {
        const specializationMatch =
          dentist.specialization.some((spec) =>
            spec.toLowerCase().includes(filters.specialization.toLowerCase())
          ) ||
          dentist.name.toLowerCase().includes(filters.specialization.toLowerCase());
        const locationMatch = dentist.location
          .toLowerCase()
          .includes(filters.location.toLowerCase());
        return specializationMatch && locationMatch;
      })
      .sort((a, b) => {
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        const weightDifference = b.profileWeight - a.profileWeight;
        if (weightDifference !== 0) return weightDifference;
        return Math.random() - 0.5;
      });
  }, [filters]);

  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <header className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center">
              <Stethoscope className="text-blue-600 mr-2" size={32} />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                VetList.org
              </h1>
            </Link>
            <Link
              to="/submit-dentist"
              className="bg-green-500 hover:bg-green-600 text-white font-bold p-2 rounded inline-flex items-center"
              title="Submit a Vet"
            >
              <UserPlus size={24} />
              <span className="hidden sm:inline ml-2">Submit a Vet</span>
            </Link>
          </header>

          <Routes>
            <Route
              path="/"
              element={
                <>
                  <SearchBar filters={filters} setFilters={setFilters} />
                  <main className="mt-4">
                    {filteredDentists.map((dentist) => (
                      <DentistCard key={dentist.id} dentist={dentist} />
                    ))}
                  </main>
                </>
              }
            />
            <Route path="/dentist/:id" element={<DentistProfile />} />
            <Route path="/tags/:city/:tag" element={<CityTagsPage />} />
            <Route path="/tags/:tag" element={<Tags />} />
            <Route path="/location/:location" element={<Locations />} />
            <Route path="/submit-dentist" element={<SubmitDentist />} />
            <Route path="/verify-dentist/:id" element={<VerifyDentist />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/about" element={<About />} />
            <Route path="/all-tags" element={<AllTags />} />
          </Routes>

          <footer className="mt-8 text-center text-gray-600">
            <Link to="/about" className="hover:text-blue-600 mr-4">
              About
            </Link>
            <Link to="/all-tags" className="hover:text-blue-600 mr-4">
              All Specializations
            </Link>
            <Link to="/admin" className="hover:text-blue-600">
              Admin
            </Link>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
