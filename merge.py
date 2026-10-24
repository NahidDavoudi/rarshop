#!/usr/bin/env python3
"""
merge_index.py - merge source files per directory + build a compact INDEX.md

Usage:
  python merge_index.py                          # asks for the folder
  python merge_index.py path/to/project
  python merge_index.py path/to/project --sql
  python merge_index.py path/to/project --exts php,js,py --max-symbols 6
  python merge_index.py path/to/project --no-deps --folders-only

Output goes to a folder named "merged" next to this script (or --out):
  <project>.txt, <project>__app__Controllers.txt, ...   one file per directory
  INDEX.md                                               compact map of the project

At the start of every run, old *.txt and INDEX.md inside the output folder are
deleted (nothing else), so the result always matches the current project.
Standard library only (Python 3.8+).
"""
import argparse
import ast
import json
import os
import posixpath
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime

# ------------------------------------------------------------------ settings
DEFAULT_EXTS = 'php,js,mjs,cjs,jsx,ts,tsx,py'
SKIP_DIRS = {
    'node_modules', 'vendor', '.git', '.idea', '.vscode', '.next', 'dist', 'build',
    'storage', 'cache', 'logs', 'log', 'uploads', 'tmp', 'temp', '__pycache__',
    'venv', '.venv', 'site-packages', 'coverage',
}
SKIP_SUFFIXES = ('.min.js', '.min.css', '.d.ts')
MAX_FILE_BYTES = 1_000_000          # bigger files are skipped (and listed in INDEX)
AUTO_FOLDERS_ONLY_ABOVE = 400       # more files than this -> folder-level index only
MAX_FILES_PER_FOLDER = 25           # per-folder file lines in INDEX
MAX_DEPS_SHOWN = 6
MAX_PKGS_SHOWN = 40
MAX_TABLE_FILES = 6

LANG = {'.php': 'php', '.js': 'js', '.mjs': 'js', '.cjs': 'js', '.jsx': 'js',
        '.ts': 'js', '.tsx': 'js', '.py': 'py'}
JS_EXTS = ('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs')

KEY_NAMES = {
    'index.php', 'main.py', 'app.py', 'manage.py', 'wsgi.py', 'asgi.py', 'server.js',
    'app.js', 'index.js', 'main.js', 'main.ts', 'index.ts', 'package.json',
    'composer.json', 'requirements.txt', 'pyproject.toml', 'dockerfile',
    'docker-compose.yml', 'docker-compose.yaml', '.env.example', 'readme.md',
    'next.config.js', 'next.config.mjs', 'vite.config.js', 'vite.config.ts',
    'tsconfig.json', 'nest-cli.json', 'artisan', 'schema.prisma', '.htaccess',
}
MANIFESTS = {'package.json', 'composer.json', 'requirements.txt'}

ROLE_NAMES = {
    'controllers': ('controller', 'controllers', 'handler', 'handlers'),
    'models': ('model', 'models', 'entity', 'entities', 'schema', 'schemas'),
    'views': ('view', 'views', 'template', 'templates', 'pages', 'layouts', 'partials'),
    'routes': ('route', 'routes', 'router', 'routers'),
    'services': ('service', 'services', 'usecases'),
    'repositories': ('repository', 'repositories', 'repos'),
    'middleware': ('middleware', 'middlewares'),
    'components': ('component', 'components', 'ui'),
    'hooks': ('hook', 'hooks'),
    'tests': ('test', 'tests', '__tests__', 'spec', 'specs', 'e2e'),
    'migrations': ('migration', 'migrations', 'seeds', 'seeders', 'database'),
    'config': ('config', 'configs', 'configuration', 'settings'),
    'utils': ('util', 'utils', 'helper', 'helpers', 'lib', 'libs', 'common', 'shared'),
    'api': ('api', 'apis', 'endpoints'),
    'public': ('public', 'static', 'assets', 'resources'),
    'commands': ('command', 'commands', 'console', 'cli', 'jobs', 'queue', 'queues', 'workers'),
    'modules': ('module', 'modules'),
}
ROLE_OF = {}
for _role, _names in ROLE_NAMES.items():
    for _n in _names:
        ROLE_OF.setdefault(_n, _role)

SQL_STOP = {'select', 'set', 'where', 'values', 'dual', 'as', 'on', 'and', 'or',
            'information_schema', 'if', 'not', 'exists', 'table', 'the', 'from',
            'into', 'join', 'left', 'right', 'inner', 'outer'}

