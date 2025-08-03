import { useIsFetching } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function LoadingOverlay() {
  const isFetching = useIsFetching();

  if (!isFetching) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 max-w-sm mx-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground font-medium">Loading...</span>
        </div>
      </div>
    </div>
  );
}
