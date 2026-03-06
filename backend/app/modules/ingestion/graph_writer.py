import asyncio
import logging
from neo4j import GraphDatabase
from app.config import settings

logger = logging.getLogger(__name__)


def _node_id(prefix: str, value: str) -> str:
    return f"{prefix}:{value.strip().lower()}"


async def write_to_graph(
    case_id: str,
    document_id: str,
    entities: list[dict],
    case_title: str = "",
    case_type: str = "",
    outcome: str = "",
) -> None:
    loop = asyncio.get_event_loop()

    def _write() -> None:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        employee_name = None
        employer_name = None
        law_articles = []
        
        for entity in entities:
            if entity.get("entity_type") == "employee_name" and entity.get("entity_value"):
                employee_name = entity["entity_value"]
            if entity.get("entity_type") == "employer_name" and entity.get("entity_value"):
                employer_name = entity["entity_value"]
            if entity.get("entity_type") == "law_article_number" and entity.get("entity_value"):
                law_articles.append(entity["entity_value"])

        with driver.session() as session:
            # Merge Case node with metadata
            session.run(
                "MERGE (c:Case {case_id: $case_id}) "
                "SET c.title = $title, c.case_type = $case_type, c.outcome = $outcome",
                case_id=case_id,
                title=case_title,
                case_type=case_type,
                outcome=outcome,
            )
            session.run(
                "MERGE (e:Evidence {evidence_id: $evidence_id}) "
                "SET e.document_id = $document_id",
                evidence_id=document_id,
                document_id=document_id,
            )
            session.run(
                "MATCH (c:Case {case_id: $case_id}), (e:Evidence {evidence_id: $evidence_id}) "
                "MERGE (c)-[:HAS_EVIDENCE]->(e)",
                case_id=case_id,
                evidence_id=document_id,
            )

            if employee_name:
                session.run(
                    "MERGE (p:Person {person_id: $person_id}) "
                    "SET p.name = $name",
                    person_id=_node_id("employee", employee_name),
                    name=employee_name,
                )
                session.run(
                    "MATCH (p:Person {person_id: $person_id}), (c:Case {case_id: $case_id}) "
                    "MERGE (p)-[:IS_CLAIMANT_IN]->(c)",
                    person_id=_node_id("employee", employee_name),
                    case_id=case_id,
                )

            if employer_name:
                session.run(
                    "MERGE (company:Company {company_id: $company_id}) "
                    "SET company.name = $name",
                    company_id=_node_id("company", employer_name),
                    name=employer_name,
                )
                session.run(
                    "MERGE (p:Person {person_id: $person_id}) "
                    "SET p.name = $name",
                    person_id=_node_id("employer", employer_name),
                    name=employer_name,
                )
                session.run(
                    "MATCH (p:Person {person_id: $person_id}), (c:Case {case_id: $case_id}) "
                    "MERGE (p)-[:IS_RESPONDENT_IN]->(c)",
                    person_id=_node_id("employer", employer_name),
                    case_id=case_id,
                )
                # Connect employer Person to Company (respondent works for the company)
                session.run(
                    "MATCH (p:Person {person_id: $employer_person_id}), "
                    "(company:Company {company_id: $company_id}) "
                    "MERGE (p)-[:EMPLOYED_BY]->(company)",
                    employer_person_id=_node_id("employer", employer_name),
                    company_id=_node_id("company", employer_name),
                )

            if employee_name and employer_name:
                session.run(
                    "MATCH (employee:Person {person_id: $employee_person_id}), "
                    "(company:Company {company_id: $company_id}) "
                    "MERGE (employee)-[:EMPLOYED_BY]->(company)",
                    employee_person_id=_node_id("employee", employee_name),
                    company_id=_node_id("company", employer_name),
                )

            # Wire CITES relationships for law articles
            for article_number in law_articles:
                session.run(
                    """
                    MATCH (c:Case {case_id: $case_id}), (l:LawArticle {article_number: $article_number})
                    MERGE (c)-[:CITES]->(l)
                    MERGE (l)-[:CITED_BY]->(c)
                    """,
                    case_id=case_id,
                    article_number=article_number,
                )

        driver.close()

    await loop.run_in_executor(None, _write)


async def write_similarity_edges(case_id: str, similar_case_ids: list[str]) -> None:
    """
    Write SIMILAR_TO relationships between cases.
    
    Args:
        case_id: The source case ID
        similar_case_ids: List of similar case IDs to connect
    """
    if not similar_case_ids:
        return
        
    loop = asyncio.get_event_loop()

    def _write_edges() -> None:
        try:
            driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password),
            )

            with driver.session() as session:
                for similar_case_id in similar_case_ids:
                    session.run(
                        """
                        MATCH (a:Case {case_id: $case_id}), (b:Case {case_id: $similar_case_id})
                        MERGE (a)-[:SIMILAR_TO]->(b)
                        MERGE (b)-[:SIMILAR_TO]->(a)
                        """,
                        case_id=case_id,
                        similar_case_id=similar_case_id,
                    )

            driver.close()
        except Exception as e:
            # Log but don't raise - Neo4j unavailability should not break the flow
            logger.warning(f"Failed to write similarity edges: {e}")

    await loop.run_in_executor(None, _write_edges)
