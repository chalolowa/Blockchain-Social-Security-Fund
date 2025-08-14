import { Skeleton } from "../components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="space-y-6 w-full max-w-md px-4">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-3/4 mx-auto bg-white/10" />
          <Skeleton className="h-6 w-full bg-white/10" />
          <Skeleton className="h-6 w-2/3 mx-auto bg-white/10" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full bg-white/10" />
          <Skeleton className="h-12 w-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}