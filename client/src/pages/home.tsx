import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SettingsPanel from "@/components/settings-panel";
import NotesList from "@/components/notes-list";
import NoteViewer from "@/components/note-viewer";
import LoadingOverlay from "@/components/loading-overlay";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Note } from "@shared/schema";

export default function Home() {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["/api/notes", searchQuery, selectedTags],
    enabled: true,
  });

  const { data: syncStatus } = useQuery({
    queryKey: ["/api/sync-status"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const filteredNotes = notes.filter((note: Note) => {
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.body.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => note.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  J
                </span>
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                Joplin S3 Notes Manager
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
                className="lg:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Settings Panel */}
        <div
          className={`
          w-80 bg-card shadow-lg border-r border-border flex-shrink-0 
          transform lg:translate-x-0 transition-transform duration-300 ease-in-out 
          fixed lg:relative z-40 h-full
          ${isSettingsPanelOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          <SettingsPanel
            syncStatus={syncStatus}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
        </div>

        {/* Overlay for mobile */}
        {isSettingsPanelOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSettingsPanelOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Search Bar */}
          <div className="bg-card border-b border-border px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Notes List */}
            <div className="w-80 bg-card border-r border-border flex-shrink-0">
              <NotesList
                notes={filteredNotes}
                selectedNote={selectedNote}
                onSelectNote={setSelectedNote}
                isLoading={notesLoading}
              />
            </div>

            {/* Note Viewer */}
            <div className="flex-1">
              <NoteViewer note={selectedNote} />
            </div>
          </div>
        </main>
      </div>

      <LoadingOverlay />
    </div>
  );
}
