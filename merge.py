import os

EXTS = ('.php', '.js')
SKIP_DIRS = {'node_modules', '.git', 'vendor', '.next', 'dist', 'build'}

folder = os.path.abspath(os.path.normpath(input('Folder: ').strip().strip('"')))
base = os.path.basename(folder)
out_dir = os.path.abspath(f'{base}_merged')
os.makedirs(out_dir, exist_ok=True)

count = 0
for root, dirs, files in os.walk(folder):
    dirs[:] = sorted(
        d for d in dirs
        if d not in SKIP_DIRS and os.path.abspath(os.path.join(root, d)) != out_dir
    )
    names = sorted(
        f for f in files
        if f.lower().endswith(EXTS) and not f.lower().endswith('.min.js')
    )
    if not names:
        continue

    rel_dir = os.path.relpath(root, folder)
    out_name = base if rel_dir == '.' else f'{base}__{rel_dir.replace(os.sep, "__")}'
    out_path = os.path.join(out_dir, f'{out_name}.txt')

    with open(out_path, 'w', encoding='utf-8') as out:
        for name in names:
            rel = os.path.relpath(os.path.join(root, name), folder)
            with open(os.path.join(root, name), 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            out.write(f'{"=" * 70}\nFILE: {rel}\n{"=" * 70}\n')
            out.write(content)
            if not content.endswith('\n'):
                out.write('\n')
            out.write('\n\n')

    count += 1
    print(f'[✓] {rel_dir} -> {out_path}')

print(f'\nDone: {count} file(s) in {out_dir}')