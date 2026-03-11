from langgraph.graph import END, START, StateGraph

from app.modules.orchestrator.nodes import (
    calculation_agent_node,
    context_builder_node,
    document_agent_node,
    explainability_builder_node,
    graph_agent_node,
    judgment_drafting_agent_node,
    reasoning_agent_node,
    search_agent_node,
    precedent_search_node,
    law_search_node,
)
from app.modules.orchestrator.state import AnalysisState


graph = StateGraph(AnalysisState)
graph.add_node("document_agent_node", document_agent_node)
graph.add_node("search_agent_node", search_agent_node)
graph.add_node("precedent_search_node", precedent_search_node)
graph.add_node("law_search_node", law_search_node)
graph.add_node("graph_agent_node", graph_agent_node)
graph.add_node("calculation_agent_node", calculation_agent_node)
graph.add_node("context_builder_node", context_builder_node)
graph.add_node("reasoning_agent_node", reasoning_agent_node)
graph.add_node("explainability_builder_node", explainability_builder_node)
graph.add_node("judgment_drafting_agent_node", judgment_drafting_agent_node)

graph.add_edge(START, "document_agent_node")

# Parallel Search Phase
graph.add_edge("document_agent_node", "search_agent_node")
graph.add_edge("document_agent_node", "precedent_search_node")
graph.add_edge("document_agent_node", "law_search_node")
graph.add_edge("document_agent_node", "calculation_agent_node")

# Dependencies
graph.add_edge("search_agent_node", "graph_agent_node")
graph.add_edge("graph_agent_node", "context_builder_node")
graph.add_edge("precedent_search_node", "context_builder_node")
graph.add_edge("law_search_node", "context_builder_node")
graph.add_edge("calculation_agent_node", "context_builder_node")

graph.add_edge("context_builder_node", "reasoning_agent_node")
graph.add_edge("reasoning_agent_node", "explainability_builder_node")
graph.add_edge("explainability_builder_node", "judgment_drafting_agent_node")
graph.add_edge("judgment_drafting_agent_node", END)

orchestrator_graph = graph.compile()
