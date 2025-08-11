import { describe, it, expect } from '@jest/globals';
import { extractHeadings } from '@/components/knowledge-sparks/SparkTOC';

describe('extractHeadings', () => {
  it('returns empty arrays for empty html', () => {
    const res = extractHeadings('');
    expect(res.htmlWithIds).toBe('');
    expect(res.headings).toEqual([]);
  });

  it('assigns ids to h1-h3 and slugifies text', () => {
    const html = '<h1>Hello World!</h1><p>Text</p><h2>Sub Section</h2><h3>Part 3</h3>';
    const res = extractHeadings(html);
    const ids = res.headings.map(h => h.id);
    expect(ids).toEqual(['hello-world', 'sub-section', 'part-3']);
    // Ensure ids are present in html
    expect(res.htmlWithIds).toContain('id="hello-world"');
    expect(res.htmlWithIds).toContain('id="sub-section"');
    expect(res.htmlWithIds).toContain('id="part-3"');
  });

  it('deduplicates repeated headings with suffixes', () => {
    const html = '<h2>Repeat</h2><h2>Repeat</h2><h2>Repeat</h2>';
    const res = extractHeadings(html);
    const ids = res.headings.map(h => h.id);
    expect(ids).toEqual(['repeat', 'repeat-1', 'repeat-2']);
  });
});
