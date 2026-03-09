with open("app/modules/case/routes.py", "r") as f:
    content = f.read()

target = """@router.get("", response_model=CaseListResponse)
async def get_cases(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    \"\"\"Get all cases.\"\"\"
    return await service.get_all_cases(skip, limit, status)"""

repl = """@router.get("", response_model=CaseListResponse)
async def get_cases(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    \"\"\"Get all cases.\"\"\"
    return await service.get_all_cases(user_id=current_user["sub"], user_role=current_user["role"], skip=skip, limit=limit, status=status)"""
content = content.replace(target, repl)

target_create = """@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK))
):"""
repl_create = """@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):"""
content = content.replace(target_create, repl_create)

target_get = """@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    \"\"\"Get case by ID.\"\"\"
    case = await service.get_case(case_id)"""
repl_get = """@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    \"\"\"Get case by ID.\"\"\"
    case = await service.get_case(case_id, user_id=current_user["sub"], user_role=current_user["role"])"""
content = content.replace(target_get, repl_get)

target_patch = """@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    case_data: CaseUpdate,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):"""
repl_patch = """@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    case_data: CaseUpdate,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK))
):"""
content = content.replace(target_patch, repl_patch)

with open("app/modules/case/routes.py", "w") as f:
    f.write(content)

print("Updated routes.py")
