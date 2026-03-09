import pytest

# Ensure all SQLAlchemy models are registered before any test runs
# This prevents sqlalchemy.orm.exc.UnmappedClassError during test isolation
# when relationships (e.g., relationship("Case")) are resolved.
from app.modules.user import models as user_models
from app.modules.case import models as case_models
from app.modules.document import models as document_models
from app.modules.evaluation import models as evaluation_models
from app.modules.audit import models as audit_models
