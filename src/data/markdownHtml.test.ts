import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, isBlankHtml, looksLikeMarkdownSource, markdownToHtml, typedHeading } from './markdownHtml';

describe('markdownHtml', () => {
  it('renders headings and paragraphs', () => {
    const html = markdownToHtml('## Hello\n\nA finding.');
    expect(html).toContain('<h2>Hello</h2>');
    expect(html).toContain('<p>A finding.</p>');
  });

  it('round-trips common GFM', () => {
    const src = `## Title

A **bold** and *em* word.

- one
- two

1. first
`;
    const back = htmlToMarkdown(markdownToHtml(src));
    expect(back).toContain('## Title');
    expect(back).toContain('**bold**');
    expect(back).toContain('- one');
  });

  it('detects ATX headings typed as plain text', () => {
    expect(typedHeading('# Test')).toEqual({ level: 1, text: 'Test' });
    expect(typedHeading('## Mix and ticket shape')).toEqual({
      level: 2,
      text: 'Mix and ticket shape',
    });
    expect(typedHeading('#Test')).toBeNull();
    expect(looksLikeMarkdownSource('# Test\n\nWhy')).toBe(true);
  });

  it('treats contenteditable empty shells as blank', () => {
    expect(isBlankHtml('')).toBe(true);
    expect(isBlankHtml('<br>')).toBe(true);
    expect(isBlankHtml('<p><br></p>')).toBe(true);
    expect(isBlankHtml('<div><br></div>')).toBe(true);
    expect(htmlToMarkdown('<p><br></p>')).toBe('');
  });
});
