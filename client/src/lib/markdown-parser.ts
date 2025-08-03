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

// Simple marked configuration
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function parseMarkdown(markdown: string): string {
  try {
    // Handle null or undefined input
    if (!markdown || typeof markdown !== 'string') {
      console.error("Error parsing markdown: Invalid input", { markdown });
      return `<p class="text-muted-foreground">No content available</p>`;
    }
    
    // Parse the markdown
    const result = marked(markdown);
    
    // Ensure we return a string
    if (typeof result === 'string') {
      return result;
    } else if (result && typeof result.then === 'function') {
      // Handle if marked returns a promise (shouldn't happen with current config)
      console.error("Error parsing markdown: Unexpected promise result");
      return `<p class="text-destructive">Error: Async parsing not supported</p>`;
    } else {
      console.error("Error parsing markdown: Unexpected result type", { result });
      return `<p class="text-destructive">Error: Invalid parser result</p>`;
    }
  } catch (error) {
    console.error("Error parsing markdown:", error);
    return `<p class="text-destructive">Error parsing markdown content: ${error instanceof Error ? error.message : 'Unknown error'}</p>`;
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