# ------------------------------------------------------------------ cleaning
_STR = r"'(?:\\.|[^'\\\n])*'" + r'|"(?:\\.|[^"\\\n])*"'
CLEAN = {
    'php': re.compile(r"(?P<s>" + _STR + r")|(?P<c>/\*.*?\*/|//[^\n]*|#(?!\[)[^\n]*)", re.S),
    'js': re.compile(r"(?P<s>" + _STR + r"|`(?:\\.|[^`\\])*`)|(?P<c>/\*.*?\*/|//[^\n]*)", re.S),
    'py': re.compile(r"(?P<s>'''.*?'''|\"\"\".*?\"\"\"|" + _STR + r")|(?P<c>#[^\n]*)", re.S),
}


def clean(text, lang):
    """Remove comments (keep line breaks), keep strings."""
    rx = CLEAN.get(lang)
    if rx is None:
        return text

    def rep(m):
        if m.group('s') is not None:
            return m.group('s')
        return re.sub(r'[^\n]', '', m.group('c'))
    return rx.sub(rep, text)


def read_text(path):
    try:
        with open(path, 'rb') as f:
            data = f.read()
    except OSError:
        return ''
    for enc in ('utf-8-sig', 'cp1256'):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            pass
    return data.decode('latin-1')


def count_lines(text):
    return text.count('\n') + (1 if text and not text.endswith('\n') else 0)


# ------------------------------------------------------------------ symbols
PHP_CLASS = re.compile(r'(?m)^\s*(?:(?:abstract|final|readonly)\s+)*(class|interface|trait|enum)\s+(\w+)')
PHP_FUNC = re.compile(r'(?m)^\s*(?:(?:public|protected|private|static|abstract|final)\s+)*function\s+&?(\w+)\s*\(')
JS_CLASS = re.compile(r'(?m)^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)')
JS_TYPE = re.compile(r'(?m)^(?:export\s+)?(?:declare\s+)?(interface|type|enum)\s+(\w+)')
JS_FUNC = re.compile(r'(?m)^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)')
_PARAMS = r'\((?:[^()]|\([^()]*\)){0,400}\)'   # arrow params, may span lines / have defaults
JS_ARROW = re.compile(
    r'(?m)^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::[^=\n]+)?=\s*(?:async\s+)?'
    r'(?:' + _PARAMS + r'|\w+)\s*(?::[^=\n{]+)?=>')
JS_FUNC_EXPR = re.compile(r'(?m)^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\b')
# fallback for IIFE / wrapped scripts where declarations are indented
JS_ARROW_INDENT = re.compile(
    r'(?m)^[ \t]+(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:' + _PARAMS + r'|\w+)\s*=>')
JS_FUNC_INDENT = re.compile(r'(?m)^[ \t]+(?:async\s+)?function\s*\*?\s*(\w+)\s*\(')
# exports (ES modules + CommonJS)
JS_EXPORT_DECL = re.compile(
    r'(?m)^export\s+(?:declare\s+)?(?:async\s+)?'
    r'(?:function\s*\*?\s*|const\s+|let\s+|var\s+|class\s+|abstract\s+class\s+)(\w+)')
JS_DEFAULT = re.compile(
    r'(?m)^export\s+default\s+(?:(?:async\s+)?function\s*\*?\s*|class\s+)?(\w+)?')
JS_EXPORT_LIST = re.compile(r'(?m)^export\s*(?:type\s*)?\{([^}]*)\}')
JS_EXPORT_STAR = re.compile(r'''(?m)^export\s+\*(?:\s+as\s+\w+)?\s+from\s+['"]([^'"]+)['"]''')
CJS_OBJ = re.compile(r'module\.exports\s*=\s*\{([^{}]*)\}')
CJS_NAME = re.compile(r'(?m)module\.exports\s*=\s*([A-Za-z_$][\w$]*)\s*;?\s*$')
CJS_PROP = re.compile(r'(?m)^\s*(?:module\.)?exports\.(\w+)\s*=')
JS_KEYWORDS = {'async', 'await', 'new', 'function', 'class', 'null', 'true', 'false',
               'undefined', 'typeof', 'void'}
ROUTE = re.compile(
    r'''\b(?:app|router|route|Route|api)\s*(?:\.|->|::)\s*(get|post|put|patch|delete|any)\s*\(\s*['"]([^'"]*)['"]''')
