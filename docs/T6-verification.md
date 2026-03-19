I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim.

---
The context section for each comment explains the problem and its significance. The fix section defines the scope of changes to make — implement only what the fix describes.

## Comment 1: LangGraph orchestration is still stubbed and never executes real Search, Graph, Calculation, Reasoning, Explainability, or draft-storage agents.

### Context
The user-visible impact is that `POST /cases/{id}/analyze` can report success while producing synthetic, non-grounded outputs, which violates the ticket’s core objective and acceptance criteria. In `backend/app/modules/orchestrator/graph.py`, all nodes return placeholder passthrough/default values; there is no invocation of `SearchService`, `GraphQueryService`, entitlement calculations, JAIS/fallback model calls, explainability composition from retrieved evidence, or MinIO draft upload. This means the execution does not deliver the required end-to-end AI analysis pipeline.

### Fix

Replace placeholder node implementations in `backend/app/modules/orchestrator/graph.py` with real orchestration nodes (or move them into a dedicated `nodes.py` and import them). Implement: extracted-entity fetch from PostgreSQL, parallel search/graph/calculation execution, context merge/deduplication, JAIS primary with fallback model behavior, explainability construction, and draft upload to `judgment-drafts`. Ensure the final graph output includes the required structured schema fields, including `model_used`.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\orchestrator\graph.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\orchestrator\services.py
---
## Comment 2: Background task execution reuses a request-scoped AsyncSession, risking closed-session failures and unstable orchestration writes after response return.

### Context
This can cause analysis jobs to fail intermittently or silently when the background task runs outside the request lifecycle. `CaseService` stores the DI session (`get_db`) and enqueues `self.orchestrator_service.run_analysis`; however `get_db` finalizes by committing/closing the session after the request. The background task then attempts DB operations through `OrchestratorService` with that stale session. This is a correctness and reliability issue for the main analyze flow.

### Fix

Decouple background execution from request-scoped DB sessions. In `backend/app/modules/case/services.py`, enqueue a task function that opens its own session via `AsyncSessionLocal` for the entire orchestration run. Refactor `OrchestratorService` to be created inside that background task with the fresh session. Avoid storing request-bound session objects for deferred execution.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\services.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\database.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\orchestrator\services.py
---