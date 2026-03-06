"""
UAE Labor Law Article Seeder

This module seeds the Neo4j database with UAE Labor Law articles at startup.
"""

import asyncio
import logging
from neo4j import GraphDatabase
from app.config import settings

logger = logging.getLogger(__name__)

# UAE Labor Law articles to seed
UAE_LABOR_LAW_ARTICLES = [
    {
        "article_id": "uae_labor:1",
        "article_number": "Article 1",
        "title": "Definitions and Scope",
        "full_text": "This Law regulates the employer-employee relationship in the UAE. An employee is any person employed to do any kind of manual, intellectual, or technical work for wages. An employer is any natural or legal person who employs workers.",
    },
    {
        "article_id": "uae_labor:36",
        "article_number": "Article 36",
        "title": "End of Service Gratuity",
        "full_text": "An employee who has completed one or more years of service shall be entitled to end of service gratuity upon termination of employment. The gratuity shall be calculated based on the basic wage for each year of service.",
    },
    {
        "article_id": "uae_labor:39",
        "article_number": "Article 39",
        "title": "Termination by Employer",
        "full_text": "The employer may terminate the employment contract for a valid reason related to the employee's conduct or performance. The employer must provide notice as per Article 84 and may be required to pay compensation.",
    },
    {
        "article_id": "uae_labor:40",
        "article_number": "Article 40",
        "title": "Arbitrary Dismissal",
        "full_text": "Arbitrary dismissal is prohibited. If the employer terminates the contract without notice or valid reason, the employee shall be entitled to compensation not exceeding three months' wages.",
    },
    {
        "article_id": "uae_labor:56",
        "article_number": "Article 56",
        "title": "Annual Leave Entitlement",
        "full_text": "An employee shall be entitled to an annual leave of not less than: 30 days if the employee has completed one year of service; 21 days if the employee has completed less than five years; 30 days if the employee has completed five years or more.",
    },
    {
        "article_id": "uae_labor:61",
        "article_number": "Article 61",
        "title": "Unpaid Wages — Penalties",
        "full_text": "If the employer fails to pay wages on time, they shall be liable to a penalty. The employee may also terminate the contract if wages are delayed for more than 60 days without valid reason.",
    },
    {
        "article_id": "uae_labor:84",
        "article_number": "Article 84",
        "title": "Notice Period",
        "full_text": "Either party to a contract of unlimited duration must give notice in writing of at least 30 days and not more than 90 days before terminating the contract. The notice period may be waived by mutual agreement.",
    },
    {
        "article_id": "uae_labor:121",
        "article_number": "Article 121",
        "title": "Compensation for Wrongful Termination",
        "full_text": "An employee whose contract is terminated wrongfully shall be entitled to compensation. The compensation shall be equivalent to the wages for the remaining period of the contract or three months' wages, whichever is less.",
    },
]


async def seed_law_articles() -> None:
    """
    Seed UAE Labor Law articles into Neo4j.
    
    This function runs at startup to ensure law articles are available
    for citation in case processing.
    """
    loop = asyncio.get_event_loop()

    def _seed() -> None:
        try:
            driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password),
            )

            with driver.session() as session:
                for article in UAE_LABOR_LAW_ARTICLES:
                    session.run(
                        """
                        MERGE (l:LawArticle {article_id: $article_id})
                        SET l.article_number = $article_number,
                            l.title = $title,
                            l.full_text = $full_text
                        """,
                        article_id=article["article_id"],
                        article_number=article["article_number"],
                        title=article["title"],
                        full_text=article["full_text"],
                    )
                    logger.info(f"Seeded law article: {article['article_number']} - {article['title']}")

            driver.close()
            logger.info("UAE Labor Law articles seeded successfully")
        except Exception as e:
            logger.warning(f"Law article seeding skipped: {e}")

    await loop.run_in_executor(None, _seed)

