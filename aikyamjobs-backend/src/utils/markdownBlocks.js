'use strict';

const { marked } = require('marked');

/**
 * Converts a markdown string (Job/Company `description`) into a flat array of
 * plain-data blocks that mindmap-template.typ can walk and render with its
 * own Typst constructs (headings, paragraphs, lists). Deliberately never
 * hands raw markdown text to Typst to be parsed as markup -- arbitrary
 * admin-authored text can contain Typst-special characters (`#`, `$`, `@`,
 * stray brackets) that would break compilation if interpreted as source
 * rather than data. Inline emphasis (`**bold**`, `_italic_`, links) is
 * flattened to plain text on purpose, for the same reason -- this is a
 * "readable prose" fallback for a PDF, not a full renderer.
 */
// Walks marked's token tree (block or inline, either has a nested `.tokens`
// array) and joins every leaf text/codespan fragment -- this is what
// actually strips `**bold**`/`_em_`/link markup down to plain text, since
// a paragraph token's own `.text` is the raw unparsed markdown source and
// only `.tokens` gives the already-tokenized (and thus strippable) inline
// content.
function flattenTokens(tokens) {
  if (!Array.isArray(tokens)) return '';
  return tokens
    .map((t) => {
      if (t.type === 'br') return ' ';
      if (Array.isArray(t.tokens)) return flattenTokens(t.tokens);
      return t.text || t.raw || '';
    })
    .join('');
}

function cleanText(s) {
  return String(s || '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function markdownToBlocks(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];

  const tokens = marked.lexer(markdown);
  const blocks = [];

  const flattenListItem = (item) => {
    // Simple items: item.tokens is [{type:'text', tokens:[...inline...]}].
    // Loose/complex items may nest paragraphs -- flattenTokens recurses
    // through either shape fine since it just follows `.tokens` all the way.
    return cleanText(flattenTokens(item.tokens));
  };

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        {
          const text = cleanText(flattenTokens(token.tokens));
          if (text) blocks.push({ type: 'heading', level: Math.min(token.depth || 2, 4), text });
        }
        break;
      case 'paragraph':
        {
          const text = cleanText(flattenTokens(token.tokens));
          if (text) blocks.push({ type: 'paragraph', text });
        }
        break;
      case 'list':
        {
          const items = (token.items || []).map(flattenListItem).filter(Boolean);
          if (items.length) blocks.push({ type: 'list', ordered: !!token.ordered, items });
        }
        break;
      case 'blockquote':
        {
          const text = cleanText(flattenTokens(token.tokens));
          if (text) blocks.push({ type: 'quote', text });
        }
        break;
      case 'space':
        break;
      default:
        // hr, code, table, html, etc. -- skip rather than risk odd output
        break;
    }
  }

  return blocks;
}

module.exports = { markdownToBlocks };
