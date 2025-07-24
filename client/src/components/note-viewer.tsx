import { formatDistanceToNow } from "date-fns";
import { Calendar, Clock, User, Star, Link, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Note } from "@shared/schema";
import { parseMarkdown } from "@/lib/markdown-parser";

interface NoteViewerProps {
  note: Note | null;
}

export default function NoteViewer({ note }: NoteViewerProps) {
  const { toast } = useToast();

  const handleCopyLink = () => {
    if (note) {
      const url = `${window.location.origin}?note=${note.joplinId}`;
      navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied",
        description: "Note link copied to clipboard",
      });
    }
  };

  const handleExport = () => {
    if (note) {
      const content = `---
title: ${note.title}
created: ${note.createdTime}
updated: ${note.updatedTime}
tags: ${note.tags.join(', ')}
---

${note.body}`;

      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Note exported as Markdown file",
      });
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">No note selected</h3>
          <p className="text-sm">Select a note from the list to view its content</p>
        </div>
      </div>
    );
  }

  const parsedContent = parseMarkdown(note.body);

  return (
    <div className="flex-1 flex flex-col bg-card">
      {/* Note Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground mb-2">{note.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {note.createdTime && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {new Date(note.createdTime).toLocaleDateString()}</span>
                </div>
              )}
              {note.updatedTime && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    Updated: {formatDistanceToNow(new Date(note.updatedTime), { addSuffix: true })}
                  </span>
                </div>
              )}
              {note.author && (
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{note.author}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              <Link className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
            {note.source && (
              <Button variant="ghost" size="sm" asChild>
                <a href={note.source} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
        
        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {note.tags.map((tag) => (
              <Badge key={tag} variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Note Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div 
            className="prose prose-lg"
            dangerouslySetInnerHTML={{ __html: parsedContent }}
          />
        </div>
      </div>
    </div>
  );
}
