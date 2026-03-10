import { FileNode } from './store';

export interface ContextItem {
  id: string;
  name: string;
  type: 'file' | 'symbol' | 'url';
  content?: string;
}

export class ContextManager {
  /**
   * Parses the input string for @mentions.
   * Matches @filename, @/path/to/file
   */
  static parseMentions(input: string, files: FileNode[]): ContextItem[] {
    const mentions = input.match(/@["\w./-]+/g);
    if (!mentions) return [];

    const contextItems: ContextItem[] = [];
    const flatFiles = this.flattenFiles(files);

    mentions.forEach(mention => {
      const query = mention.substring(1); // remove @
      const match = flatFiles.find(f => f.name.toLowerCase().includes(query.toLowerCase()));
      
      if (match) {
        contextItems.push({
          id: match.name,
          name: match.name,
          type: 'file',
          content: match.content
        });
      }
    });

    return contextItems;
  }

  private static flattenFiles(nodes: FileNode[]): FileNode[] {
    let all: FileNode[] = [];
    nodes.forEach(node => {
        if (node.type === 'file') {
            all.push(node);
        } else if (node.children) {
            all = [...all, ...this.flattenFiles(node.children)];
        }
    });
    return all;
  }

  /**
   * Prepares the full prompt with context injection.
   */
  static buildPrompt(input: string, contextItems: ContextItem[]): string {
    const prompt = input;
    let contextString = '';

    if (contextItems.length > 0) {
      contextString += '\n\n--- Context ---\n';
      contextItems.forEach(item => {
        contextString += `File: ${item.name}\n\
\
\
${item.content || '(no content)'}\n\
\
\
\n`;
      });
      contextString += '--- End Context ---\n';
    }

    return `${prompt}${contextString}`;
  }
}
