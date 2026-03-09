"""
UAE Labour Law benchmark query set.

Each entry is a dict with:
  - query_text: the natural-language query issued against the vector store
  - relevant_doc_ids: list of document IDs known to be relevant (ground truth)

This is an MVP hand-labeled set.  Expand post-MVP with full annotation.
"""

BENCHMARK_QUERIES: list[dict] = [
    {
        "query_text": "What is the minimum notice period for terminating an unlimited contract?",
        "relevant_doc_ids": ["uae-labour-law-art-117", "uae-labour-law-art-118"],
    },
    {
        "query_text": "End-of-service gratuity calculation for an employee with 10 years of service",
        "relevant_doc_ids": ["uae-labour-law-art-132", "uae-labour-law-art-134"],
    },
    {
        "query_text": "Rules on annual leave entitlement for employees completing one year",
        "relevant_doc_ids": ["uae-labour-law-art-75", "uae-labour-law-art-76"],
    },
    {
        "query_text": "What constitutes arbitrary dismissal under UAE labour law?",
        "relevant_doc_ids": ["uae-labour-law-art-122", "uae-labour-law-art-123"],
    },
    {
        "query_text": "Employer obligation to pay overtime for work beyond 8 hours",
        "relevant_doc_ids": ["uae-labour-law-art-67", "uae-labour-law-art-68"],
    },
    {
        "query_text": "Compensation due to an employee for wrongful termination",
        "relevant_doc_ids": ["uae-labour-law-art-123", "uae-labour-law-art-125"],
    },
    {
        "query_text": "Provisions for sick leave pay and duration",
        "relevant_doc_ids": ["uae-labour-law-art-82", "uae-labour-law-art-83"],
    },
    {
        "query_text": "Maternity leave rights and pay under Federal Law No. 33 of 2021",
        "relevant_doc_ids": ["uae-labour-law-art-30"],
    },
    {
        "query_text": "Non-compete clause enforceability after contract termination",
        "relevant_doc_ids": ["uae-labour-law-art-10"],
    },
    {
        "query_text": "Definition of basic wage vs total wage for gratuity purposes",
        "relevant_doc_ids": ["uae-labour-law-art-1"],
    },
    {
        "query_text": "Rules governing probation period maximum duration",
        "relevant_doc_ids": ["uae-labour-law-art-9"],
    },
    {
        "query_text": "Repatriation ticket obligation upon contract termination",
        "relevant_doc_ids": ["uae-labour-law-art-131"],
    },
    {
        "query_text": "Public holidays and their compensation in UAE",
        "relevant_doc_ids": ["uae-labour-law-art-73", "uae-labour-law-art-74"],
    },
    {
        "query_text": "When can an employer deduct from employee wages",
        "relevant_doc_ids": ["uae-labour-law-art-60", "uae-labour-law-art-61"],
    },
    {
        "query_text": "Employee rights when employer transfers establishment ownership",
        "relevant_doc_ids": ["uae-labour-law-art-129"],
    },
    {
        "query_text": "Maximum working hours in Ramadan for Muslim employees",
        "relevant_doc_ids": ["uae-labour-law-art-65"],
    },
    {
        "query_text": "Grounds for immediate dismissal without notice under UAE law",
        "relevant_doc_ids": ["uae-labour-law-art-120"],
    },
    {
        "query_text": "Statute of limitations on labour claims in UAE",
        "relevant_doc_ids": ["uae-labour-law-art-6"],
    },
    {
        "query_text": "Penalty for employer failing to pay wages on time",
        "relevant_doc_ids": ["uae-labour-law-art-60"],
    },
    {
        "query_text": "Rights and protections for part-time employees",
        "relevant_doc_ids": ["uae-labour-law-art-8"],
    },
]
