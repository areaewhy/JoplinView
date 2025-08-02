
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import NoteViewer from "@/components/note-viewer";
import LoadingOverlay from "@/components/loading-overlay";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/note/:id" component={NoteViewer} />
        <Route component={Home} />
      </Switch>

      <Toaster />
      <LoadingOverlay />
    </div>
  );
}

export default App;
