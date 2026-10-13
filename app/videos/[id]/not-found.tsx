import Link from "next/link";

export default function VideoNotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="text-xl font-semibold">Video not found</h1>
      <p className="mt-2 text-sm text-muted">It may have been deleted, or it&apos;s a retention video you don&apos;t have access to.</p>
      <Link href="/" className="mt-4 inline-block text-sm text-maroon hover:underline">Back to dashboard</Link>
    </div>
  );
}
