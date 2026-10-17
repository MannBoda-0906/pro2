import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { MathNormalizer } from '../../utils/mathNormalizer';

interface MathRendererProps {
  content?: string | null;
  className?: string;
  inline?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  className = '',
  inline = false
}) => {
  if (!content) return null;

  const rawText = String(content);

  // If text contains markdown code blocks, preserve them intact
  const codeBlocks: string[] = [];
  const textWithoutCode = rawText.replace(/(```[\s\S]*?```|`[^`]+`)/g, match => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Normalize delimiters and double backslashes
  const normalized = MathNormalizer.normalizeContent(textWithoutCode);

  // Split by $$...$$ (display math) and $...$ (inline math)
  // Regex matches $$...$$ or $...$
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g;
  const segments = normalized.split(mathRegex);

  const renderedElements = segments.map((seg, idx) => {
    if (!seg) return null;

    // Restore code blocks if segment is a placeholder
    const codeMatch = seg.match(/^__CODE_BLOCK_(\d+)__$/);
    if (codeMatch) {
      const originalCode = codeBlocks[+codeMatch[1]];
      if (originalCode.startsWith('```')) {
        const lines = originalCode.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
        return (
          <pre key={idx} className="my-2 p-3 rounded-xl bg-[#17172D] text-white font-mono text-xs overflow-x-auto">
            <code>{lines}</code>
          </pre>
        );
      }
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-[#EEEEFF] text-[#4938C8] font-mono text-xs">
          {originalCode.replace(/^`|`$/g, '')}
        </code>
      );
    }

    // Check if segment is display math $$...$$
    if (seg.startsWith('$$') && seg.endsWith('$$') && seg.length > 4) {
      const expr = seg.slice(2, -2).trim();
      try {
        const html = katex.renderToString(expr, {
          displayMode: true,
          throwOnError: false,
          output: 'html'
        });
        return (
          <span
            key={idx}
            className="block my-2 text-center overflow-x-auto py-1"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return (
          <span key={idx} className="block my-1 font-mono text-sm">
            {MathNormalizer.toUnicodePlainText(expr)}
          </span>
        );
      }
    }

    // Check if segment is inline math $...$
    if (seg.startsWith('$') && seg.endsWith('$') && seg.length > 2) {
      const expr = seg.slice(1, -1).trim();
      try {
        const html = katex.renderToString(expr, {
          displayMode: false,
          throwOnError: false,
          output: 'html'
        });
        return (
          <span
            key={idx}
            className="inline-block px-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return (
          <span key={idx} className="font-mono text-sm">
            {MathNormalizer.toUnicodePlainText(expr)}
          </span>
        );
      }
    }

    // Plain text segment: check if it contains raw TeX commands without $ delimiters (e.g. \frac{a}{b}, \text{kg})
    if (/\\[a-zA-Z]+/.test(seg)) {
      // Try to render with KaTeX or fallback to clean Unicode
      try {
        const html = katex.renderToString(seg, {
          displayMode: false,
          throwOnError: false,
          output: 'html'
        });
        // Check if KaTeX rendered an error span
        if (!html.includes('katex-error')) {
          return (
            <span
              key={idx}
              className="inline-block px-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
      } catch {
        // ignore and fallback
      }
      // Safety net: convert any stray LaTeX commands to clean Unicode representation
      return <span key={idx}>{MathNormalizer.toUnicodePlainText(seg)}</span>;
    }

    // Standard text
    return <span key={idx}>{seg}</span>;
  });

  const Wrapper = inline ? 'span' : 'div';
  return <Wrapper className={className}>{renderedElements}</Wrapper>;
};
