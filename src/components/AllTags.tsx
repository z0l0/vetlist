import React from 'react';
import { Link } from 'react-router-dom';
import { tagDescriptions } from '../data/tags';
import { Tag } from 'lucide-react';

const AllTags: React.FC = () => {
  const sortedTags = Object.keys(tagDescriptions).sort();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">All Specializations</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedTags.map((tag) => (
            <Link
              key={tag}
              to={`/tags/${encodeURIComponent(tag)}`}
              className="flex items-center bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm hover:bg-blue-200 transition-colors duration-300"
            >
              <Tag size={14} className="mr-2" />
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllTags;