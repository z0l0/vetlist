# Development Notes

## Important Rules

### Build Commands
- ✅ Use `npm run build` to build the project
- ❌ **DO NOT** use `npm run dev` - it hangs and causes issues
- ✅ Use `npm run preview` after building to preview the site locally

### Development Workflow
1. Make changes to files
2. Run `npm run build` to test compilation
3. Use `npm run preview` to test locally if needed
4. Deploy built files

## Project Structure

### Key Components
- `src/components/home/Hero.astro` - Main homepage hero section with AI chat and city search
- `src/components/Header.astro` - Site header with paw print logo
- `data/vet-qa.json` - Common veterinary Q&A data for AI-style responses

### Features
- AI-style vet Q&A chat interface (placeholder for future Algolia integration)
- City search with autocomplete (placeholder for future Algolia integration)
- Responsive two-column layout
- Popular cities and country-wide browsing links