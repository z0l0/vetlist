# Requirements Document: City-Focused VetList Redesign

## Introduction

This specification defines the requirements for transforming VetList.org from a profile-centric directory with 30,000+ thin pages into a city-focused directory with ~500 high-value, filterable city pages. The redesign eliminates AI-generated content (already completed), improves user experience with visual filters and cards, and provides more useful information for pet owners searching for veterinary services.

## Glossary

- **System**: The VetList.org web application
- **City Page**: A directory page showing all veterinary clinics in a specific city
- **Profile Page**: Individual veterinary clinic detail pages (to be eliminated)
- **Vet Card**: A compact, scannable card component displaying clinic information
- **Filter System**: Interactive UI allowing users to filter clinics by services, animals, and status
- **Claimed Listing**: A veterinary clinic profile verified and managed by the business owner
- **Open Now Status**: Real-time indication of whether a clinic is currently open based on hours
- **Animal Icons**: Visual emoji/icon representations of animals treated by clinics
- **Service Icons**: Visual emoji/icon representations of services offered by clinics

---

## Requirements

### Requirement 1: Data Cleanup ✅ COMPLETED

**User Story:** As a site administrator, I want to remove AI-generated content and optimize data storage, so that the site loads faster and provides genuine, useful information.

#### Acceptance Criteria

1. ✅ COMPLETED: Removed "detailed_description", "description", and "faqs" columns from all CSV files
2. THE System SHALL parse specialization data to extract service types and animal types
3. THE System SHALL use emoji icons for visual representation of animals (🐕 🐈 🐴 🦎 🐹 🐦 🐠)
4. THE System SHALL use emoji icons for visual representation of services (🚑 💉 🦷 🔬 🏠 📹)

### Requirement 2: City Page Enhancement

**User Story:** As a pet owner, I want to see all veterinary clinics in my city on one page with easy filtering, so that I can quickly compare options and find the right vet for my needs.

#### Acceptance Criteria

1. WHEN a user navigates to a city page, THE System SHALL display all veterinary clinics for that city in a card-based grid layout
2. WHEN the System renders a city page, THE System SHALL show a maximum of 36 clinics in the primary grid with remaining clinics in a simplified list below
3. WHEN the System displays clinic cards, THE System SHALL show claimed/verified clinics at the top of the list
4. WHEN the System renders clinic information, THE System SHALL display address, phone, hours, services, animals treated, and specialties in a scannable format
5. WHEN a user views a city page, THE System SHALL provide an interactive map showing all clinic locations with markers
6. WHEN the System displays hours of operation, THE System SHALL calculate and show "Open Now" or "Closed" status based on current time
7. WHEN the System renders a city page, THE System SHALL include a sticky filter bar for services, animals, and status

### Requirement 3: Vet Card Design

**User Story:** As a pet owner, I want to quickly scan clinic information in an easy-to-read card format, so that I can efficiently compare multiple options without clicking through to separate pages.

#### Acceptance Criteria

1. WHEN the System renders a vet card, THE System SHALL display the clinic name, address (street only), phone number, and website in a compact layout
2. WHEN the System shows clinic hours, THE System SHALL display current day's hours and real-time open/closed status with a colored indicator
3. WHEN the System displays services, THE System SHALL show up to 6 key services with emoji icons
4. WHEN the System shows animals treated, THE System SHALL display animal emoji icons in a single row
5. WHEN a clinic has specialties, THE System SHALL list up to 5 specialties with bullet points
6. WHEN the System renders action buttons, THE System SHALL provide "Call Now", "Get Directions", and "Visit Website" buttons with appropriate icons
7. WHEN a clinic is claimed/verified, THE System SHALL display a prominent verified badge on the card
8. WHEN the System renders a vet card, THE System SHALL include "Claim this listing" and "Report incorrect info" links

### Requirement 4: Filter System Implementation

**User Story:** As a pet owner, I want to filter veterinary clinics by the services I need and animals I have, so that I only see relevant options.

#### Acceptance Criteria

1. WHEN a user interacts with filters, THE System SHALL provide status filters (Open Now, 24/7 Emergency, Accepting New Patients)
2. WHEN a user interacts with filters, THE System SHALL provide service filters (House Calls, Virtual Visits, Surgery, Dental, Diagnostics, Boarding, Euthanasia)
3. WHEN a user interacts with filters, THE System SHALL provide animal type filters (Dogs, Cats, Horses, Exotic Pets, Small Animals, Birds, Fish/Aquatic)
4. WHEN a user selects multiple filters, THE System SHALL apply AND logic to show only clinics matching all selected criteria
5. WHEN the System applies filters, THE System SHALL update results immediately without page reload
6. WHEN the System displays filters, THE System SHALL show the count of matching results for each filter option
7. WHEN a user scrolls the page, THE System SHALL keep the filter bar visible at the top of the viewport

