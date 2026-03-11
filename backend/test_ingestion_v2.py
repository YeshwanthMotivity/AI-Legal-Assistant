import asyncio
import sys
import os

from app.modules.ingestion.parser import LegalStructureParser
from app.modules.ingestion.chunker import hybrid_chunk_legal_doc

SAMPLE_TEXT = """
Case Number: DIFC-2023-456
Court: DIFC Court of First Instance
Date: 2023-11-20

FACTS:
The Claimant, John Doe, was employed by Global Tech Ltd as a Senior Engineer. 
The employment started on 2020-01-01 and ended on 2023-10-15.
The Claimant alleges wrongful termination and unpaid wages for the month of September.

ARGUMENTS:
The Defendant argues that the termination was for cause due to performance issues.
The Claimant argues that Article 47 of the UAE Labor Law was violated.

REASONING:
The Court has examined the evidence. According to Article 132, the gratuity must be calculated based on the last salary.
The termination appears to lack sufficient evidence of 'cause' under DIFC Employment Law.

CONCLUSION:
The Court orders the Defendant to pay 50,000 AED in compensation.
"""

async def test_units():
    print("--- Testing LegalStructureParser ---")
    parser = LegalStructureParser()
    structured = await parser.parse(SAMPLE_TEXT)
    print(f"Metadata: {structured.get('case_metadata')}")
    print(f"Citations: {structured.get('citations')}")
    print(f"Reasoning snippet: {structured.get('reasoning')[:50]}...")
    
    print("\n--- Testing HybridChunker ---")
    chunks = hybrid_chunk_legal_doc(structured, "judgment")
    print(f"Total chunks created: {len(chunks)}")
    for i, c in enumerate(chunks[:3]):
        print(f"Chunk {i} [{c['metadata']['section_type']}]: {c['text'][:100]}...")

if __name__ == "__main__":
    asyncio.run(test_units())
