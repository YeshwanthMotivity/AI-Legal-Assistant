import os

L_DIR = r"C:\Yash\Legal-AI\AI-Judicial-Assistant-Platform\data\DIFC (Dubai International Financial Centre Court)\Laws"

print(f"{'Size (MB)':<10} | {'Name'}")
print("-" * 50)

for root, dirs, files in os.walk(L_DIR):
    for f in files:
        if f.lower().endswith(".pdf"):
            p = os.path.join(root, f)
            s = os.path.getsize(p) / (1024 * 1024)
            print(f"{s:<10.2f} | {f}")