### Requirement 5: Profile Page Elimination and Redirects

**User Story:** As a site administrator, I want to redirect all profile page URLs to their respective city pages, so that existing links continue to work and SEO value is preserved.

#### Acceptance Criteria

1. WHEN a user navigates to a profile page URL, THE System SHALL redirect to the corresponding city page with a 301 (permanent) redirect
2. WHEN the System performs a redirect, THE System SHALL append an anchor link to scroll to the specific clinic card
3. WHEN the System generates a sitemap, THE System SHALL exclude all profile page URLs
4. WHEN the System generates a sitemap, THE System SHALL include only city page URLs
5. WHEN the System builds the site, THE System SHALL not generate profile page files

### Requirement 6: Schema and SEO Optimization

**User Story:** As a site administrator, I want proper schema markup and SEO optimization on city pages, so that Google displays rich snippets and indexes pages correctly.

#### Acceptance Criteria

1. WHEN the System renders a city page, THE System SHALL include ItemList schema with all clinic listings
2. WHEN the System generates schema for a clinic, THE System SHALL include VeterinaryCare type with complete address, phone, hours, and services
3. WHEN the System includes rating data in schema, THE System SHALL provide numeric ratingCount and reviewCount values (not strings)
4. WHEN the System generates opening hours schema, THE System SHALL include only one time range per day to avoid validation errors
5. WHEN the System renders meta tags, THE System SHALL include proper title, description, and Open Graph tags for city pages
6. WHEN the System generates canonical URLs, THE System SHALL ensure all URLs end with trailing slashes

### Requirement 7: Claim System Integration

**User Story:** As a veterinary clinic owner, I want to claim my listing directly from the city page, so that I can verify my information and add unique content.

#### Acceptance Criteria

1. WHEN a user clicks "Claim this listing" on a vet card, THE System SHALL open the claim form with the clinic information pre-populated
2. WHEN a clinic owner claims a listing, THE System SHALL update the "claimed" field in the database
3. WHEN a claimed listing is displayed, THE System SHALL show a verified badge with green styling and shield icon
4. WHEN the System sorts clinics on a city page, THE System SHALL place claimed listings at the top
5. WHEN a claimed clinic is displayed, THE System SHALL show any unique content added by the owner (stories, specialties, established year)

### Requirement 8: Mobile Responsiveness

**User Story:** As a mobile user, I want the city page to work perfectly on my phone, so that I can find vets while on the go.

#### Acceptance Criteria

1. WHEN a user views a city page on mobile, THE System SHALL display vet cards in a single column layout
2. WHEN a user views filters on mobile, THE System SHALL provide a collapsible filter menu or horizontal scroll
3. WHEN a user views the map on mobile, THE System SHALL provide a smaller default size with option to expand to full screen
4. WHEN a user views action buttons on mobile, THE System SHALL stack buttons vertically for easy tapping
5. WHEN a user views hours on mobile, THE System SHALL show condensed format with just today's hours and open/closed status

### Requirement 9: Map Integration

**User Story:** As a pet owner, I want to see all veterinary clinics on an interactive map, so that I can find clinics near my location.

#### Acceptance Criteria

1. WHEN the System renders a city page, THE System SHALL display an interactive map with markers for all clinics
2. WHEN a user clicks a map marker, THE System SHALL show a popup with clinic name, address, phone, and "View Details" button
3. WHEN a user clicks "View Details" in a map popup, THE System SHALL scroll to the corresponding clinic card
4. WHEN the System displays map markers, THE System SHALL use color coding (green for open, red for closed, blue for 24/7, gold for verified)
5. WHEN multiple clinics are close together, THE System SHALL cluster markers when zoomed out
6. WHEN a user interacts with the map, THE System SHALL provide a toggle to show/hide the map to save screen space

### Requirement 10: Performance Optimization

**User Story:** As a site administrator, I want city pages to load quickly, so that users have a good experience and search engines rank pages higher.

#### Acceptance Criteria

1. WHEN the System builds city pages, THE System SHALL use static generation with data caching
2. WHEN the System loads images, THE System SHALL use icon SVGs instead of hotlinked images where possible
3. WHEN the System renders a city page, THE System SHALL lazy load the map component
4. WHEN the System displays more than 30 clinics, THE System SHALL implement pagination or "Load More" functionality
5. WHEN the System applies filters, THE System SHALL use client-side JavaScript for instant results without server requests
