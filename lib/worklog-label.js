'use strict';
// A visible, worklog-scoped suffix works with Jira Server's existing comment API.
// It is deliberately not an issue custom field or a native Jira OT attribute.
const MARKER = /(?:\r?\n){1,2}\[Quick Jira Log: (Overtime|Regular)\]\s*$/;
function textOf(comment) {
  if (typeof comment === 'string') return comment;
  if (!comment || typeof comment !== 'object') return '';
  const walk = node => {
    if (Array.isArray(node)) return node.map(walk).join('');
    if (!node || typeof node !== 'object') return typeof node === 'string' ? node : '';
    if (node.type === 'hardBreak') return '\n';
    const text = typeof node.text === 'string' ? node.text : walk(node.content || []);
    return text + (['paragraph','heading','listItem'].includes(node.type) ? '\n' : '');
  };
  return walk(comment).trim();
}
function readLabel(comment) {
  const text = textOf(comment), match = text.match(MARKER);
  return { description: match ? text.slice(0, match.index).trimEnd() : text,
    overtime: match ? match[1] === 'Overtime' : undefined };
}
function writeLabel(description, overtime) {
  const clean = readLabel(description).description.trim();
  return typeof overtime === 'boolean' ? `${clean}\n\n[Quick Jira Log: ${overtime ? 'Overtime' : 'Regular'}]` : clean;
}
module.exports = { readLabel, writeLabel, textOf };
