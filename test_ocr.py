"""
test_ocr.py — Standalone OCR quality test
Run this locally on Windows to verify extraction quality
before migrating to the VM.

Usage:
    python test_ocr.py --arabic path/to/arabic.pdf --english path/to/english.pdf

Example:
    python test_ocr.py --arabic case1-arb.pdf --english case1-eng.pdf
"""

import argparse
import io
import os
import re
import sys
import unicodedata
import logging
from pathlib import Path

logging.basicConfig(level=logging.WARNING, format='%(levelname)s: %(message)s')

ARABIC_CHARS = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+')


# ── Dependency check ──────────────────────────────────────────────────────────

def check_dependencies():
    print("\n📦 Checking dependencies...")
    missing = []
    for pkg, import_name in [
        ("pdfplumber", "pdfplumber"),
        ("pypdf", "pypdf"),
        ("pytesseract", "pytesseract"),
        ("Pillow", "PIL"),
    ]:
        try:
            __import__(import_name)
            print(f"  ✅ {pkg}")
        except ImportError:
            print(f"  ❌ {pkg} — MISSING")
            missing.append(pkg)

    if missing:
        print(f"\nInstall missing packages:")
        print(f"  pip install {' '.join(missing)}")
        sys.exit(1)

    try:
        import pytesseract
        tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.exists(tesseract_path):
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        version = pytesseract.get_tesseract_version()
        print(f"  ✅ Tesseract {version}")
        langs = pytesseract.get_languages()
        if 'ara' in langs:
            print(f"  ✅ Arabic language pack (ara)")
        else:
            print(f"  ⚠️  Arabic language pack missing")
    except Exception as e:
        print(f"  ⚠️  Tesseract: {e}")
    print()


# ── Language detection ────────────────────────────────────────────────────────

def detect_language(text: str) -> str:
    arabic_count = len(ARABIC_CHARS.findall(text))
    total = len(text.replace(' ', ''))
    if total == 0:
        return 'unknown'
    ratio = arabic_count / total
    if ratio > 0.5:
        return 'ar (Arabic dominant)'
    elif ratio > 0.1:
        return 'mixed (Arabic + English)'
    return 'en (English dominant)'


# ── Text cleaning ─────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFKC', text)
    text = re.sub(r'https?://[^\s\u0600-\u06FF]*', '', text)
    text = re.sub(r'www\.[^\s\u0600-\u06FF]*', '', text)
    text = re.sub(r'^\d+/\d+\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\d{1,2}/\d{1,2}/\d{2,4},?\s*\d{1,2}:\d{2}\s*(AM|PM)?', '', text)
    nav_en = (
        r'\b(About|Services|Rules\s*&\s*Decisions|Media\s*Centre|Login|Home|'
        r'Judgments\s*&\s*Orders|Court\s*of\s*First\s*Instance|'
        r'Privacy\s*Policy|Terms\s*of\s*Use|Quality\s*Policy|Disclaimer|'
        r'Useful\s*Links|DIFC\s*Courts)\b'
    )
    text = re.sub(nav_en, '', text)
    nav_ar = (
        r'(تسجيل الدخول|الخدمات|القواعد والقرارات|مركز الإعلام|حول|'
        r'الأحكام والأوامر|محكمة الدرجة الأولى|المنزل)'
    )
    text = re.sub(nav_ar, '', text)
    text = re.sub(r'Copyright\s*©.*', '', text)
    text = re.sub(r'حقوق الطبع.*', '', text)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r'[\u200e\u200f\u202a-\u202e]', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    lines = [l.strip() for l in text.split('\n')]
    lines = [l for l in lines if len(l) > 2 or l == '']
    return '\n'.join(lines).strip()


# ── Extraction methods ────────────────────────────────────────────────────────

def extract_pypdf(file_bytes: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += (page.extract_text() or "") + "\n"
    return text.strip()


def extract_pdfplumber(file_bytes: bytes) -> str:
    import pdfplumber
    full_text = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages):
            try:
                words = page.extract_words(
                    x_tolerance=3, y_tolerance=3,
                    keep_blank_chars=False, use_text_flow=True, extra_attrs=[]
                )
                if not words:
                    text = page.extract_text(layout=True)
                    if text:
                        full_text.append(text)
                    continue

                lines: dict = {}
                for word in words:
                    y_key = round(word['top'] / 5) * 5
                    if y_key not in lines:
                        lines[y_key] = []
                    lines[y_key].append(word)

                page_lines = []
                for y_key in sorted(lines.keys()):
                    line_words = lines[y_key]
                    sample = ' '.join(w['text'] for w in line_words)
                    is_arabic = bool(ARABIC_CHARS.search(sample))
                    if is_arabic:
                        line_words.sort(key=lambda w: w['x0'], reverse=True)
                    else:
                        line_words.sort(key=lambda w: w['x0'])
                    line_text = ' '.join(w['text'] for w in line_words)
                    if line_text.strip():
                        page_lines.append(line_text)

                if page_lines:
                    full_text.append('\n'.join(page_lines))
            except Exception:
                text = page.extract_text()
                if text:
                    full_text.append(text)

    return '\n\n'.join(full_text)