PY_ROUTE = re.compile(r'''@\w+\.(route|get|post|put|patch|delete)\(\s*['"]([^'"]*)['"]''')
PY_CLASS_RX = re.compile(r'(?m)^class\s+(\w+)')
PY_DEF_RX = re.compile(r'(?m)^(?:async\s+)?def\s+([A-Za-z]\w*)')
CAT_ORDER = {'class': 0, 'type': 1, 'export': 2, 'fn': 3, 'route': 4}


def extract(raw, text, lang):
    """Return (symbols, python_imports). symbols = [(category, label)]."""
    syms, pyimps = [], []
    if lang == 'php':
        for m in PHP_CLASS.finditer(text):
            syms.append(('class', f'{m.group(1)} {m.group(2)}'))
        for m in PHP_FUNC.finditer(text):
            syms.append(('fn', m.group(1)))
        for m in ROUTE.finditer(text):
            syms.append(('route', f'{m.group(1).upper()} {m.group(2)}'))
    elif lang == 'js':
        for m in JS_CLASS.finditer(text):
            syms.append(('class', f'class {m.group(1)}'))
        for m in JS_TYPE.finditer(text):
            syms.append(('type', f'{m.group(1)} {m.group(2)}'))
        for m in JS_EXPORT_DECL.finditer(text):
            syms.append(('export', m.group(1)))
        for m in JS_DEFAULT.finditer(text):
            n = m.group(1)
            syms.append(('export', 'default' if (not n or n in JS_KEYWORDS) else f'default {n}'))
        for m in JS_EXPORT_LIST.finditer(text):
            for part in m.group(1).split(','):
                part = re.sub(r'^\s*type\s+', '', part.strip())
                part = re.split(r'\s+as\s+', part)[-1].strip()
                if re.fullmatch(r'[\w$]+', part):
                    syms.append(('export', part))
        for m in JS_EXPORT_STAR.finditer(text):
            syms.append(('export', f'* from {m.group(1)}'))
        for m in CJS_OBJ.finditer(text):
            for part in m.group(1).split(','):
                k = re.match(r'\s*([A-Za-z_$][\w$]*)', part)
                if k:
                    syms.append(('export', k.group(1)))
        for rx in (CJS_NAME, CJS_PROP):
            for m in rx.finditer(text):
                syms.append(('export', m.group(1)))
        for rx in (JS_FUNC, JS_ARROW, JS_FUNC_EXPR):
            for m in rx.finditer(text):
                syms.append(('fn', m.group(1)))
        if not syms:
            for rx in (JS_FUNC_INDENT, JS_ARROW_INDENT):
                for m in rx.finditer(text):
                    syms.append(('fn', m.group(1)))
        for m in ROUTE.finditer(text):
            syms.append(('route', f'{m.group(1).upper()} {m.group(2)}'))
    elif lang == 'py':
        tree = None
        try:
            tree = ast.parse(raw)
        except Exception:
            pass
        if tree is not None:
            for node in tree.body:
                if isinstance(node, ast.ClassDef):
                    syms.append(('class', f'class {node.name}'))
                    for sub in node.body:
                        if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            syms.append(('fn', sub.name))
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    syms.append(('fn', node.name))
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for a in node.names:
                        pyimps.append((0, a.name, []))
                elif isinstance(node, ast.ImportFrom):
                    pyimps.append((node.level or 0, node.module or '', [a.name for a in node.names]))
        else:
            for m in PY_CLASS_RX.finditer(text):
                syms.append(('class', f'class {m.group(1)}'))
            for m in PY_DEF_RX.finditer(text):
                syms.append(('fn', m.group(1)))
        for m in PY_ROUTE.finditer(text):
            verb = 'ANY' if m.group(1) == 'route' else m.group(1).upper()
            syms.append(('route', f'{verb} {m.group(2)}'))
    return syms, pyimps


