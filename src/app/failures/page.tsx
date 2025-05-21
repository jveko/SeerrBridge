import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  FilmIcon,
  TvIcon,
  CalendarIcon,
  ClockIcon,
  InfoIcon,
  AlertTriangleIcon
} from "lucide-react";

// Rename this file and move it to dashboard/failures
// This file will be deprecated and redirect to the new location

export default function FailuresPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <meta httpEquiv="refresh" content="0;url=/dashboard/failures" />
      <p>Redirecting to <Link href="/dashboard/failures">dashboard/failures</Link>...</p>
    </div>
  );
} 