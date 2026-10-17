export class MathNormalizer {
  /**
   * Normalizes math strings:
   * - Fixes JSON double-escaped backslashes (\\frac -> \frac, \\text -> \text)
   * - Normalizes LaTeX delimiters
   * - Balances simple braces where possible
   */
  public static normalizeContent(text: string): string {
    if (!text || typeof text !== 'string') return text || '';

    let s = text;

    // 1. Fix double escaped backslashes common in JSON responses
    // e.g. \\frac -> \frac, \\text -> \text, \\sqrt -> \sqrt, \\times -> \times, \\pm -> \pm
    s = s.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    s = s.replace(/\\\\\{/g, '{').replace(/\\\\\}/g, '}');

    // 2. Standardize common math expressions:
    // e.g. \( ... \) to $ ... $, \[ ... \] to $$ ... $$
    s = s.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    s = s.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

    // 3. Remove accidental triple or quadruple backslashes
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

    // Check orphan $ delimiters (outside of code blocks)
    // Strip code blocks first
    const withoutCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
    const dollarMatches = withoutCode.match(/(?<!\\)\$/g);
    if (dollarMatches && dollarMatches.length % 2 !== 0) {
      return { valid: false, reason: 'Odd number of unescaped $ delimiters (orphan dollar sign)' };
    }

    // Check brace balance across LaTeX command blocks
    const texCommandPattern = /\\[a-zA-Z]+(\{[\s\S]*?)?(?=[^a-zA-Z{]|$)/g;
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
   * Preserves real programming code blocks untouched.
   */
  public static toUnicodePlainText(text: string): string {
    if (!text || typeof text !== 'string') return text || '';

    // If text contains code fences, preserve them
    const codeBlockTokens: string[] = [];
    let preserved = text.replace(/(```[\s\S]*?```|`[^`]+`)/g, match => {
      codeBlockTokens.push(match);
      return `__CODE_BLOCK_${codeBlockTokens.length - 1}__`;
    });

    let s = this.normalizeContent(preserved);

    // Replace common LaTeX constructs
    // \frac{a}{b} -> a/b
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
    // Handle nested frac one level
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');

    // \text{...} -> ...
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

    // Mathematical symbols
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
    s = s.replace(/\\Omega\b/g, 'Ω');
    s = s.replace(/\\pi\b/g, 'π');
    s = s.replace(/\\lambda\b/g, 'λ');
    s = s.replace(/\\mu\b/g, 'μ');
    s = s.replace(/\\alpha\b/g, 'α');
    s = s.replace(/\\beta\b/g, 'β');
    s = s.replace(/\\gamma\b/g, 'γ');
    s = s.replace(/\\vec\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');

    // Strip remaining LaTeX brackets like \left(, \right), etc.
    s = s.replace(/\\left\s*([(\[{|])/g, '$1');
    s = s.replace(/\\right\s*([)\]}|])/g, '$1');

    // Remove remaining stray math delimiters $
    s = s.replace(/\$\$/g, '').replace(/\$/g, '');

    // Restore code blocks
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