# ── Quality scoring ───────────────────────────────────────────────────────────

def score_quality(text: str, expected_language: str) -> dict:
    if not text or len(text.strip()) < 10:
        return {"score": 0, "issues": ["Empty output"], "chars": 0,
                "words": 0, "lines": 0, "arabic_ratio": "0%", "noise_count": 0}

    words = text.split()
    lines = [l for l in text.split('\n') if l.strip()]
    arabic_count = len(ARABIC_CHARS.findall(text))
    total_chars = len(text.replace(' ', ''))
    arabic_ratio = arabic_count / max(total_chars, 1)

    noise_urls = len(re.findall(r'https?://', text))
    noise_nav_en = len(re.findall(r'\b(About|Services|Login|Home|Media Centre)\b', text))
    noise_nav_ar = len(re.findall(r'(تسجيل الدخول|الخدمات|القواعد)', text))
    noise_total = noise_urls + noise_nav_en + noise_nav_ar

    single_chars = sum(1 for w in words if len(w) == 1 and w.isalpha())
    garbled_ratio = single_chars / max(len(words), 1)

    score = 100
    issues = []

    if len(text) < 300:
        score -= 40
        issues.append("Very short output")
    if noise_total > 3:
        score -= min(30, noise_total * 5)
        issues.append(f"{noise_total} noise fragments found")
    if garbled_ratio > 0.25:
        score -= 20
        issues.append(f"Possibly garbled ({garbled_ratio:.0%} single-char words)")
    if expected_language == 'ar' and arabic_ratio < 0.2:
        score -= 25
        issues.append(f"Expected Arabic but only {arabic_ratio:.0%} Arabic chars")

    return {
        "score": max(0, score),
        "issues": issues if issues else ["None — looks clean \u2705"],
        "chars": len(text),
        "words": len(words),
        "lines": len(lines),
        "arabic_ratio": f"{arabic_ratio:.1%}",
        "noise_count": noise_total,
    }


# ── NER check ─────────────────────────────────────────────────────────────────

def check_ner(text: str) -> dict:
    results = {}
    case_num = re.search(
        r'(?:Claim No|CFI|SCT|CA|رقم المطالبة)[.\s:]*([A-Z0-9/\-]+)',
        text, re.IGNORECASE
    )
    results["case_number"] = case_num.group(1).strip() if case_num else "❌ Not found"

    claimant = re.search(
        r'(?:Claimant|BETWEEN\s+)([A-Z][A-Z\s]+?)(?:\n|Respondent|and\b)',
        text
    )
    results["claimant"] = claimant.group(1).strip() if claimant else "❌ Not found"

    respondent = re.search(
        r'(?:Respondent|Defendant)\s*\n\s*([A-Z][A-Z\s]+?)(?:\n|$)', text
    )
    results["respondent"] = respondent.group(1).strip() if respondent else "❌ Not found"

    articles = re.findall(r'(?:Article|المادة)\s*(\d+)', text, re.IGNORECASE)
    results["law_articles"] = list(set(articles))[:10] if articles else ["❌ None found"]

    amounts = re.findall(r'(?:AED|USD)\s*([\d,]+(?:\.\d{2})?)', text)
    results["amounts"] = amounts[:5] if amounts else ["❌ None found"]

    return results


# ── Test runner ───────────────────────────────────────────────────────────────

def sep(title: str = "", width: int = 65):
    if title:
        pad = max(0, width - len(title) - 7)
        print(f"\n{'─' * 5} {title} {'─' * pad}")
    else:
        print('─' * width)


