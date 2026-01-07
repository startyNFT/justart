// Simple endpoint for Vercel cron to keep functions warm
export async function GET() {
  return Response.json({ status: 'warm', timestamp: Date.now() });
}
