import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl">🏛️</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">This page does not exist. Records on the blockchain are permanent; URLs, unfortunately, are not.</p>
      <Link href="/" className="btn-primary mt-6">Go home</Link>
    </div>
  );
}
