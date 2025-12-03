# Avenue - On Earth As In Heaven

Avenue is a democratized movement of people following Jesus, convinced that disciple-making doesn't require more church buildings, just the willingness to open the spaces we already have.

## Getting Started

### 1. Add Required Images

Place the following images in the `public/images/` folder:

- `Avenue.png` - Logo
- `home_page_earth.jpg` - Earth globe for home page
- `vision_page_earth_horizon_day.png` - Earth horizon (day) for vision page
- `vision_avenue_orbit.png` - Avenue orbit diagram
- `pathways_earth_horizon_nights.png` - Earth at night for pathways page
- `intersection_diagram.png` - Intersection diagram
- `streetlights_stary_sky.png` - Starry sky background

### 2. Run the Development Server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Configuration

### Updating Event Dates

Edit `src/lib/data.ts` to update:

- **Next Intersection Event** - `NEXT_INTERSECTION_EVENT.date`
- **Pathway Statistics** - `PATHWAY_STATS`
- **Pathway Groups** - `PATHWAY_GROUPS` array
- **Intersection Events** - `INTERSECTION_EVENTS` object
- **Social Links** - `SOCIAL_LINKS`
- **Creative Initiatives** - `CREATIVE_INITIATIVES`

### Viewing Form Submissions

Form submissions are stored in localStorage. Open browser console and run:

```javascript
// View all submissions
console.log(JSON.parse(localStorage.getItem('avenue_pathway_eoi')));
console.log(JSON.parse(localStorage.getItem('avenue_email_subscriptions')));
console.log(JSON.parse(localStorage.getItem('avenue_idea_submissions')));

// Or use the export function
import { exportAllData } from './src/lib/storage';
console.log(exportAllData());
```

## Pages

- **Home** (`/`) - Hero section with earth globe
- **Vision** (`/vision`) - Avenue orbit diagram and mission
- **Pathways** (`/pathways`) - Interactive globe map, pathway finder, EOI form
- **Intersection** (`/intersection`) - Event countdowns, social links, email signup
- **Streetlights** (`/streetlights`) - Mission initiatives, creative projects, idea submission

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **react-globe.gl** - Interactive 3D globe
- **Lucide React** - Icons

## Deploy

Deploy to Vercel, Netlify, or any platform supporting Next.js.
