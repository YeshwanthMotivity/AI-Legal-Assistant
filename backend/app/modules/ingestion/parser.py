import json
import logging
import re
from typing import Dict, Any, List, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class LegalStructureParser:
    """
    Parses raw legal text into structured sections (Facts, Arguments, Reasoning, Conclusion)
    and extracts legal citations using the JAIS LLM.
    """

    SYSTEM_PROMPT = (
        "You are an expert legal document parser specialized in UAE Labor Law. "
        "Your task is to take raw text from a court judgment or law and convert it into a structured JSON format. "
        "Identify and extract the following sections: "
        "- 'case_metadata': { 'case_number', 'court_name', 'judgment_date' } "
        "- 'facts': The background and facts of the case. "
        "- 'arguments': The claims made by the parties. "
        "- 'reasoning': The legal reasoning and analysis by the court. "
        "- 'conclusion': The final decision or order. "
        "- 'citations': A list of law articles (e.g., 'Article 47') or case references cited in the text. "
        "\nReturn ONLY valid JSON. If a section is not found, return an empty string for it."
    )

    def __init__(self, timeout: float = 2.0):
        self.url = f"{settings.jais_url}/v1/chat/completions"
        self.timeout = timeout

    async def parse(self, text: str) -> Dict[str, Any]:
        """
        Calls JAIS to parse the text. Extracts a prefix of the text for metadata/structure 
        and allows for iterative parsing if necessary (though here we focus on the core structure).
        """
        try:
            # We send the first 6000 characters to get the overall structure and metadata
            # For extremely large docs, this might need refinement, but it's a good baseline.
            input_text = text[:8000] 
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.url,
                    json={
                        "model": "jais",
                        "messages": [
                            {"role": "system", "content": self.SYSTEM_PROMPT},
                            {"role": "user", "content": f"Parse the following legal text:\n\n{input_text}"}
                        ],
                        "temperature": 0.0
                    }
                )
                response.raise_for_status()
                data = response.json()
                
            content = data["choices"][0]["message"]["content"]
            
            # Clean up markdown fences if present
            content = re.sub(r"```json\s*", "", content)
            content = re.sub(r"\s*```", "", content)
            
            structured_data = json.loads(content.strip())
            
            # Ensure all keys exist
            defaults = {
                "case_metadata": {"case_number": "", "court_name": "", "judgment_date": ""},
                "facts": "",
                "arguments": "",
                "reasoning": "",
                "conclusion": "",
                "citations": []
            }
            for key, val in defaults.items():
                if key not in structured_data:
                    structured_data[key] = val
                    
            return structured_data

        except Exception as e:
            logger.error(f"LegalStructureParser failed: {e}")
            # Fallback to empty structure
            return {
                "case_metadata": {"case_number": "", "court_name": "", "judgment_date": ""},
                "facts": text,  # Use full text for fallback chunking
                "arguments": "",
                "reasoning": "",
                "conclusion": "",
                "citations": []
            }

    @staticmethod
    def extract_article_citations(text: str) -> List[str]:
        """
        Regex-based fallback or helper for extracting Article citations.
        """
        pattern = r"(?:Article|Art\.?|المادة)\s*(\d+)"
        matches = re.findall(pattern, text, re.IGNORECASE)
        return [f"Article {m}" for m in matches]