def fmt_symbols(syms, cap):
    # JS/TS: when a file has exports, those are its API; local helpers are noise
    has_exports = any(c == 'export' for c, _ in syms)
    items, seen = [], set()
    for cat, label in sorted(syms, key=lambda s: CAT_ORDER[s[0]]):
        if cat == 'fn' and has_exports:
            continue
        name = label if cat == 'route' else label.split()[-1]
        if name.startswith('_') or name in seen:
            continue
        seen.add(name)
        items.append((cat, label))
    if not items:
        return '-'
    shown = items[:cap]
    extra = len(items) - len(shown)
    head = ', '.join(l for c, l in shown if c in ('class', 'type'))
    exp = ', '.join(l for c, l in shown if c == 'export')
    tail = ', '.join(l for c, l in shown if c in ('fn', 'route'))
    parts = [p for p in (head, f'exports: {exp}' if exp else '', tail) if p]
    if extra:
        parts[-1] += f', +{extra}'
    return '; '.join(parts)


# ------------------------------------------------------------------ dependencies
PHP_USE = re.compile(r'(?m)^use\s+(?!function\b|const\b)([^;]+);')
PHP_NEW = re.compile(r'\bnew\s+\\?([\w\\]+)')
PHP_STATIC = re.compile(r'(?<![\w$>])\\?([A-Z][\w\\]*)::')
PHP_INSTANCEOF = re.compile(r'\binstanceof\s+\\?([\w\\]+)')
PHP_EXTENDS = re.compile(r'\b(?:extends|implements)\s+([\w\\\s,]+?)\s*(?:\{|implements\b)')
PHP_REQ = re.compile(
    r'''\b(?:require|include)(?:_once)?\b\s*\(?\s*(?:__DIR__\s*\.\s*)?['"]([^'"]+\.php)['"]''')
JS_IMPORT = re.compile(
    r'''(?:\bimport\s+(?:[\w*{}\s,$]+?\s+from\s+)?|\bexport\s+(?:\*|\{[^}]*\})\s+from\s+'''
    r'''|\brequire\s*\(\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]''')


def php_refs(text):
    names = set()
    for m in PHP_USE.finditer(text):
        stmt = m.group(1).strip()
        grp = re.match(r'([\w\\]+)\\\{(.+)\}$', stmt, re.S)
        parts = ([p for p in grp.group(2).split(',')] if grp
                 else stmt.split(','))
        for p in parts:
            p = re.split(r'\s+as\s+', p.strip(), flags=re.I)[0].strip()
            if p:
                names.add(p.split('\\')[-1])
    for rx in (PHP_NEW, PHP_STATIC, PHP_INSTANCEOF):
        for m in rx.finditer(text):
            names.add(m.group(1).split('\\')[-1])
    for m in PHP_EXTENDS.finditer(text):
        for n in re.split(r'[,\s]+', m.group(1)):
            if n:
                names.add(n.split('\\')[-1])
    return names


def resolve_js(spec, from_rel, fileset):
    if spec.startswith('.'):
        bases = [posixpath.normpath(posixpath.join(posixpath.dirname(from_rel), spec))]
    elif spec.startswith(('@/', '~/')):
        sub = spec[2:]
        bases = [sub, 'src/' + sub]
    else:
        return None
    for b in bases:
        if b.startswith('..'):
            continue
        cands = [b] + [b + e for e in JS_EXTS] + [b + '/index' + e for e in JS_EXTS]
        m = re.match(r'(.+)\.(?:js|jsx|mjs|cjs)$', b)
        if m:
            cands += [m.group(1) + e for e in ('.ts', '.tsx')]
        for c in cands:
            if c in fileset:
                return c
    return None


def resolve_py(level, module, names, from_rel, fileset):
    cur = posixpath.dirname(from_rel)
    if level:
        base = cur
        for _ in range(level - 1):
            base = posixpath.dirname(base)
        bases = [base]
    else:
        bases = ['', cur, 'src']
    path = module.replace('.', '/') if module else ''
    for b in bases:
        p = posixpath.join(b, path) if path else b
        p = posixpath.normpath(p) if p else ''
        if p == '.':
            p = ''
        if p.startswith('..'):
            continue
        found = []
        if p:
            for c in (p + '.py', p + '/__init__.py'):
                if c in fileset:
                    found.append(c)
        for n in names:
            q = posixpath.join(p, n) if p else n
            for c in (q + '.py', q + '/__init__.py'):
                if c in fileset:
                    found.append(c)
        if found:
            return found
    return []


