
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotesList from "@/components/notes-list";
import NoteViewer from "@/components/note-viewer";
import LoadingOverlay from "@/components/loading-overlay";
import { Book, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Note, SyncStatus } from "@shared/schema";

function App() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/sync-status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    refetchInterval: 60000, // Refresh every minute
  });

  const syncNotesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/notes/sync", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data.notesCount} notes`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync notes from S3",
        variant: "destructive",
      });
    },
  });

  const handleSyncNotes = () => {
    syncNotesMutation.mutate();
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setLocation(`/note/${note.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-2">
            <Book className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Joplin Notes</h1>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            {syncStatus && (
              <div className="text-sm text-muted-foreground">
                {syncStatus.totalNotes || 0} notes • {syncStatus.storageUsed || '0 KB'}
                {syncStatus.lastSyncTime && (
                  <span className="ml-2">
                    Last sync: {new Date(syncStatus.lastSyncTime).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">
                {syncStatus?.isConnected ? "S3 Connected" : "S3 Not Configured"}
              </span>
              <div className={`w-2 h-2 rounded-full ${
                syncStatus?.isConnected ? "bg-green-500" : "bg-red-500"
              }`} />
            </div>
            <Button
              onClick={handleSyncNotes}
              disabled={syncNotesMutation.isPending || !syncStatus?.isConnected}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncNotesMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Notes
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <Switch>
          <Route path="/note/:id">
            {(params) => {
              const noteId = parseInt(params.id);
              const note = notes.find(n => n.id === noteId) || null;
              return <NoteViewer note={note} />;
            }}
          </Route>
          <Route>
            <NotesList 
              notes={notes}
              selectedNote={selectedNote}
              onSelectNote={handleSelectNote}
              isLoading={isLoading}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </Route>
        </Switch>
      </div>

      <Toaster />
      <LoadingOverlay />
    </div>
  );
}

export default App;
