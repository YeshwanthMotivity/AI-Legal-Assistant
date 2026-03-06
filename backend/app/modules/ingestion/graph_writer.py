import asyncio
from neo4j import GraphDatabase
from app.config import settings


def _node_id(prefix: str, value: str) -> str:
    return f"{prefix}:{value.strip().lower()}"


async def write_to_graph(case_id: str, document_id: str, entities: list[dict]) -> None:
    loop = asyncio.get_event_loop()

    def _write() -> None:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        employee_name = None
        employer_name = None
        for entity in entities:
            if entity.get("entity_type") == "employee_name" and entity.get("entity_value"):
                employee_name = entity["entity_value"]
            if entity.get("entity_type") == "employer_name" and entity.get("entity_value"):
                employer_name = entity["entity_value"]

        with driver.session() as session:
            session.run("MERGE (c:Case {case_id: $case_id})", case_id=case_id)
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

            if employee_name and employer_name:
                session.run(
                    "MATCH (employee:Person {person_id: $employee_person_id}), "
                    "(company:Company {company_id: $company_id}) "
                    "MERGE (employee)-[:EMPLOYED_BY]->(company)",
                    employee_person_id=_node_id("employee", employee_name),
                    company_id=_node_id("company", employer_name),
                )

        driver.close()

    await loop.run_in_executor(None, _write)
