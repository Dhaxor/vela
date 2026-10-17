#!/usr/bin/env node
// UI lint for screens (ELEVATE §2/§8, CONTRACTS §14). Fails on, in app/**:
//   hex        a hex colour literal ('#E9B44C'): colours come from constants/theme
//   fontSize   a fontSize style: type comes from <T variant>
//   fontWeight a fontWeight style: weights are separate font files
//   fontStyle  a fontStyle style: the italic is a separate font file
//   alert      Alert.alert(...): a no-op on web; use useConfirm / ConfirmSheet / useToast
//   a11y       a touchable with no text inside and no accessibilityLabel
//   iconBarrel an import of the "lucide-react-native" barrel, which bundles and runs
//              every one of its ~1,759 icons at cold start; use @/components/glyphs/icons
//
//   node scripts/lint-ui.mjs [paths…] [--json] [--summary]
// Exit code 1 when anything is found.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const targets = args.filter((a) => !a.startsWith('--'));
const roots = (targets.length ? targets : ['app']).map((t) => path.resolve(ROOT, t));

const TOUCHABLES = ['TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'Pressable', 'IconButton', 'Press'];

const RULES = [
  { id: 'hex', re: /["'`]#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})["'`]/g, why: 'hex colour literal; use a constants/theme token' },
  { id: 'fontSize', re: /\bfontSize\s*:/g, why: 'fontSize; use <T variant>' },
  { id: 'fontWeight', re: /\bfontWeight\s*:/g, why: 'fontWeight; use <T strong> (a real 600 file)' },
  { id: 'fontStyle', re: /\bfontStyle\s*:/g, why: 'fontStyle; use <T italic> (a real italic file)' },
  { id: 'alert', re: /\bAlert\s*\.\s*alert\s*\(/g, why: 'Alert.alert is a no-op on web; use useConfirm / ConfirmSheet / useToast' },
  {
    id: 'iconBarrel',
    re: /(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)["'`]lucide-react-native["'`]/g,
    why: 'the lucide barrel loads all ~1,759 icons at cold start; import from @/components/glyphs/icons',
  },
];

function walk(p, out = []) {
  if (!fs.existsSync(p)) return out;
  const stat = fs.statSync(p);
  if (stat.isFile()) {
    if (/\.(tsx?|jsx?)$/.test(p) && !/\.test\.[jt]sx?$/.test(p)) out.push(p);
    return out;
  }
  for (const name of fs.readdirSync(p)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    walk(path.join(p, name), out);
  }
  return out;
}

/** Blank out comments (keeping newlines, so line numbers survive). */
export function stripComments(src) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += n ?? ''; i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i++; continue; }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && n === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      out += '  ';
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}

/** End index of a JSX opening tag that starts at `start` ('<'), honouring braces and strings. */
function tagEnd(src, start) {
  let depth = 0;
  let quote = null;
  for (let i = start + 1; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return { end: i, selfClosing: src[i - 1] === '/' };
  }
  return null;
}

/** Index of the matching closing tag for `name`, starting after the opening tag. */
function closeIndex(src, from, name) {
  const open = new RegExp(`<${name}(?=[\\s>/])`, 'g');
  const close = new RegExp(`</${name}\\s*>`, 'g');
  let depth = 1;
  let i = from;
  while (depth > 0) {
    open.lastIndex = i;
    close.lastIndex = i;
    const o = open.exec(src);
    const c = close.exec(src);
    if (!c) return -1;
    if (o && o.index < c.index) {
      const t = tagEnd(src, o.index);
      if (t && !t.selfClosing) depth++;
      i = (t ? t.end : o.index) + 1;
    } else {
      depth--;
      i = c.index + c[0].length;
      if (depth === 0) return c.index;
    }
  }
  return -1;
}

/** Index of the brace that closes the one at `start`, honouring strings. */
function braceEnd(src, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return src.length - 1;
}

/** Does this JSX children string show text to a screen reader? */
export function hasText(children) {
  if (/<(Text|T)(?=[\s>/])/.test(children)) return true;
  if (/<\w*(Button|Chip)\b[^>]*\blabel=/.test(children)) return true;
  // Walk the children: skip tags (with their attribute braces), test each
  // top-level {expression} (text unless it renders JSX) and any bare text.
  let bare = '';
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c === '<' && /[A-Za-z/>]/.test(children[i + 1] ?? '')) {
      const t = tagEnd(children, i);
      i = t ? t.end : children.length;
      continue;
    }
    if (c === '{') {
      const end = braceEnd(children, i);
      const expr = children.slice(i + 1, end).trim();
      if (expr && !expr.includes('<') && !expr.startsWith('/*')) return true;
      i = end;
      continue;
    }
    bare += c;
  }
  return bare.trim().length > 0;
}

export function lintSource(src) {
  const code = stripComments(src);
  const found = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(code))) found.push({ rule: rule.id, line: lineOf(code, m.index), why: rule.why });
  }
  const tagRe = new RegExp(`<(${TOUCHABLES.join('|')})(?=[\\s>/])`, 'g');
  let m;
  while ((m = tagRe.exec(code))) {
    const name = m[1];
    const t = tagEnd(code, m.index);
    if (!t) continue;
    const attrs = code.slice(m.index, t.end);
    if (/\b(accessibilityLabel|aria-label)\s*=/.test(attrs)) continue;
    if (/\{\s*\.\.\./.test(attrs)) continue; // spread props may carry the label
    let labelled = false;
    if (!t.selfClosing) {
      const close = closeIndex(code, t.end + 1, name);
      if (close > 0) labelled = hasText(code.slice(t.end + 1, close));
    }
    if (!labelled) {
      found.push({ rule: 'a11y', line: lineOf(code, m.index), why: `<${name}> has no text and no accessibilityLabel` });
    }
  }
  return found.sort((a, b) => a.line - b.line);
}

function main() {
  const files = roots.flatMap((r) => walk(r));
  const report = [];
  for (const file of files) {
    for (const v of lintSource(fs.readFileSync(file, 'utf8'))) {
      report.push({ file: path.relative(ROOT, file).split(path.sep).join('/'), ...v });
    }
  }
  if (flags.has('--json')) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    if (!flags.has('--summary')) for (const v of report) console.log(`${v.file}:${v.line}  ${v.rule.padEnd(10)} ${v.why}`);
    const byRule = {};
    const byFile = {};
    for (const v of report) {
      byRule[v.rule] = (byRule[v.rule] ?? 0) + 1;
      byFile[v.file] = (byFile[v.file] ?? 0) + 1;
    }
    console.log(`\nlint-ui: ${report.length} violation(s) in ${Object.keys(byFile).length} of ${files.length} file(s)`);
    for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) console.log(`  ${rule.padEnd(10)} ${n}`);
  }
  process.exitCode = report.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) main();