def build_deps(files):
    """Folder -> folder edges. Returns {src_dir: Counter({dst_dir: n})}."""
    fileset = {f['rel'] for f in files}
    class_dirs = defaultdict(set)
    for f in files:
        if f['lang'] == 'php':
            for cat, label in f['syms']:
                if cat == 'class':
                    class_dirs[label.split()[-1]].add(f['dir'])
    edges = defaultdict(Counter)
    for f in files:
        targets = {}  # key -> dst dir
        text = f['text']
        if f['lang'] == 'php':
            for name in php_refs(text):
                ds = class_dirs.get(name)
                if ds and len(ds) == 1:
                    targets['cls:' + name] = next(iter(ds))
            for m in PHP_REQ.finditer(text):
                spec = m.group(1)
                cands = [posixpath.normpath(posixpath.join(posixpath.dirname(f['rel']), spec.lstrip('/'))),
                         posixpath.normpath(spec.lstrip('/'))]
                for c in cands:
                    if c in fileset:
                        targets['file:' + c] = posixpath.dirname(c) or '.'
                        break
        elif f['lang'] == 'js':
            for spec in JS_IMPORT.findall(text):
                r = resolve_js(spec, f['rel'], fileset)
                if r:
                    targets['file:' + r] = posixpath.dirname(r) or '.'
        elif f['lang'] == 'py':
            for level, module, names in f['pyimps']:
                for r in resolve_py(level, module, names, f['rel'], fileset):
                    targets['file:' + r] = posixpath.dirname(r) or '.'
        for dst in targets.values():
            if dst != f['dir']:
                edges[f['dir']][dst] += 1
    return edges


