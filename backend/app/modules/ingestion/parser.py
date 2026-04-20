"""
parser.py — Fixed version
Changes from original:
  - timeout changed from 2.0 → 120.0 seconds (LLM needs time to respond)
  - Added regex-based fallback parser so structure is never completely empty
  - Improved JSON extraction to handle partial responses
"""

import json
import logging
import re
from typing import Dict, Any, List

import httpx
from app.config import settings

logger = logging.getLogger(__name__)


def _regex_parse(text: str) -> Dict[str, Any]:
    """
    Regex-based structural parser as fallback when LLM is unavailable.
    Splits text into sections based on common legal document patterns.
    Works for both English and Arabic DIFC documents.
    """
    result = {
        "case_metadata": {"case_number": "", "court_name": "", "judgment_date": ""},
        "facts": "",
        "arguments": "",
        "reasoning": "",
        "conclusion": "",
        "citations": []
    }

    # Extract case number
    case_num = re.search(
        r'(?:Claim No|Case No|CFI|SCT|CA)[.\s:]*([A-Z0-9/\-]+)',
        text, re.IGNORECASE
    )
    if case_num:
        result["case_metadata"]["case_number"] = case_num.group(1).strip()

    # Extract court name
    if "DIFC" in text.upper():
        result["case_metadata"]["court_name"] = "Dubai International Financial Centre Courts"

    # Extract date
    date_match = re.search(
        r'(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|'
        r'September|October|November|December)\s+\d{4})',
        text, re.IGNORECASE
    )
    if date_match:
        result["case_metadata"]["judgment_date"] = date_match.group(1)

    # Extract citations (Article references)
    citations = re.findall(
        r'(?:Article|Art\.?|المادة)\s*(\d+(?:\(\d+\))?)',
        text, re.IGNORECASE
    )
    result["citations"] = list(set(f"Article {c}" for c in citations))

    # Split text into rough sections
    # For English docs
    sections_en = {
        "facts": r'(?:BACKGROUND|FACTS?|THE CLAIM|Background)\s*\n',
        "arguments": r'(?:SUBMISSIONS?|ARGUMENTS?|THE PARTIES|PLEADINGS?)\s*\n',
        "reasoning": r'(?:REASONING|ANALYSIS|DISCUSSION|JUDGMENT|IMMEDIATE JUDGMENT)\s*\n',
        "conclusion": r'(?:CONCLUSION|DECISION|ORDER|IT IS HEREBY ORDERED)\s*\n',
    }

    # Try to find sections
    text_lower = text.lower()
    section_positions = {}
    for section, pattern in sections_en.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            section_positions[section] = match.start()

    if section_positions:
        sorted_sections = sorted(section_positions.items(), key=lambda x: x[1])
        for i, (section, start_pos) in enumerate(sorted_sections):
            match = re.search(list(sections_en.values())[
                list(sections_en.keys()).index(section)
            ], text, re.IGNORECASE)
            if match:
                content_start = match.end()
                if i + 1 < len(sorted_sections):
                    content_end = sorted_sections[i + 1][1]
                else:
                    content_end = len(text)
                result[section] = text[content_start:content_end].strip()

    # If no sections found, put everything in facts for chunking
    if not any([result["facts"], result["arguments"],
                result["reasoning"], result["conclusion"]]):
        result["facts"] = text

    return result


