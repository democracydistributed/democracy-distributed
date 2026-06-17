#!/usr/bin/env python3
"""
generate-snapshot.py
Generates PROJECT-SNAPSHOT.md — a single, current context file for Claude chat.

Run from the repo root:
    python generate-snapshot.py

What it does (fully automatic — nothing to fill in):
  - Walks src/, builds a file tree
  - Extracts each file's purpose from its top-of-file comment or default export
  - Lists Next.js routes (app router) and API endpoints
  - Lists dependencies from package.json

Then: upload/replace PROJECT-SNAPSHOT.md in your Claude project. One file, always current.
"""

import os
import re
import json
import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "PROJECT-SNAPSHOT.md")

CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".css", ".mjs"}
SKIP_DIRS = {"node_modules", ".next", ".git", ".claude"}


def first_purpose(path):
    """Pull a one-line purpose from a file's leading comment or a clear signal."""
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            lines = [next(f) for _ in range(40)]
    except (StopIteration, OSError):
        try:
            with open(path, encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except OSError:
            return ""
    text = "".join(lines)

    # 1) Leading block or line comment
    m = re.search(r"/\*+\s*(.+?)\s*\*/", text, re.DOTALL)
    if m:
        cand = m.group(1).splitlines()[0].strip(" *")
        if cand and set(cand) - set("─-= "):
            return cand[:160]
    for ln in lines:
        s = ln.strip()
        if s.startswith("//"):
            c = s.lstrip("/ ").strip()
            if c and set(c) - set("─-= "):
                return c[:160]
        if s and not s.startswith(("import", "'use", '"use')):
            break

    # 2) Fallback signals
    if os.path.splitext(path)[1] == ".css":
        return "Stylesheet"
    m = re.search(r"export\s+default\s+function\s+(\w+)", text)
    if m:
        return f"Component/function: {m.group(1)}"
    m = re.search(r"export\s+(?:async\s+)?function\s+(\w+)", text)
    if m:
        return f"Exports: {m.group(1)}"
    exports = re.findall(r"export\s+(?:const|function|class)\s+(\w+)", text)
    if exports:
        return "Exports: " + ", ".join(dict.fromkeys(exports))[:140]
    return ""


def walk_files():
    out = []
    for dirpath, dirnames, filenames in os.walk(SRC):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in sorted(filenames):
            if os.path.splitext(fn)[1] in CODE_EXT:
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, ROOT).replace("\\", "/")
                out.append((rel, full))
    return sorted(out)


def routes(files):
    pages, apis = [], []
    for rel, _ in files:
        if "/app/" not in rel:
            continue
        if rel.endswith("/page.tsx") or rel.endswith("/page.jsx"):
            after = rel.split("/app/")[1]
            seg = after.rsplit("/page.", 1)[0] if "/page." in after else ""
            pages.append("/" + seg)
        if "/api/" in rel and (rel.endswith("route.ts") or rel.endswith("route.tsx")):
            seg = rel.split("/app/")[1].rsplit("/route.", 1)[0]
            apis.append("/" + seg)
    return sorted(set(pages)), sorted(set(apis))


def tree(files):
    lines, seen = [], set()
    for rel, _ in files:
        parts = rel.split("/")
        for i in range(1, len(parts)):
            d = "/".join(parts[:i])
            if d not in seen:
                seen.add(d)
                lines.append("  " * (i - 1) + parts[i - 1] + "/")
        lines.append("  " * (len(parts) - 1) + parts[-1])
    final, prev = [], None
    for ln in lines:
        if ln != prev:
            final.append(ln)
        prev = ln
    return "\n".join(final)


def main():
    files = walk_files()
    pages, apis = routes(files)

    pkg = {}
    pkg_path = os.path.join(ROOT, "package.json")
    if os.path.exists(pkg_path):
        with open(pkg_path, encoding="utf-8") as f:
            pkg = json.load(f)
    deps = pkg.get("dependencies", {})

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    out = []
    out.append("# Democracy Distributed — Next.js App Snapshot")
    out.append(f"_Auto-generated {now}. Regenerate with `python generate-snapshot.py`._\n")
    out.append("## Stack")
    out.append(f"Next.js app (`{pkg.get('name','')}` v{pkg.get('version','')}). "
               "Key deps: " + ", ".join(f"{k} {v}" for k, v in deps.items()) + ".\n")

    out.append("## Routes (pages)")
    out.append("\n".join(f"- `{p}`" for p in pages) or "- (none)")
    out.append("\n## API endpoints")
    out.append("\n".join(f"- `{a}`" for a in apis) or "- (none)")

    out.append("\n## File tree (src/)")
    out.append("```\n" + tree(files) + "\n```")

    out.append("\n## File purposes")
    for rel, full in files:
        p = first_purpose(full)
        out.append(f"- `{rel}` — {p}" if p else f"- `{rel}`")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print(f"Wrote {OUT} ({len(files)} files documented)")


if __name__ == "__main__":
    main()
