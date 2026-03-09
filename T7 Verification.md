I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim.

---
The context section for each comment explains the problem and its significance. The fix section defines the scope of changes to make — implement only what the fix describes.

## Comment 1: `POST /cases` schema/repository still omit `hearing_date`, breaking the ticket-defined case creation API contract.

### Context
The ticket scope explicitly includes `hearing_date` in case creation inputs. However, `CaseCreate` does not expose `hearing_date`, and `CaseRepository.create` does not persist it. Clients implementing against the T7 contract cannot submit this field and must perform follow-up PATCH calls, which is a contract mismatch and integration friction for frontend/API consumers.

### Fix

Add `hearing_date` to `CaseCreate` in `backend/app/modules/case/schemas.py` and persist it in `CaseRepository.create` within `backend/app/modules/case/repository.py`. Verify `CaseResponse` includes the persisted value and update OpenAPI examples/docs accordingly.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\schemas.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\repository.py
---
## Comment 2: Case status values remain non-spec names, so lifecycle API outputs do not match the agreed state machine.

### Context
Core Flows defines lifecycle states `Created → DocumentsUploaded → AIAnalysisPending → AIAnalysisReady → DraftGenerated → Finalized`, but `CaseStatus` still returns values like `pending`, `under_review`, and `analysis_complete`. This causes API contract drift for downstream consumers (frontend tabs, filters, analytics, and audit interpretation) expecting spec terminology.

### Fix

Align `CaseStatus` in `backend/app/modules/case/models.py` with spec lifecycle names and update transition logic in services/repositories to emit those values consistently. Add an Alembic migration to map existing persisted statuses to the new enum values so historical data remains queryable.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\models.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\services.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\repository.py
---
## Comment 3: Role-scoped case listing reports incorrect `total` for judge/clerk paths, breaking pagination semantics for API consumers.

### Context
In `CaseService.get_all_cases`, judge/clerk branches set `total = len(cases)`, which equals only the current page size after `skip/limit`, not full matching dataset size. Frontends relying on `total` for paginators will undercount records and truncate navigation. Admin path already uses a proper count query, so behavior is inconsistent by role.

### Fix

Implement dedicated count queries for judge and clerk scopes in `backend/app/modules/case/repository.py` and use them in `CaseService.get_all_cases` (`backend/app/modules/case/services.py`). Keep `total` as full result count independent of pagination window across all roles.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\services.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\repository.py
---
## Comment 4: Audit metadata is written to the wrong attribute, so structured metadata is not persisted as intended.

### Context
`AuditService.log` builds `AuditLog(metadata=...)`, but the mapped ORM attribute is `extra_metadata` (`Column(..., name="metadata")`) in `audit/models.py`. This mismatch means metadata payload handling is incorrect and undermines the ticket requirement to log action metadata reliably.

### Fix

In `backend/app/modules/audit/service.py`, write metadata to the mapped attribute `extra_metadata` instead of `metadata`. Ensure `AuditLogResponse` in `backend/app/modules/audit/schemas.py` serializes the same field consistently and add/adjust tests for metadata round-trip.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\audit\service.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\audit\models.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\audit\schemas.py
---
## Comment 5: Judge-only mutation endpoints still bypass case ownership checks, allowing unauthorized judges to operate on other judges’ cases.

### Context
This creates a direct authorization violation: any authenticated judge can trigger analysis, view analysis, draft, finalize, or submit feedback for an arbitrary case ID. In `case/routes.py`, several handlers call `service.get_case(case_id)` without user context. In `case/services.py`, ownership enforcement only runs when `user_role == 'judge'`, but these calls use default empty role/user values, so the check is skipped. This breaks the role-scoped access requirements in the ticket/spec.

### Fix

Update all judge workflow handlers in `backend/app/modules/case/routes.py` (`analyze_case`, `get_case_analysis`, `draft_judgment`, `create_judgment`, `submit_feedback`) to pass `current_user["sub"]` and `current_user["role"]` into `service.get_case(...)`. Keep the ownership check centralized in `CaseService.get_case` and remove any code path that calls it without identity context for judge-protected operations.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\routes.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\case\services.py
---
## Comment 6: Soft-deleted users can still log in, so deactivation does not actually revoke platform access.

### Context
`DELETE /admin/users/{id}` now marks users inactive, but authentication flow still accepts those accounts. `UserService.authenticate_user` only verifies username/password and never checks `is_active`; `UserRepository.get_by_username` also does not filter by active status. This violates the ticket’s deactivate-user expectation and creates a security hole where disabled users continue receiving valid JWTs.

### Fix

Enforce active-status checks in authentication paths. In `backend/app/modules/user/repository.py`, filter `get_by_username`/`get_by_email` to active users only (or add dedicated active-only methods). In `backend/app/modules/user/services.py`, explicitly reject inactive users before token creation. Ensure deactivated users cannot obtain new access or refresh tokens.

### Referred Files
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\user\repository.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\user\services.py
- c:\Users\Karthik\OneDrive - Motivity Labs\Desktop\Technical Presales\Cylix\AI-Judicial-Assistant-Platform\AI-Judicial-Assistant-Platform\backend\app\modules\user\routes.py
---