# ------------------------------------------------------------------ sql
SQL_RX = [
    re.compile(r'\bINSERT\s+(?:IGNORE\s+)?INTO\s+[`"\[]?(\w+)', re.I),
    re.compile(r'\bUPDATE\s+[`"\[]?(\w+)[`"\]]?\s+SET\b', re.I),
    re.compile(r'\bDELETE\s+FROM\s+[`"\[]?(\w+)', re.I),
    re.compile(r'\bREPLACE\s+INTO\s+[`"\[]?(\w+)', re.I),
    re.compile(r'''\bSELECT\b[^;'"`]{0,400}?\bFROM\s+[`"\[]?(\w+)''', re.I),
    re.compile(r'\bJOIN\s+[`"\[]?(\w+)[`"\]]?(?:\s+(?:AS\s+)?\w+)?\s+ON\b', re.I),
    re.compile(r'''(?:->|::|\.)(?:table|insertInto)\s*\(\s*['"`](\w+)['"`]'''),
    re.compile(r'''->(?:from|into|join|leftJoin|rightJoin|innerJoin)\s*\(\s*['"`](\w+)['"`]'''),
]
SQL_CREATE = re.compile(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"\[]?(\w+)', re.I)


def scan_tables(files):
    tables = defaultdict(set)
    for f in files:
        found = set()
        for rx in SQL_RX:
            found.update(rx.findall(f['text']))
        for n in found:
            n = n.lower()
            if len(n) > 1 and n not in SQL_STOP:
                tables[n].add(f['rel'])
    return tables


# ------------------------------------------------------------------ manifests
def read_manifests(root, rels):
    out = []
    for rel in rels:
        path = os.path.join(root, rel)
        names = []
        low = os.path.basename(rel).lower()
        text = read_text(path)
        if low in ('package.json', 'composer.json'):
            try:
                data = json.loads(text)
            except ValueError:
                continue
            keys = (('dependencies', 'devDependencies') if low == 'package.json'
                    else ('require', 'require-dev'))
            for k in keys:
                for n in (data.get(k) or {}):
                    if n == 'php' or n.startswith('ext-'):
                        continue
                    names.append(n)
        else:
            for line in text.splitlines():
                line = line.split('#')[0].strip()
                if not line or line.startswith('-'):
                    continue
                n = re.split(r'[=<>~!;\s\[]', line)[0]
                if n:
                    names.append(n)
        if names:
            out.append((rel, names))
    return out


# ------------------------------------------------------------------ output
def fmt_tok(n):
    return f'~{round(n / 1000)}k tok' if n >= 1000 else f'~{n} tok'


def txt_name(base, rel_dir):
    name = base if rel_dir == '.' else f'{base}__{rel_dir.replace("/", "__")}'
    return re.sub(r'[<>:"|?*\\/]', '_', name) + '.txt'


def role_of(rel_dir):
    if rel_dir == '.':
        return ''
    return ROLE_OF.get(posixpath.basename(rel_dir).lower(), '')


def dir_label(d):
    return '(root)' if d == '.' else d


def main():
    ap = argparse.ArgumentParser(description='Merge source files per directory + compact INDEX.md')
    ap.add_argument('folder', nargs='?', help='project folder (asked interactively if omitted)')
    ap.add_argument('--out', help='output folder (default: "merged" next to this script)')
    ap.add_argument('--exts', default=DEFAULT_EXTS, help=f'extensions to merge (default: {DEFAULT_EXTS})')
    ap.add_argument('--ignore', default='', help='extra folder names to skip, comma separated')
    ap.add_argument('--max-symbols', type=int, default=8, help='symbols shown per file in INDEX')
    ap.add_argument('--no-deps', action='store_true', help='skip folder dependency analysis')
    ap.add_argument('--sql', action='store_true', help='add a tables -> files section')
    ap.add_argument('--folders-only', action='store_true', help='INDEX without per-file lines')
    args = ap.parse_args()

    folder = args.folder if args.folder else input('Folder: ')
    root = os.path.abspath(os.path.normpath(folder.strip().strip('"').strip("'")))
    if not os.path.isdir(root):
        sys.exit(f'Not a directory: {root}')

    self_path = os.path.abspath(__file__)
    exts = {'.' + e.strip().lstrip('.').lower() for e in args.exts.split(',') if e.strip()}
    skip = {d.lower() for d in SKIP_DIRS} | {x.strip().lower() for x in args.ignore.split(',') if x.strip()}
    out_dir = os.path.abspath(args.out) if args.out else os.path.join(os.path.dirname(self_path), 'merged')
    base = os.path.basename(root) or 'project'

    # ---- collect
    code, keys, manifests, sql_files, big = [], [], [], [], []
    for dp, dns, fns in os.walk(root):
        dns[:] = sorted(d for d in dns
                        if d.lower() not in skip and not d.startswith('.')
                        and os.path.abspath(os.path.join(dp, d)) != out_dir)
        for fn in sorted(fns):
            full = os.path.join(dp, fn)
            rel = os.path.relpath(full, root).replace(os.sep, '/')
            low = fn.lower()
            stem, ext = os.path.splitext(low)
            if rel.count('/') <= 2 and (low in KEY_NAMES or (stem in ('routes', 'router') and ext in exts)):
                keys.append(rel)
            if low in MANIFESTS:
                manifests.append(rel)
            if args.sql and ext == '.sql':
                sql_files.append(full)
            if ext in exts and not low.endswith(SKIP_SUFFIXES) and os.path.abspath(full) != self_path:
                try:
                    size = os.path.getsize(full)
                except OSError:
                    continue
                if size > MAX_FILE_BYTES:
                    big.append(rel)
                    continue
                code.append((full, rel))

    # ---- analyze
    files = []
    for full, rel in code:
        ext = os.path.splitext(rel)[1].lower()
        raw = read_text(full)
        lang = LANG.get(ext, 'none')
        text = clean(raw, lang)
        syms, pyimps = extract(raw, text, lang)
        try:
            mtime = datetime.fromtimestamp(os.path.getmtime(full)).strftime('%Y-%m-%d %H:%M:%S')
        except OSError:
            mtime = '?'
        files.append({'rel': rel, 'dir': posixpath.dirname(rel) or '.', 'lang': lang,
                      'raw': raw, 'text': text, 'lines': count_lines(raw), 'mtime': mtime,
                      'syms': syms, 'pyimps': pyimps})
    if not files:
        sys.exit('No matching files found.')

    by_dir = defaultdict(list)
    for f in files:
        by_dir[f['dir']].append(f)
    dirs = sorted(by_dir, key=lambda d: (d != '.', d.lower()))

    edges = {} if args.no_deps else build_deps(files)
    tables = scan_tables(files) if args.sql else {}
    schema_tables = set()
    for p in sql_files:
        schema_tables.update(t.lower() for t in SQL_CREATE.findall(read_text(p)))
    pkgs = read_manifests(root, manifests)

    # ---- write merged txt files
    os.makedirs(out_dir, exist_ok=True)
    for name in os.listdir(out_dir):
        if name.endswith('.txt') or name == 'INDEX.md':
            try:
                os.remove(os.path.join(out_dir, name))
            except OSError:
                pass

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    info = {}
    for d in dirs:
        group = sorted(by_dir[d], key=lambda f: f['rel'].lower())
        name = txt_name(base, d)
        parts = [f'# Generated: {now}\n# Project: {base} | Directory: {dir_label(d)} | Files: {len(group)}\n\n']
        for f in group:
            parts.append(f'{"=" * 70}\nFILE: {f["rel"]} | {f["lines"]} lines | modified {f["mtime"]}\n{"=" * 70}\n')
            parts.append(f['raw'])
            if not f['raw'].endswith('\n'):
                parts.append('\n')
            parts.append('\n\n')
        content = ''.join(parts)
        with open(os.path.join(out_dir, name), 'w', encoding='utf-8', newline='\n') as out:
            out.write(content)
        info[d] = {'name': name, 'tokens': len(content) // 4, 'files': group,
                   'lines': sum(f['lines'] for f in group)}

    # ---- write INDEX.md
    total_files = len(files)
    total_lines = sum(i['lines'] for i in info.values())
    total_tokens = sum(i['tokens'] for i in info.values())
    folders_only = args.folders_only or total_files > AUTO_FOLDERS_ONLY_ABOVE

    L = []
    L.append(f'# {base} — generated {now}')
    L.append(f'root: {root}')
    L.append(f'files: {total_files} | lines: {total_lines:,} | {fmt_tok(total_tokens)} | folders: {len(dirs)}')
    if folders_only and not args.folders_only:
        L.append(f'(more than {AUTO_FOLDERS_ONLY_ABOVE} files: showing folder level only)')
    if big:
        L.append(f'skipped (>{MAX_FILE_BYTES // 1000} KB): ' + ', '.join(big[:10]) + (f' +{len(big) - 10}' if len(big) > 10 else ''))
    L.append('')

    if keys:
        keys_sorted = sorted(keys, key=lambda k: (k.count('/'), k.lower()))
        L.append('## Key files')
        L.append(', '.join(keys_sorted[:20]) + (f' +{len(keys_sorted) - 20}' if len(keys_sorted) > 20 else ''))
        L.append('')

    if pkgs:
        L.append('## Dependencies')
        for rel, names in pkgs:
            extra = len(names) - MAX_PKGS_SHOWN
            L.append(f'{rel}: ' + ', '.join(names[:MAX_PKGS_SHOWN]) + (f' +{extra}' if extra > 0 else ''))
        L.append('')

    L.append('## Folders')
    for d in dirs:
        i = info[d]
        role = role_of(d)
        L.append(f'{dir_label(d)}  {"[" + role + "] " if role else ""}{len(i["files"])} files, '
                 f'{i["lines"]:,} lines → {i["name"]} ({fmt_tok(i["tokens"])})')
        if edges.get(d):
            top = edges[d].most_common()
            shown = ', '.join(f'{dir_label(t)}({c})' for t, c in top[:MAX_DEPS_SHOWN])
            more = len(top) - MAX_DEPS_SHOWN
            L.append(f'  deps: {shown}' + (f' +{more} more' if more > 0 else ''))
        if not folders_only:
            group = i['files']
            if len(group) > MAX_FILES_PER_FOLDER:
                group = sorted(sorted(group, key=lambda f: -f['lines'])[:MAX_FILES_PER_FOLDER],
                               key=lambda f: f['rel'].lower())
            for f in group:
                L.append(f'  {posixpath.basename(f["rel"])} {f["lines"]} | {fmt_symbols(f["syms"], args.max_symbols)}')
            if len(i['files']) > len(group):
                L.append(f'  … +{len(i["files"]) - len(group)} more files (largest shown)')
    L.append('')

    if args.sql:
        L.append('## Tables → files')
        if tables:
            for t in sorted(tables):
                fl = sorted(tables[t])
                tag = ' [in schema]' if t in schema_tables else ''
                L.append(f'{t}{tag}: ' + ', '.join(fl[:MAX_TABLE_FILES]) +
                         (f' +{len(fl) - MAX_TABLE_FILES}' if len(fl) > MAX_TABLE_FILES else ''))
        else:
            L.append('no table references found')
        unused = sorted(schema_tables - set(tables))
        if unused:
            L.append('in schema but not referenced in code: ' + ', '.join(unused))
        L.append('')

    with open(os.path.join(out_dir, 'INDEX.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(L).rstrip() + '\n')

    print(f'[✓] {len(dirs)} merged file(s) + INDEX.md -> {out_dir}')
    print(f'    {total_files} files | {total_lines:,} lines | {fmt_tok(total_tokens)}')


if __name__ == '__main__':
    main()