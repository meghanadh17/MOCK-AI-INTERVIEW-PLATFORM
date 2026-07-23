import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content by lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let currentList: React.ReactNode[] = [];
  let listKey = 0;

  const parseInline = (text: string): React.ReactNode[] => {
    // Regex to split by bold (**bold**) and italic (*italic*)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-extrabold text-text-prim">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="italic text-text-sec">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc pl-5 my-2 space-y-1.5 text-text-sec">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line is a bullet point starting with •, -, *, or +
    const bulletMatch = line.match(/^(\s*)(•|-|\*|\+)\s+(.*)$/);
    
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const bulletContent = bulletMatch[3];
      currentList.push(
        <li 
          key={`li-${i}`} 
          className="leading-relaxed text-[11.5px] font-sans text-text-sec"
          style={{ paddingLeft: indent > 0 ? `${indent * 2}px` : undefined }}
        >
          {parseInline(bulletContent)}
        </li>
      );
    } else if (trimmed === '') {
      flushList();
      // Add a small spacing
      elements.push(<div key={`space-${i}`} className="h-1.5" />);
    } else {
      flushList();
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed text-[11.5px] font-sans text-text-sec my-1">
          {parseInline(line)}
        </p>
      );
    }
  }

  flushList();

  return (
    <div className={`space-y-1 ${className}`}>
      {elements}
    </div>
  );
}
