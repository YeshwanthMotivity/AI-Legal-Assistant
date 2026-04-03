import os
import re

def apply_rules(filepath, rules):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} (not found)")
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    for pat, rep in rules:
        content = re.sub(pat, rep, content)
    if content != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {os.path.basename(filepath)}")
    else:
        print(f"No changes: {os.path.basename(filepath)}")

base = r"c:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\frontend\src"

# --- CaseDetail.tsx: emerald → var(--primary), label renames ---
apply_rules(os.path.join(base, "pages", "judge", "CaseDetail.tsx"), [
    # Progress lines
    (r"bg-emerald-500 z-0", r"bg-[var(--primary)] z-0"),
    # Stage circle borders
    (r"border-emerald-600", r"border-[var(--primary)]"),
    (r"text-emerald-700", r"text-[var(--primary)]"),
    (r"border-emerald-600/30", r"border-[var(--primary)]/30"),
    (r"border-emerald-600/60", r"border-[var(--primary)]/60"),
    (r"bg-emerald-600/20", r"bg-[var(--primary)]/20"),
    (r"bg-emerald-600/5", r"bg-[var(--primary)]/5"),
    (r"bg-emerald-600/10", r"bg-[var(--primary)]/10"),
    (r"bg-emerald-600", r"bg-[var(--primary)]"),
    (r"bg-emerald-50", r"bg-[var(--primary)]/10"),
    (r"border-emerald-200", r"border-[var(--primary)]/20"),
    (r"text-emerald-800", r"text-[var(--primary)]"),
    (r"border-emerald-100/40", r"border-[var(--border-color)]"),
    (r"border-emerald-100", r"border-[var(--primary)]/20"),
    (r"bg-emerald-500/30", r"bg-[var(--primary)]/30"),
    (r"bg-emerald-500/10", r"bg-[var(--primary)]/10"),
    (r"bg-emerald-500/5", r"bg-[var(--primary)]/5"),
    (r"text-emerald-500", r"text-[var(--primary)]"),
    (r"shadow-emerald-600/20", r"shadow-[var(--primary)]/20"),
    (r"shadow-emerald-500/30", r"shadow-[var(--primary)]/30"),
    (r"shadow-emerald-500/10", r"shadow-[var(--primary)]/10"),
    (r"shadow-emerald-500/5", r"shadow-[var(--primary)]/5"),
    (r"hover:bg-emerald-700", r"hover:bg-[var(--primary-hover)]"),
    (r"hover:bg-emerald-600/30", r"hover:bg-[var(--primary)]/30"),
    (r"hover:bg-emerald-600/10", r"hover:bg-[var(--primary)]/10"),
    (r"hover:border-emerald-600/30", r"hover:border-[var(--primary)]/30"),
    (r"hover:border-emerald-600/20", r"hover:border-[var(--primary)]/20"),
    (r"hover:border-emerald-600/60", r"hover:border-[var(--primary)]/60"),
    (r"accent-emerald-600", r"accent-[var(--primary)]"),
    (r"border-emerald-500/30", r"border-[var(--primary)]/30"),
    (r"border-emerald-500", r"border-[var(--primary)]"),
    (r"border-t-emerald-600", r"border-t-[var(--primary)]"),
    (r"focus:border-emerald-600", r"focus:border-[var(--primary)]"),
    (r"focus:ring-emerald-600", r"focus:ring-[var(--primary)]"),
    # Dark mode leftovers
    (r" dark:bg-surface-container", r""),
    # Label renames
    (r"Judicial Discovery", r"Case Details"),
    (r"Verified Ingress Configuration", r"Case Information"),
    (r"Proceeding Designation", r"Case Title"),
    (r"Registry ID", r"Case ID"),
    (r"Party Orchestration", r"Parties"),
    (r"Validated Claimant", r"Claimant"),
    (r"Target Respondent", r"Respondent"),
    (r"Aggregate Claim Quantum", r"Claim Amount"),
    (r"Evidence Ingestion", r"Upload Documents"),
    (r"Synchronized Digital Repository", r"Case File Storage"),
    (r"Registration Synthesis", r"Case Overview"),
    (r"Reasoning Workbench", r"AI Analysis"),
    (r"Orchestration Critique", r"Judgment Review"),
    (r"System Evolution", r"Feedback"),
    (r"Judicial Audit & Node Feedback", r"Judge Feedback"),
    (r"System Calibration Protocol", r"Rate AI Performance"),
    (r"Submit Calibration Payload", r"Submit Feedback"),
    (r"Strategic Category", r"Case Type"),
    (r"Ingress Date", r"Filing Date"),
    (r"Procedural Chronology", r"Case Background"),
    (r"Initialize Synthesis", r"Run AI Analysis"),
    (r"Run Intelligence Mapping", r"Run AI Analysis"),
    (r"Economic Priority: CRITICAL", r"Claim Priority: HIGH"),
    (r"bg-surface-container-lowest dark:bg-surface-container", r"bg-[var(--bg-card)]"),
    (r"bg-surface-container-lowest", r"bg-[var(--bg-card)]"),
    (r"h-\[calc\(100vh-40px\)\] -m-10", r"h-[calc(100vh-64px)] -m-6"),
])

