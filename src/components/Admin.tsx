import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Edit, Trash, Plus, Check, X } from 'lucide-react';
import { dentists } from '../data/dentists';
import { tagDescriptions } from '../data/tags';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [pendingDentists, setPendingDentists] = useState<any[]>([]);

  useEffect(() => {
    // Fetch list of .ts and .tsx files
    // This is a mock implementation. In a real scenario, you'd need a backend service to provide this information.
    setFiles([
      'src/data/dentists.ts',
      'src/data/tags.ts',
      'src/components/DentistCard.tsx',
      'src/components/DentistProfile.tsx',
      // Add other relevant files here
    ]);

    // Mock pending dentists
    setPendingDentists([
      { id: 'pending1', name: 'Dr. John Doe', action: 'submit' },
      { id: 'pending2', name: 'Dr. Jane Smith', action: 'verify' },
    ]);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'dentist' && password === 'windy77gwn') {
      setIsAuthenticated(true);
    } else {
      alert('Invalid credentials');
    }
  };

  const handleFileSelect = (file: string) => {
    setSelectedFile(file);
    // In a real scenario, you'd fetch the file content from the server
    setFileContent(`// Content of ${file}\n// Implement actual file content fetching`);
  };

  const handleFileContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFileContent(e.target.value);
  };

  const handleSaveFile = () => {
    // Implement file saving logic
    console.log(`Saving file: ${selectedFile}`);
    console.log(fileContent);
    alert('File saved successfully');
  };

  const handleApproveDentist = (id: string) => {
    // Implement dentist approval logic
    console.log(`Approving dentist: ${id}`);
    setPendingDentists(pendingDentists.filter(dentist => dentist.id !== id));
  };

  const handleDeclineDentist = (id: string) => {
    // Implement dentist decline logic
    console.log(`Declining dentist: ${id}`);
    setPendingDentists(pendingDentists.filter(dentist => dentist.id !== id));
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Admin Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              Username
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; Back to Dentist List</Link>
        <div className="flex items-center mb-6">
          <Stethoscope className="text-blue-600 mr-2" size={32} />
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Edit Files</h2>
            <select
              className="w-full p-2 border rounded mb-4"
              value={selectedFile}
              onChange={(e) => handleFileSelect(e.target.value)}
            >
              <option value="">Select a file</option>
              {files.map((file) => (
                <option key={file} value={file}>{file}</option>
              ))}
            </select>
            {selectedFile && (
              <>
                <textarea
                  className="w-full h-64 p-2 border rounded mb-4"
                  value={fileContent}
                  onChange={handleFileContentChange}
                />
                <button
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  onClick={handleSaveFile}
                >
                  Save Changes
                </button>
              </>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Pending Dentists</h2>
            {pendingDentists.map((dentist) => (
              <div key={dentist.id} className="flex items-center justify-between mb-4 p-2 border rounded">
                <div>
                  <p className="font-semibold">{dentist.name}</p>
                  <p className="text-sm text-gray-600">{dentist.action === 'submit' ? 'New Submission' : 'Verification Request'}</p>
                </div>
                <div>
                  <button
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mr-2"
                    onClick={() => handleApproveDentist(dentist.id)}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                    onClick={() => handleDeclineDentist(dentist.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;