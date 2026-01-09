import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSignedAction } from '@/lib/signature'
import { standardRateLimiter, getClientIdentifier, createRateLimitHeaders } from '@/lib/rate-limit'
import { RATE_LIMIT_STANDARD } from '@/lib/constants'

// POST /api/likes - Add a like with signature verification
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const identifier = getClientIdentifier(request)
  const rateLimit = standardRateLimiter.check(identifier, RATE_LIMIT_STANDARD)

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          ...createRateLimitHeaders(rateLimit),
          'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  try {
    const body = await request.json()
    const { gallery_id, wallet_address, message, signature } = body

    // Validate required fields
    if (!gallery_id || !wallet_address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    // Verify signature
    const validation = validateSignedAction(
      message,
      signature,
      wallet_address,
      'like_gallery',
      gallery_id
    )

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid signature' },
        { status: 401, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('gallery_id', gallery_id)
      .eq('wallet_address', wallet_address)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Already liked' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    // Insert like
    const { error } = await supabase.from('likes').insert({
      gallery_id,
      wallet_address,
    })

    if (error) {
      console.error('Error inserting like:', error)
      return NextResponse.json(
        { error: 'Failed to add like' },
        { status: 500, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    // Get updated like count
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', gallery_id)

    return NextResponse.json(
      {
        success: true,
        likes_count: count || 0,
      },
      { headers: createRateLimitHeaders(rateLimit) }
    )
  } catch (error) {
    console.error('Error in POST /api/likes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/likes - Remove a like with signature verification
export async function DELETE(request: NextRequest) {
  // Apply rate limiting
  const identifier = getClientIdentifier(request)
  const rateLimit = standardRateLimiter.check(identifier, RATE_LIMIT_STANDARD)

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          ...createRateLimitHeaders(rateLimit),
          'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  try {
    const body = await request.json()
    const { gallery_id, wallet_address, message, signature } = body

    // Validate required fields
    if (!gallery_id || !wallet_address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    // Verify signature
    const validation = validateSignedAction(
      message,
      signature,
      wallet_address,
      'unlike_gallery',
      gallery_id
    )

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid signature' },
        { status: 401, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    // Delete like
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('gallery_id', gallery_id)
      .eq('wallet_address', wallet_address)

    if (error) {
      console.error('Error deleting like:', error)
      return NextResponse.json(
        { error: 'Failed to remove like' },
        { status: 500, headers: createRateLimitHeaders(rateLimit) }
      )
    }

    // Get updated like count
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', gallery_id)

    return NextResponse.json(
      {
        success: true,
        likes_count: count || 0,
      },
      { headers: createRateLimitHeaders(rateLimit) }
    )
  } catch (error) {
    console.error('Error in DELETE /api/likes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
