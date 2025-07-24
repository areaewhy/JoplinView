import { formatDistanceToNow } from "date-fns";
import { Paperclip, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Note } from "@shared/schema";

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  isLoading: boolean;
}

export default function NotesList({ notes, selectedNote, onSelectNote, isLoading }: NotesListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-6 w-16" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        
        <div className="flex-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border-b border-border">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Notes</h2>
          <div className="flex space-x-2">
            <button className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Grid View">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button className="p-2 text-primary transition-colors" title="List View">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {notes.length} notes
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No notes found.</p>
            <p className="text-sm mt-1">Configure S3 and sync to see your notes.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={`
                p-4 border-b border-border hover:bg-muted cursor-pointer transition-colors group
                ${selectedNote?.id === note.id ? "bg-primary/5 border-l-4 border-l-primary" : ""}
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
                  {note.title}
                </h3>
                <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                  {note.source && (
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {note.body.substring(0, 150)}...
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {note.updatedTime 
                    ? formatDistanceToNow(new Date(note.updatedTime), { addSuffix: true })
                    : "No date"
                  }
                </span>
                <div className="flex items-center space-x-1">
                  {note.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {note.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{note.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