def test_pdf(pdf_path: str, label: str, expected_language: str):
    print(f"\n{'=' * 65}")
    print(f"  FILE   : {label}")
    print(f"  PATH   : {pdf_path}")
    print(f"  EXPECT : {expected_language.upper()} document")
    print(f"{'=' * 65}")

    if not os.path.exists(pdf_path):
        print(f"\n❌ File not found: {pdf_path}")
        return None, None

    with open(pdf_path, 'rb') as f:
        file_bytes = f.read()
    print(f"\n📄 File size: {len(file_bytes):,} bytes")

    output_dir = Path("test_output")
    output_dir.mkdir(exist_ok=True)
    safe = label.lower().replace(' ', '_').replace('/', '_')

    # Method 1: pypdf
    sep("METHOD 1 — pypdf (ORIGINAL / your current code)")
    try:
        raw_old = extract_pypdf(file_bytes)
        s = score_quality(raw_old, expected_language)
        print(f"  Language  : {detect_language(raw_old)}")
        print(f"  Chars     : {s['chars']:,}  |  Words: {s['words']:,}  |  Lines: {s['lines']:,}")
        print(f"  Arabic    : {s['arabic_ratio']}  |  Noise: {s['noise_count']}")
        print(f"  Score     : {s['score']}/100")
        print(f"  Issues    : {'; '.join(s['issues'])}")
        print(f"\n  Sample (first 400 chars):")
        print(f"  {repr(raw_old[:400])}")
        (output_dir / f"{safe}_1_pypdf.txt").write_text(raw_old, encoding='utf-8')
        old_score = s['score']
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        old_score = 0

    # Method 2: pdfplumber
    sep("METHOD 2 — pdfplumber (NEW / fixed code)")
    try:
        raw_new = extract_pdfplumber(file_bytes)
        cleaned = clean_text(raw_new)
        s_raw = score_quality(raw_new, expected_language)
        s_clean = score_quality(cleaned, expected_language)
        print(f"  Language  : {detect_language(cleaned)}")
        print(f"  Chars     : {s_clean['chars']:,}  |  Words: {s_clean['words']:,}  |  Lines: {s_clean['lines']:,}")
        print(f"  Arabic    : {s_clean['arabic_ratio']}  |  Noise: {s_clean['noise_count']}")
        print(f"  Score     : {s_raw['score']}/100 raw → {s_clean['score']}/100 cleaned")
        print(f"  Issues    : {'; '.join(s_clean['issues'])}")
        print(f"\n  Sample (first 400 chars, cleaned):")
        print(f"  {repr(cleaned[:400])}")
        (output_dir / f"{safe}_2_pdfplumber_raw.txt").write_text(raw_new, encoding='utf-8')
        (output_dir / f"{safe}_3_pdfplumber_cleaned.txt").write_text(cleaned, encoding='utf-8')
        new_score = s_clean['score']

        sep("ENTITY CHECK (regex on cleaned text)")
        ner = check_ner(cleaned)
        print(f"  Case No    : {ner['case_number']}")
        print(f"  Claimant   : {ner['claimant']}")
        print(f"  Respondent : {ner['respondent']}")
        print(f"  Articles   : {ner['law_articles']}")
        print(f"  Amounts    : {ner['amounts']}")

    except Exception as e:
        print(f"  ❌ Failed: {e}")
        new_score = 0

    sep("COMPARISON")
    improvement = new_score - old_score
    emoji = "\u2705" if improvement > 10 else "⚠️ " if improvement >= 0 else "❌"
    print(f"  pypdf score      : {old_score}/100")
    print(f"  pdfplumber score : {new_score}/100")
    print(f"  {emoji} Improvement   : {improvement:+d} points")
    print(f"\n  💾 Files saved to test_output/")

    return old_score, new_score


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Test OCR extraction quality on DIFC legal PDFs'
    )
    parser.add_argument('--arabic', '-a', default=None, help='Path to Arabic PDF')
    parser.add_argument('--english', '-e', default=None, help='Path to English PDF')
    args = parser.parse_args()

    print("\n" + "=" * 65)
    print("  DIFC LEGAL DOCUMENT — OCR QUALITY TEST")
    print("=" * 65)

    check_dependencies()

    if not args.arabic and not args.english:
        print("⚠️  No files specified.")
        print("Usage: python test_ocr.py --arabic case1-arb.pdf --english case1-eng.pdf")
        sys.exit(1)

    results = {}
    if args.arabic:
        old, new = test_pdf(args.arabic, "Arabic Legal Document", "ar")
        if old is not None:
            results["Arabic"] = (old, new)
    if args.english:
        old, new = test_pdf(args.english, "English Legal Document", "en")
        if old is not None:
            results["English"] = (old, new)

    print(f"\n{'=' * 65}")
    print("  FINAL SUMMARY")
    print(f"{'=' * 65}")
    all_good = True
    for lang, (old, new) in results.items():
        status = "\u2705 PASS" if new >= 70 else "⚠️  MARGINAL" if new >= 50 else "❌ FAIL"
        print(f"  {lang:10} | pypdf: {old}/100 → pdfplumber: {new}/100 | {status}")
        if new < 70:
            all_good = False

    print()
    if all_good:
        print("  \u2705 Extraction quality is good — ready to proceed.")
        print("  Next: fix 4 backend files → push to GitHub → wait for VM.")
    else:
        print("  ⚠️  Some scores are below 70.")
        print("  → Open test_output/ files in VS Code and inspect the text.")
        print("  → Share the output here for further diagnosis.")
    print(f"{'=' * 65}\n")


if __name__ == "__main__":
    main()
