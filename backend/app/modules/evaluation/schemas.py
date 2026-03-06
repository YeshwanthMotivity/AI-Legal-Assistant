from pydantic import BaseModel


class MetricsResponse(BaseModel):
    # Retrieval metrics
    precision_at_5: float
    recall_at_5: float
    mrr: float
    
    # Case similarity metrics
    top_5_accuracy: float
    avg_similarity_score: float
    
    # Graph query metrics
    graph_confidence: float
    
    # Document processing metrics
    entity_extraction_accuracy: float
    
    # AI reasoning metrics
    outcome_agreement: float
    judge_score: float
    
    # System performance
    search_latency: float
    ai_latency: float


class EvaluationBase(BaseModel):
    pass

