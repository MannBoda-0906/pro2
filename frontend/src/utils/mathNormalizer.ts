export class MathNormalizer {
  /**
   * Normalizes math strings:
   * - Fixes JSON double-escaped backslashes (\\frac -> \frac, \\text -> \text)
   * - Standardizes delimiters
   */
  public static normalizeContent(text: string): string {
    if (!text || typeof text !== 'string') return text || '';

    let s = text;
    // Fix double-escaped backslashes
    s = s.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    s = s.replace(/\\\\\{/g, '{').replace(/\\\\\}/g, '}');

    // Standardize delimiters: \( ... \) -> $ ... $, \[ ... \] -> $$ ... $$
    s = s.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    s = s.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

    // Remove multi backslashes
    s = s.replace(/\\{2,}/g, '\\');

    return s;
  }

  /**
   * Validates math content for malformed LaTeX:
   * - Detects unbalanced braces in LaTeX commands
   * - Detects orphan unclosed $ delimiters
   */
  public static validateContent(text: string): { valid: boolean; reason?: string } {
    if (!text || typeof text !== 'string') return { valid: true };

    const withoutCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
    const dollarMatches = withoutCode.match(/(?<!\\)\$/g);
    if (dollarMatches && dollarMatches.length % 2 !== 0) {
      return { valid: false, reason: 'Odd number of unescaped $ delimiters (orphan dollar sign)' };
    }

    let openCount = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{' && (i === 0 || text[i - 1] !== '\\')) openCount++;
      if (text[i] === '}' && (i === 0 || text[i - 1] !== '\\')) openCount--;
      if (openCount < 0) {
        return { valid: false, reason: 'Unmatched closing brace } detected in math string' };
      }
    }
    if (openCount !== 0) {
      return { valid: false, reason: `Unbalanced opening brace { detected (${openCount} unclosed)` };
    }

    return { valid: true };
  }

  /**
   * Converts raw LaTeX commands to clean readable Unicode and plain text.
   * Preserves programming code blocks untouched.
   */
  public static toUnicodePlainText(text: string): string {
    if (!text || typeof text !== 'string') return text || '';

    const codeBlockTokens: string[] = [];
    let preserved = text.replace(/(```[\s\S]*?```|`[^`]+`)/g, match => {
      codeBlockTokens.push(match);
      return `__CODE_BLOCK_${codeBlockTokens.length - 1}__`;
    });

    let s = this.normalizeContent(preserved);

    // Replace fractions
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');

    // Text formatting
    s = s.replace(/\\text\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\mathbf\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\mathrm\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\mathit\{([^{}]+)\}/g, '$1');

    // Subscripts & Superscripts
    s = s.replace(/\^\{2\}/g, '²').replace(/\^2\b/g, '²');
    s = s.replace(/\^\{3\}/g, '³').replace(/\^3\b/g, '³');
    s = s.replace(/\^\{-1\}/g, '⁻¹').replace(/\^-1\b/g, '⁻¹');
    s = s.replace(/\^\{0\}/g, '⁰');
    s = s.replace(/_\{cm\}/gi, '₍cm₎').replace(/_cm\b/gi, '₍cm₎');
    s = s.replace(/_\{ext\}/gi, '₍ext₎').replace(/_ext\b/gi, '₍ext₎');
    s = s.replace(/_\{int\}/gi, '₍int₎').replace(/_int\b/gi, '₍int₎');
    s = s.replace(/_\{([0-9])\}/g, (_m, d) => ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'][+d] || d);
    s = s.replace(/_([0-9])\b/g, (_m, d) => ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'][+d] || d);

    // Math symbols
    s = s.replace(/\\times\b/g, '×');
    s = s.replace(/\\cdot\b/g, '·');
    s = s.replace(/\\pm\b/g, '±');
    s = s.replace(/\\approx\b/g, '≈');
    s = s.replace(/\\neq?\b/g, '≠');
    s = s.replace(/\\le(q)?\b/g, '≤');
    s = s.replace(/\\ge(q)?\b/g, '≥');
    s = s.replace(/\\sum\b/g, 'Σ');
    s = s.replace(/\\prod\b/g, 'Π');
    s = s.replace(/\\int\b/g, '∫');
    s = s.replace(/\\infty\b/g, '∞');
    s = s.replace(/\\Delta\b/g, 'Δ');
    s = s.replace(/\\delta\b/g, 'δ');
    s = s.replace(/\\theta\b/g, 'θ');
    s = s.replace(/\\omega\b/g, 'ω');
    s = s.replace(/\\pi\b/g, 'π');
    s = s.replace(/\\lambda\b/g, 'λ');
    s = s.replace(/\\mu\b/g, 'μ');
    s = s.replace(/\\alpha\b/g, 'α');
    s = s.replace(/\\beta\b/g, 'β');
    s = s.replace(/\\vec\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');

    s = s.replace(/\\left\s*([(\[{|])/g, '$1');
    s = s.replace(/\\right\s*([)\]}|])/g, '$1');
    s = s.replace(/\$\$/g, '').replace(/\$/g, '');

    s = s.replace(/__CODE_BLOCK_(\d+)__/g, (_m, idx) => codeBlockTokens[+idx] || '');

    return s.trim();
  }

  public static normalizeQuestionContent(text: string): string {
    return this.normalizeContent(text);
  }

  public static toReadablePlainText(text: string): string {
    return this.toUnicodePlainText(text);
  }

  public static detectMalformedLatex(text: string): { malformed: boolean; reason?: string } {
    const res = this.validateContent(text);
    return { malformed: !res.valid, reason: res.reason };
  }
}
