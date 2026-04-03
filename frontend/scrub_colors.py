import os
import re
import glob

# Task 3 specific rules for IntelligenceCenter + Task 4 specific rules for CaseContextBar
file_specific = {
    r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\components\judge\workspace\IntelligenceCenter.tsx": [
        (r"\bbg-white\b(?!/)", r"bg-[var(--bg-card)]"),
        (r"bg-\[\#F8FAFC\]", r"bg-[var(--bg-surface)]"),
        (r"border-emerald-100/40", r"border-[var(--border-color)]"),
        (r"bg-emerald-50/20", r"bg-[var(--primary)]/5"),
        (r"\bbg-emerald-50\b(?!/)", r"bg-[var(--primary)]/10"),
        (r"border-emerald-100", r"border-[var(--primary)]/20"),
        (r"text-emerald-600", r"text-[var(--primary)]"),
    ],
    r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\components\judge\workspace\CaseContextBar.tsx": [
        (r"bg-white/40 backdrop-blur-md", r"bg-[var(--bg-surface)]/70 backdrop-blur-md"),
        (r"text-emerald-600", r"text-[var(--primary)]"),
        (r"\bbg-white\b(?!/)", r"bg-[var(--bg-surface)]")
    ]
}

# Task 5-8 Global scrub rules
global_replacements = [
    (r"text-emerald-600", r"text-[var(--primary)]"),
    (r"bg-emerald-500/10", r"bg-[var(--primary)]/10"),
    (r"border-emerald-500/20", r"border-[var(--primary)]/20"),
    (r"border-l-emerald-500", r"border-l-[var(--primary)]"),
    (r"border-emerald-500", r"border-[var(--primary)]"),
    (r"\bdark:text-emerald-\d00\b", r""),
    (r"text-indigo-600", r"text-[var(--accent-gold)]"),
    (r"text-indigo-700", r"text-[var(--accent-gold)]"),
    (r"bg-indigo-500/10", r"bg-[var(--accent-gold)]/10"),
    (r"\bbg-indigo-50\b", r"bg-[var(--accent-gold)]/10"),
    (r"\bdark:bg-indigo-\w+(?:/\d+)?\b", r""),
    (r"\bdark:text-indigo-\d00\b", r""),
    (r"bg-\[\#F8FAFC\]", r"bg-[var(--bg-surface)]"),
    (r"\bbg-white\b(?!/)", r"bg-[var(--bg-card)]"), # Broadly target hardcoded white cards
]

def process(filepath):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} (does not exist)")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    orig = content
    rules = file_specific.get(filepath, global_replacements.copy())
    
    # Apply rules
    for pat, rep in rules:
        content = re.sub(pat, rep, content)
        
    # Cleanup rogue spaces
    content = re.sub(r' +', ' ', content)
    content = content.replace(' "', '"').replace('" ', '"').replace('className=" ', 'className="')
    
    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {os.path.basename(filepath)}")

# Execute
files_to_process = [
    r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\components\judge\workspace\IntelligenceCenter.tsx",
    r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\components\judge\workspace\CaseContextBar.tsx",
    r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\components\StatCard.tsx",
    r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\components\ui\badge.tsx",
    r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\pages\AdminDashboard.tsx",
    r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\pages\ClerkDashboard.tsx",
    r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\pages\JudgeDashboard.tsx"
]

files_to_process += glob.glob(r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\pages\admin\*.tsx")
files_to_process += glob.glob(r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\pages\judge\*.tsx")
files_to_process += glob.glob(r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src\pages\clerk\*.tsx")

# Discard Login.tsx as explicitly requested
files_to_process = [f for f in files_to_process if "Login.tsx" not in f]

for f in set(files_to_process):
    process(f)
