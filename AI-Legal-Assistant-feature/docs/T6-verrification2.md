I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim.

---
The context section for each comment explains the problem and its significance. The fix section defines the scope of changes to make — implement only what the fix describes.

## Comment 1: `GET /cases/{id}/analysis` does not return the required structured reasoning payload from orchestrator output.

### Context
Consumers expect fields like `outcome`, `reasoning`, `cited_laws`, `cited_cases`, `confidence`, `model_used`, and explainability tied to actual AI execution. Current flow in `CaseService.get_case_analysis` reads mostly empty judgment columns and hardcodes `model_used="orchestrator-v1"`, while `run_analysis` only persists draft/confidence. This breaks API-contract expectations from the ticket and causes incomplete analysis responses even when analysis is marked complete.

### Fix

Persist the full structured analysis result from orchestration (including model provenance and explainability) and return that persisted payload in `get_case_analysis`. Update `backend/app/modules/orchestrator/services.py` to save all required fields, and update `backend/app/modules/case/services.py` to map those persisted fields directly to `CaseAnalysisDetail` without hardcoded placeholders.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\services.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\orchestrator\services.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\evaluation\judgment_repository.py
---
## Comment 2: The required `reasoning_unavailable` partial-analysis path is unreachable with current status model and orchestration transitions.

### Context
When both primary and fallback reasoning fail, the ticket requires partial analysis plus a retry-oriented status path. Current implementation never sets such a status: `CaseStatus` lacks `reasoning_unavailable`, and `run_analysis` always moves to `ANALYSIS_COMPLETE`. Although `get_case_analysis` checks for `reasoning_unavailable`, that branch cannot be entered from the implemented state transitions. This creates a functional gap in failure handling and polling semantics.

### Fix

Add an explicit failure/partial-analysis status to `CaseStatus` (or equivalent persisted analysis state), set it in `OrchestratorService.run_analysis` when reasoning is unavailable, and return partial context with that status in `get_case_analysis`. Ensure the transition logic in `backend/app/modules/orchestrator/services.py` and `backend/app/modules/case/services.py` is consistent with the ticket’s failure-mode contract.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\models.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\services.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\orchestrator\services.py
---