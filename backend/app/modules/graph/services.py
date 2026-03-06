import asyncio
import logging
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.modules.evaluation.repository import EvaluationEventRepository
from app.modules.graph.schemas import (
    GraphQueryIntent,
    GraphQueryResponse,
    LawArticleResult,
    RelatedCaseResult,
)

logger = logging.getLogger(__name__)


class GraphQueryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.evaluation_repository = EvaluationEventRepository(db)

    async def query(
        self, case_id: str, intent: GraphQueryIntent
    ) -> GraphQueryResponse:
        """
        Query the Neo4j graph for case relationships.
        
        Args:
            case_id: The case ID to query
            intent: The type of query (find_relevant_laws, find_related_cases, find_similar_companies)
        
        Returns:
            GraphQueryResponse with law articles, related cases, and confidence score
        """
        loop = asyncio.get_event_loop()

        def _query():
            try:
                driver = GraphDatabase.driver(
                    settings.neo4j_uri,
                    auth=(settings.neo4j_user, settings.neo4j_password),
                )

                law_articles: list[LawArticleResult] = []
                related_cases: list[RelatedCaseResult] = []
                graph_confidence = 0.0

                with driver.session() as session:
                    if intent == GraphQueryIntent.FIND_RELEVANT_LAWS:
                        # Direct CITES query
                        result = session.run(
                            """
                            MATCH (c:Case {case_id: $case_id})-[:CITES]->(l:LawArticle)
                            RETURN l.article_id AS article_id, l.article_number AS article_number,
                                   l.title AS title, l.full_text AS full_text
                            """,
                            case_id=case_id,
                        )
                        records = list(result)
                        
                        if records:
                            graph_confidence = 1.0
                            for record in records:
                                law_articles.append(LawArticleResult(
                                    article_id=record["article_id"],
                                    article_number=record["article_number"],
                                    title=record["title"],
                                    full_text=record["full_text"],
                                ))
                        else:
                            # Fallback: query law articles from similar cases
                            result = session.run(
                                """
                                MATCH (c:Case {case_id: $case_id})-[:SIMILAR_TO]->(s:Case)-[:CITES]->(l:LawArticle)
                                RETURN DISTINCT l.article_id AS article_id, l.article_number AS article_number, 
                                       l.title AS title, l.full_text AS full_text
                                LIMIT 10
                                """,
                                case_id=case_id,
                            )
                            records = list(result)
                            if records:
                                graph_confidence = 0.5
                                for record in records:
                                    law_articles.append(LawArticleResult(
                                        article_id=record["article_id"],
                                        article_number=record["article_number"],
                                        title=record["title"],
                                        full_text=record["full_text"],
                                    ))

                    elif intent == GraphQueryIntent.FIND_RELATED_CASES:
                        result = session.run(
                            """
                            MATCH (c:Case {case_id: $case_id})-[:SIMILAR_TO]->(s:Case)
                            RETURN s.case_id AS case_id, s.title AS title,
                                   s.case_type AS case_type, s.outcome AS outcome
                            LIMIT 10
                            """,
                            case_id=case_id,
                        )
                        records = list(result)
                        if records:
                            graph_confidence = 1.0
                            for record in records:
                                related_cases.append(RelatedCaseResult(
                                    case_id=record["case_id"],
                                    title=record["title"],
                                    case_type=record["case_type"],
                                    outcome=record["outcome"],
                                ))

                    elif intent == GraphQueryIntent.FIND_SIMILAR_COMPANIES:
                        result = session.run(
                            """
                            MATCH (c:Case {case_id: $case_id})<-[:IS_RESPONDENT_IN]-(p:Person)-[:EMPLOYED_BY]->(co:Company)
                                  <-[:EMPLOYED_BY]-(p2:Person)-[:IS_RESPONDENT_IN]->(c2:Case)
                            WHERE c2.case_id <> $case_id
                            RETURN DISTINCT c2.case_id AS case_id, c2.title AS title,
                                   c2.case_type AS case_type, c2.outcome AS outcome
                            LIMIT 10
                            """,
                            case_id=case_id,
                        )
                        records = list(result)
                        if records:
                            graph_confidence = 1.0
                            for record in records:
                                related_cases.append(RelatedCaseResult(
                                    case_id=record["case_id"],
                                    title=record["title"],
                                    case_type=record["case_type"],
                                    outcome=record["outcome"],
                                ))

                driver.close()
                return law_articles, related_cases, graph_confidence

            except (ServiceUnavailable, Exception) as e:
                logger.warning(f"Neo4j query failed: {e}")
                return [], [], 0.0

        try:
            law_articles, related_cases, graph_confidence = await loop.run_in_executor(
                None, _query
            )
        except Exception as e:
            logger.warning(f"Graph query execution failed: {e}")
            law_articles = []
            related_cases = []
            graph_confidence = 0.0

        # Emit evaluation event for graph confidence
        try:
            run_id = f"graph_query_{case_id}"
            await self.evaluation_repository.create_graph_event(
                run_id=run_id,
                case_id=case_id,
                metric_type="graph_confidence",
                value=graph_confidence,
            )
            await self.db.commit()
        except Exception as e:
            logger.warning(f"Graph KPI persistence failed: {e}")

        return GraphQueryResponse(
            case_id=case_id,
            intent=intent.value,
            law_articles=law_articles,
            related_cases=related_cases,
            graph_confidence=graph_confidence,
        )

