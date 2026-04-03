import os
import re
import glob

def apply_rules(filepath, rules):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    for pat, rep in rules:
        content = re.sub(pat, rep, content)
    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Fixed: {os.path.basename(filepath)}")

base = r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src"

# Global emerald → var(--primary) rules
emerald_rules = [
    (r"bg-emerald-600/5", r"bg-[var(--primary)]/5"),
    (r"bg-emerald-600/10", r"bg-[var(--primary)]/10"),
    (r"bg-emerald-600/20", r"bg-[var(--primary)]/20"),
    (r"bg-emerald-600", r"bg-[var(--primary)]"),
    (r"bg-emerald-500/30", r"bg-[var(--primary)]/30"),
    (r"bg-emerald-500/20", r"bg-[var(--primary)]/20"),
    (r"bg-emerald-500/10", r"bg-[var(--primary)]/10"),
    (r"bg-emerald-500/5", r"bg-[var(--primary)]/5"),
    (r"bg-emerald-500", r"bg-[var(--primary)]"),
    (r"bg-emerald-50/20", r"bg-[var(--primary)]/5"),
    (r"bg-emerald-50/10", r"bg-[var(--primary)]/5"),
    (r"bg-emerald-50", r"bg-[var(--primary)]/10"),
    (r"bg-emerald-100", r"bg-[var(--primary)]/10"),
    (r"text-emerald-800", r"text-[var(--primary)]"),
    (r"text-emerald-700", r"text-[var(--primary)]"),
    (r"text-emerald-600", r"text-[var(--primary)]"),
    (r"text-emerald-500", r"text-[var(--primary)]"),
    (r"text-emerald-400", r"text-[var(--primary)]"),
    (r"text-emerald-100/80", r"text-[var(--bg-surface)]/80"),
    (r"text-emerald-100/50", r"text-[var(--bg-surface)]/50"),
    (r"border-emerald-600/30", r"border-[var(--primary)]/30"),
    (r"border-emerald-600/20", r"border-[var(--primary)]/20"),
    (r"border-emerald-600", r"border-[var(--primary)]"),
    (r"border-emerald-500/30", r"border-[var(--primary)]/30"),
    (r"border-emerald-500/20", r"border-[var(--primary)]/20"),
    (r"border-emerald-500", r"border-[var(--primary)]"),
    (r"border-emerald-200", r"border-[var(--primary)]/20"),
    (r"border-emerald-100/40", r"border-[var(--border-color)]"),
    (r"border-emerald-100", r"border-[var(--primary)]/20"),
    (r"border-t-emerald-600", r"border-t-[var(--primary)]"),
    (r"border-l-emerald-500", r"border-l-[var(--primary)]"),
    (r"focus:border-emerald-600", r"focus:border-[var(--primary)]"),
    (r"focus:ring-emerald-600", r"focus:ring-[var(--primary)]"),
    (r"hover:bg-emerald-700", r"hover:bg-[var(--primary-hover)]"),
    (r"hover:bg-emerald-600", r"hover:bg-[var(--primary)]"),
    (r"hover:border-emerald-600/50", r"hover:border-[var(--primary)]/50"),
    (r"hover:border-emerald-600/30", r"hover:border-[var(--primary)]/30"),
    (r"hover:border-emerald-500/30", r"hover:border-[var(--primary)]/30"),
    (r"hover:border-emerald-500", r"hover:border-[var(--primary)]"),
    (r"accent-emerald-600", r"accent-[var(--primary)]"),
    (r"shadow-emerald-600/20", r"shadow-[var(--primary)]/20"),
    (r"shadow-emerald-500/30", r"shadow-[var(--primary)]/30"),
    (r"shadow-emerald-500/10", r"shadow-[var(--primary)]/10"),
    (r"shadow-emerald-500/5", r"shadow-[var(--primary)]/5"),
    (r"ring-emerald-500/20", r"ring-[var(--primary)]/20"),
]

# dark: class removal
dark_rules = [
    (r"\s*dark:bg-emerald-\w+(?:/\d+)?", r""),
    (r"\s*dark:text-emerald-\w+(?:/\d+)?", r""),
    (r"\s*dark:border-emerald-\w+(?:/\d+)?", r""),
    (r"\s*dark:bg-surface-container\b", r""),
    (r"\s*dark:bg-\w+-\d+(?:/\d+)?", r""),
    (r"\s*dark:text-\w+-\d+(?:/\d+)?", r""),
    (r"\s*dark:border-\w+-\d+(?:/\d+)?", r""),
]

combined = emerald_rules + dark_rules

# Skip Login.tsx (preserved by user request) and architecture components (they use emerald for Login branding)
skip = {"Login.tsx", "BackgroundPreview.tsx", "ArchitectureModal.tsx"}

# Find all TSX files
all_tsx = glob.glob(os.path.join(base, "**", "*.tsx"), recursive=True)

print("=== Final cleanup pass ===")
for f in all_tsx:
    bn = os.path.basename(f)
    if bn in skip:
        continue
    apply_rules(f, combined)

print("\n=== Done! ===")