# --- DocumentsPanel.tsx: emerald → var(--primary), label renames ---
apply_rules(os.path.join(base, "components", "judge", "workspace", "DocumentsPanel.tsx"), [
    (r"bg-emerald-600/5", r"bg-[var(--primary)]/5"),
    (r"bg-emerald-600", r"bg-[var(--primary)]"),
    (r"text-emerald-600/70", r"text-[var(--primary)]/70"),
    (r"text-emerald-600", r"text-[var(--primary)]"),
    (r"text-emerald-500", r"text-[var(--primary)]"),
    (r"bg-emerald-50", r"bg-[var(--primary)]/10"),
    (r"border-emerald-100", r"border-[var(--primary)]/20"),
    (r"focus:border-emerald-600", r"focus:border-[var(--primary)]"),
    (r"focus:ring-emerald-600", r"focus:ring-[var(--primary)]"),
    (r"hover:border-emerald-600/50", r"hover:border-[var(--primary)]/50"),
    (r"hover:border-emerald-500/30", r"hover:border-[var(--primary)]/30"),
    (r"hover:bg-emerald-700", r"hover:bg-[var(--primary-hover)]"),
    (r"shadow-emerald-500/10", r"shadow-[var(--primary)]/10"),
    (r"bg-\[\#F8FAFC\]", r"bg-[var(--bg-surface)]"),
    (r"bg-white(?= )", r"bg-[var(--bg-card)]"),
    # Label renames
    (r"Context Injection", r"Upload Files"),
    (r"Augmented Evidence Ingress", r"Add documents to this case"),
    (r"Digital Category", r"Document Type"),
    (r"Selection Terminal", r"Choose File"),
    (r"Browse Repository\.\.\.", r"Select a file..."),
    (r"Inject to Metadata Node", r"Upload Document"),
    (r"Synchronizing\.\.\.", r"Uploading..."),
    (r"Active Manifest", r"Uploaded Files"),
    (r"Redacted manifesting pending", r"No documents uploaded yet"),
    (r"Dynamic Compensation Accounting", r"Calculated Entitlements"),
    (r"Entitlement Synthesis", r"Entitlement Calculation"),
    (r"Missing Proof Point", r"Missing Data"),
    (r" Units\b", r" Files"),
])

# --- IntelligenceCenter.tsx: emerald → var(--primary), label renames ---
apply_rules(os.path.join(base, "components", "judge", "workspace", "IntelligenceCenter.tsx"), [
    (r"bg-emerald-600/5", r"bg-[var(--primary)]/5"),
    (r"bg-emerald-600/10", r"bg-[var(--primary)]/10"),
    (r"bg-emerald-600", r"bg-[var(--primary)]"),
    (r"shadow-emerald-600/20", r"shadow-[var(--primary)]/20"),
    (r"hover:border-emerald-600/30", r"hover:border-[var(--primary)]/30"),
    (r"hover:shadow-emerald-500/5", r"hover:shadow-[var(--primary)]/5"),
    (r"hover:bg-emerald-600/10", r"hover:bg-[var(--primary)]/10"),
    (r"hover:bg-emerald-600", r"hover:bg-[var(--primary)]"),
    (r"hover:border-emerald-500", r"hover:border-[var(--primary)]"),
    (r"bg-emerald-500", r"bg-[var(--primary)]"),
    (r"bg-emerald-50/10", r"bg-[var(--primary)]/5"),
    (r"bg-emerald-50", r"bg-[var(--primary)]/10"),
    (r"border-emerald-100", r"border-[var(--primary)]/20"),
    (r"border-emerald-500", r"border-[var(--primary)]"),
    # Label renames
    (r"Strategic Synthesis", r"Case Summary"),
    (r"Grounded Logic Generation", r"AI Analysis"),
    (r"Precedent Discovery", r"Similar Cases"),
    (r"Statutory Framework", r"Related Laws"),
    (r"Citation Manifest", r"Referenced Articles"),
    (r"Units Mapped", r"Cases Found"),
    (r"RULING ID:", r"Case:"),
    (r"High Affinity", r"Strong Match"),
    (r"Digital Case File Accessible", r"View Full Case"),
    (r"Add Statutory Citation", r"Add Law Reference"),
])

# --- CaseList.tsx (judge): dark class cleanup ---
apply_rules(os.path.join(base, "pages", "judge", "CaseList.tsx"), [
    (r"bg-surface-container-lowest dark:bg-surface-container", r"bg-[var(--bg-card)]"),
    (r"bg-surface-container-lowest", r"bg-[var(--bg-card)]"),
    (r" dark:bg-surface-container", r""),
])

# --- JudgeDashboard.tsx: residual dark class cleanup ---
apply_rules(os.path.join(base, "pages", "JudgeDashboard.tsx"), [
    (r"bg-surface-container-lowest dark:bg-surface-container", r"bg-[var(--bg-card)]"),
    (r"bg-surface-container-lowest", r"bg-[var(--bg-card)]"),
    (r" dark:bg-surface-container", r""),
    (r"bg-emerald-500/5", r"bg-[var(--primary)]/5"),
])

print("\\nDone! All files scrubbed.")