class LegalStructureParser:
    """
    Parses raw legal text into structured sections using the JAIS LLM.
    Falls back to regex parsing if LLM is unavailable or times out.
    """

    SYSTEM_PROMPT = (
        "You are an expert legal document parser specialized in UAE Labor Law. "
        "Your task is to take raw text from a court judgment or law and convert it "
        "into a structured JSON format. "
        "Identify and extract the following sections: "
        "- 'case_metadata': { 'case_number', 'court_name', 'judgment_date' } "
        "- 'facts': The background and facts of the case. "
        "- 'arguments': The claims made by the parties. "
        "- 'reasoning': The legal reasoning and analysis by the court. "
        "- 'conclusion': The final decision or order. "
        "- 'citations': A list of law articles (e.g., 'Article 47') or case "
        "references cited in the text. "
        "\nReturn ONLY valid JSON. If a section is not found, return an empty "
        "string for it."
    )

    def __init__(self, timeout: float = 120.0):
        self.timeout = timeout

    async def _call_ollama(self, system: str, user: str, token_limit: int = 512, response_format: str = "json") -> str:
        """Generic Ollama /api/generate caller for parsing tasks."""
        payload = {
            "model": settings.ollama_model_fallback,
            "prompt": f"System: {system}\n\nUser Context: {user}\n\nAssistant Response:",
            "stream": False,
            "keep_alive": 0,
            "options": {
                "num_ctx": 4096,
                "temperature": 0.1,
                "num_predict": token_limit
            },
        }
        if response_format == "json":
            payload["format"] = "json"
            
        async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
            try:
                resp = await client.post(f"{settings.ollama_url}/api/generate", json=payload)
                if resp.status_code != 200:
                    logger.error(f"Ollama API Error {resp.status_code}: {resp.text}")
                    return ""
                
                data = resp.json()
                return str(data.get("response", "")).strip()
            except Exception as e:
                logger.error(f"Ollama call failed: {e}")
                return ""

    async def parse(self, text: str) -> Dict[str, Any]:
        """
        Calls Gemini LLM to parse the text into structured sections.
        Falls back to regex parser if LLM fails or times out.
        """
        defaults = {
            "case_metadata": {
                "case_number": "", "court_name": "", "judgment_date": ""
            },
            "facts": "",
            "arguments": "",
            "reasoning": "",
            "conclusion": "",
            "citations": []
        }

        try:
            content = await self._call_ollama(
                system=self.SYSTEM_PROMPT,
                user=f"Parse the following legal text:\n\n{text[:8000]}",
                token_limit=2000,
                response_format="json"
            )
            
            if not content:
                raise ValueError("Local Ollama service returned empty content")
                
            logger.info("Local Ollama legal parser successful")
            structured_data = json.loads(content.strip())

            # Ensure all keys exist
            for key, val in defaults.items():
                if key not in structured_data:
                    structured_data[key] = val

            logger.info("LLM parser succeeded")
            return structured_data

        except httpx.TimeoutException:
            logger.warning(
                f"LLM parser timed out after {self.timeout}s, "
                f"using regex fallback"
            )
        except Exception as e:
            logger.warning(f"LLM parser failed: {e}, using regex fallback")

        # Regex fallback — always produces usable output
        logger.info("Using regex-based structural parser as fallback")
        return _regex_parse(text)

    @staticmethod
    def split_law_into_articles(text: str) -> List[Dict[str, str]]:
        """
        Robustly splits a law document into individual articles using regex.
        Captures 100% of the text between article markers.
        """
        # Supports: Article 1, Article (1), المادة 1, المادة (1)
        pattern = r"(?i)(?:\n|^)\s*(?:Article|Art\.?|المادة)\s*\(?(\d+)\)?"
        
        matches = list(re.finditer(pattern, text))
        if not matches:
            return []

        articles = []
        for i in range(len(matches)):
            start_pos = matches[i].start()
            # Content starts after the article marker
            content_start = matches[i].end()
            
            # End position is the start of the next article marker or end of text
            end_pos = matches[i+1].start() if i + 1 < len(matches) else len(text)
            
            article_num = matches[i].group(1)
            # Full text includes the "Article X" header + the content
            article_full_text = text[start_pos:end_pos].strip()
            
            articles.append({
                "article_number": article_num,
                "text": article_full_text,
                "title": f"Article {article_num}"
            })
            
        return articles

    @staticmethod
    def extract_article_citations(text: str) -> List[str]:
        """Regex helper for extracting Article citations."""
        pattern = r"(?:Article|Art\.?|المادة)\s*(\d+)"
        matches = re.findall(pattern, text, re.IGNORECASE)
        return [f"Article {m}" for m in matches]
