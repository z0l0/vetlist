// src/types.ts

export interface SearchFilters {
  specialization: string;
  location: string;
}

export interface Dentist {
  id: number;
  name: string;
  description: string;
  detailedDescription: string;
  hoursOfOperation: string;
  specialization: string[];
  picture: string;
  location: string;
  phoneNumber: string;
  emailAddress: string | null;
  address: string;
  website: string | null;
  socialMedia: {
    instagram: string | null;
    twitter: string | null;
    facebook: string | null;
  };
  mapCoordinates: {
    lat: number;
    lon: number;
  };
  isVerified: boolean;
  profileWeight: number;
}
