# JustArt - Stargaze NFT Gallery Creator

A modern NFT gallery platform built on Stargaze, allowing users to create beautiful, customizable galleries for their NFT collections.

## Features

- 🎨 **Customizable Layouts** - Grid, vertical masonry, justified, and presentation modes
- 🖼️ **Drag & Drop** - Intuitive NFT arrangement with custom row layouts
- 🎵 **Background Music** - Add ambient music from your audio NFTs
- 🌈 **Theming** - Custom background colors and gallery styling
- ⭐ **NFT Ratings** - Community star ratings (1-5) for NFTs in galleries
- 🔍 **Discovery** - Browse galleries by category, trending, most liked
- 💰 **Payment System** - Progressive pricing with Stargaze tokens
- 🚀 **CDN Integration** - Fast image delivery with imgproxy caching
- 📱 **Responsive** - Mobile-friendly design

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Cosmos SDK (Stargaze)
- **Wallet**: Cosmos Kit (Keplr, Leap support)
- **Drag & Drop**: @dnd-kit
- **Image CDN**: i.rscdn.art with imgproxy

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- (Optional) CDN configuration for image optimization

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/justart.git
cd justart
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# CDN Configuration (Optional but recommended for production)
SERVICES_IMAGE_ENDPOINT=https://i.rscdn.art
SERVICES_IMAGE_KEY=your_hex_encoded_key
SERVICES_IMAGE_SALT=your_hex_encoded_salt
```

4. Set up the database:

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

See [`supabase/README.md`](./supabase/README.md) for detailed migration instructions.

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
justart/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (image CDN, featured, ratings)
│   ├── create/            # Gallery creation flow
│   ├── edit/[slug]/       # Gallery editing
│   ├── explore/           # Gallery discovery
│   ├── g/[slug]/          # Individual gallery view
│   ├── my-galleries/      # User gallery management
│   ├── my-nfts/          # User NFT collection
│   └── relaxing-corner/   # Top-rated NFTs
├── components/            # React components
│   ├── NFTGrid.tsx       # Main grid display
│   ├── CustomRowEditor.tsx # Row layout editor
│   ├── ErrorBoundary.tsx # Error handling
│   └── ...
├── hooks/                # Custom React hooks
│   └── useCdnUrl.ts     # CDN URL fetching
├── lib/                  # Core utilities
│   ├── constants.ts     # Centralized constants
│   ├── stargaze.ts      # NFT fetching
│   ├── supabase.ts      # Database client
│   ├── cosmos.ts        # Blockchain interactions
│   ├── rate-limit.ts    # API rate limiting
│   └── image-cdn.ts     # CDN URL signing
├── providers/            # Context providers
├── supabase/            # Database migrations
│   └── migrations/      # SQL migration files
└── public/              # Static assets
```

## Key Features & Implementation

### Gallery Layouts

Four arrangement modes with three size options each:

- **Grid** - Classic grid layout
- **Vertical** - Masonry-style vertical layout
- **Justified** - Justified rows with custom heights
- **Presentation** - Fullscreen slideshow mode

### NFT Loading Strategy

Progressive loading for optimal UX:
1. Fast initial load (12 NFTs in <1s)
2. Full page load (75 NFTs)
3. Background loading (remaining NFTs in parallel batches)

### Payment System

Progressive pricing model:
- 1st gallery: Free
- 2nd gallery: 1000 STARS
- 3rd gallery: 2000 STARS
- And so on...

Payments are verified on-chain via Stargaze RPC.

### CDN Integration

Server-side signed URLs for security:
- HMAC SHA256 signing
- Keys never exposed to client
- 5 size variants (xs, sm, md, lg, xl)
- Automatic fallback to IPFS

### Rate Limiting

Built-in rate limiting for API routes:
- Strict: 10 req/min (expensive operations)
- Standard: 30 req/min (normal operations)
- Lenient: 100 req/min (read-heavy operations)

## Database Schema

See [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql) for the complete schema.

Main tables:
- `users` - User wallet addresses
- `galleries` - Gallery configurations and metadata
- `likes` - Gallery likes by wallet addresses
- `nft_ratings` - Star ratings for NFTs within galleries

## API Routes

- `GET /api/image` - Get signed CDN URL for images
- `GET /api/featured` - Get featured galleries for homepage
- `GET /api/ratings` - CRUD operations for NFT ratings
- `GET /api/ratings/top` - Get top-rated NFTs
- `POST /api/keep-warm` - Keep database connection warm

## Development

### Adding a New Component

1. Create component in `components/YourComponent.tsx`
2. Export from component file
3. Import and use in your page/component

### Creating a Database Migration

```bash
supabase migration new your_migration_name
```

Edit the generated file in `supabase/migrations/` and apply:

```bash
supabase db push
```

### Testing

```bash
# Run tests (coming soon)
npm test

# Run linter
npm run lint
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Ensure all environment variables from `.env.local` are set in your deployment platform.

### Database Migrations

Run migrations before deploying:

```bash
supabase db push
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Quality Standards

- Use TypeScript for type safety
- Follow existing code style and patterns
- Write meaningful commit messages
- Extract magic numbers to `lib/constants.ts`
- Use error boundaries for component error handling
- Apply rate limiting to new API routes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built on [Stargaze](https://www.stargaze.zone/)
- Powered by [Next.js](https://nextjs.org/)
- Database by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)

## Support

For issues and questions:
- Create an issue on GitHub
- Join the Stargaze Discord community

---

Built with ❤️ for the Stargaze NFT community
