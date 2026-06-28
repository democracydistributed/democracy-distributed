import { notFound } from 'next/navigation';

// Force dynamic so notFound() actually returns a 404 status — statically
// prerendering this page would bake the not-found UI into a 200 response.
export const dynamic = 'force-dynamic';

// Reached only when middleware didn't redirect — i.e. no projectId was given.
export default function ProjectRecordPage() {
  notFound();
}
