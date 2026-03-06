import re


def _first_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    return match.group(1).strip() if match else None


async def extract_entities(text: str) -> list[dict]:
    entities: list[dict] = []

    employee = _first_match(r"(?:Employee|Claimant)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{2,})", text)
    employer = _first_match(r"(?:Employer|Company|Respondent)\s*[:\-]\s*([A-Za-z0-9][A-Za-z0-9 .,&'-]{2,})", text)
    salary = _first_match(r"(?:Salary|Monthly Salary)\s*[:\-]\s*([A-Z]{0,3}\s?[\d,]+(?:\.\d{1,2})?)", text)
    start = _first_match(r"(?:Employment Start|Start Date|Date of Joining)\s*[:\-]\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", text)
    end = _first_match(r"(?:Employment End|End Date|Last Working Day)\s*[:\-]\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", text)
    reason = _first_match(r"(?:Termination Reason|Reason for Termination)\s*[:\-]\s*(.+)", text)

    if employee:
        entities.append({"entity_type": "employee_name", "entity_value": employee, "confidence_score": 0.78})
    if employer:
        entities.append({"entity_type": "employer_name", "entity_value": employer, "confidence_score": 0.78})
    if salary:
        entities.append({"entity_type": "salary", "entity_value": salary, "confidence_score": 0.82})
    if start:
        entities.append({"entity_type": "employment_start", "entity_value": start, "confidence_score": 0.74})
    if end:
        entities.append({"entity_type": "employment_end", "entity_value": end, "confidence_score": 0.74})
    if reason:
        entities.append({"entity_type": "termination_reason", "entity_value": reason, "confidence_score": 0.7})

    return entities
