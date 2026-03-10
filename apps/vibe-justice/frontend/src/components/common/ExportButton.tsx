import { FileText } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExportButtonProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  filename?: string;
  className?: string;
  caseId?: string;
}

export function ExportButton({ title, data, filename = 'export', className, caseId }: ExportButtonProps) {


  const handleExport = (format: 'md' | 'json') => {
    let content = '';
    const mimeType = 'text/plain'; // Kept as const, though used once
    const extension = format;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      // JSON mime type not strictly needed for download but kept for correctness
      // mimeType would be 'application/json' if used dynamically
    } else {
      // Markdown conversion (simple)
      const timestamp = new Date().toLocaleString();
      content = `# ${title}\nGenerated: ${timestamp}\n\n`;

      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.forEach((item: Record<string, any>) => {
          content += `## ${item.title || 'Item'}\n`;
          content += `**Source**: ${item.source || 'Unknown'} | **Time**: ${item.timestamp || 'N/A'}\n\n`;
          content += `${item.content || item.description || ''}\n\n`;
          content += `---\n\n`;
        });
      } else if (typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
           content += `**${key}**: ${String(value)}\n\n`;
        });
      } else {
        content += String(data);
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove(); // Safer removal
    URL.revokeObjectURL(url);
  };

  const handleBackendExport = async () => {
    if (!caseId) {
      alert("No Case ID provided for backend export.");
      return;
    }

    try {
      // Assuming backend is at localhost:8000
      const response = await fetch(`http://localhost:8000/cases/export/${caseId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Verification: Show simple alert with path
      alert(`Export Successful!\n\nSaved to: ${result.path}`);

    } catch (error) {
      console.error('Export error:', error);
      alert(`Export Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={() => handleExport('md')}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neon-mint bg-neon-mint/10 hover:bg-neon-mint/20 border border-neon-mint/50 rounded-md transition-all hover:shadow-[0_0_10px_rgba(0,255,159,0.3)]"
        title="Export as Markdown"
      >
        <FileText className="w-3 h-3" />
        Report (MD)
      </button>

      {caseId && (
        <button
          onClick={() => { void handleBackendExport() }}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neon-purple bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/50 rounded-md transition-all hover:shadow-[0_0_10px_rgba(189,0,255,0.3)]"
          title="Generate Full Report (DOCX)"
        >
          <FileText className="w-3 h-3" />
          Report (DOCX)
        </button>
      )}
    </div>
  );
}
