import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

// Configure marked with syntax highlighting
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

// Custom renderer for better styling
const renderer = new marked.Renderer();

// Custom table rendering
renderer.table = function(header, body) {
  return `
    <div class="table-container">
      <table class="min-w-full border border-border rounded-lg overflow-hidden">
        <thead class="bg-muted">
          ${header}
        </thead>
        <tbody>
          ${body}
        </tbody>
      </table>
    </div>
  `;
};

// Custom blockquote rendering
renderer.blockquote = function(quote) {
  return `
    <blockquote class="border-l-4 border-accent bg-muted/50 pl-4 py-2 my-4 italic">
      ${quote}
    </blockquote>
  `;
};

// Custom code block rendering
renderer.code = function(code, language) {
  const lang = language || 'plaintext';
  const highlighted = hljs.getLanguage(lang) 
    ? hljs.highlight(code, { language: lang }).value 
    : code;
  
  return `
    <pre class="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto my-4">
      <code class="language-${lang}">${highlighted}</code>
    </pre>
  `;
};

// Custom inline code rendering
renderer.codespan = function(code) {
  return `<code class="bg-muted text-destructive px-1 py-0.5 rounded text-sm font-mono">${code}</code>`;
};

// Custom link rendering (for Joplin internal links)
renderer.link = function(href, title, text) {
  // Handle Joplin internal links (format: :/note-id)
  if (href && href.startsWith(':/')) {
    const noteId = href.substring(2);
    return `<a href="#" data-note-id="${noteId}" class="text-primary hover:underline internal-link" title="${title || 'Internal note link'}">${text}</a>`;
  }
  
  // Regular external links
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr} class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true,
});

export function parseMarkdown(markdown: string): string {
  try {
    return marked(markdown) as string;
  } catch (error) {
    console.error("Error parsing markdown:", error);
    return `<p class="text-destructive">Error parsing markdown content</p>`;
  }
}

export function extractTitle(markdown: string): string {
  // Try to extract title from first heading
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }
  
  // If no heading found, use first non-empty line (up to 50 chars)
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('---')) {
      return trimmed.length > 50 ? trimmed.substring(0, 47) + '...' : trimmed;
    }
  }
  
  return 'Untitled Note';
}

export function extractExcerpt(markdown: string, maxLength: number = 150): string {
  // Remove YAML front matter
  const contentWithoutFrontMatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  
  // Remove markdown syntax and get plain text
  const plainText = contentWithoutFrontMatter
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
  
  return plainText.length > maxLength 
    ? plainText.substring(0, maxLength) + '...'
    : plainText;
}
