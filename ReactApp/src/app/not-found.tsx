import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background text-center">
      <p className="font-display text-7xl font-bold tracking-tight text-foreground">
        404
      </p>
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Page not found
        </h2>
        <p className="text-sm text-muted-foreground">
          The requested page could not be found.
        </p>
      </div>
      <Button asChild>
        <Link href="/users">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Users
        </Link>
      </Button>
    </div>
  );
}
