from unittest.mock import AsyncMock, MagicMock

import pytest

from app.modules.audit.service import AuditService


@pytest.mark.asyncio
async def test_audit_service_writes_extra_metadata() -> None:
    session = MagicMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    service = AuditService(session)

    payload = {"source": "unit-test", "field": "value"}
    await service.log(
        user_id="user-1",
        action="create_case",
        resource_type="case",
        resource_id="case-1",
        metadata=payload,
    )

    # Ensure ORM object was added and mapped metadata field is used.
    assert session.add.call_count == 1
    audit_log = session.add.call_args.args[0]
    assert getattr(audit_log, "extra_metadata") == payload
    assert not hasattr(audit_log, "metadata") or getattr(audit_log, "metadata", None) != payload
    session.flush.assert_awaited_once()
