import { createClient } from '@supabase/supabase-js';
import { createCdnUrl } from '@/lib/image-cdn';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('id, slug, name, cached_thumbnails, background_color')
    .not('cached_thumbnails', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !galleries || galleries.length === 0) {
    return NextResponse.json({ featured: [] });
  }

  // Shuffle and pick 6 galleries
  const shuffled = [...galleries].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 6);

  // Pre-sign CDN URLs server-side (no client API calls needed)
  const featured = selected.map((gallery) => {
    const thumbnails = gallery.cached_thumbnails || [];
    const randomIndex = Math.floor(Math.random() * thumbnails.length);
    const rawUrl = thumbnails[randomIndex];

    return {
      id: gallery.id,
      slug: gallery.slug,
      name: gallery.name,
      imageUrl: rawUrl ? createCdnUrl(rawUrl, 'xl') : null,
    };
  }).filter(item => item.imageUrl);

  return NextResponse.json({ featured });
}
