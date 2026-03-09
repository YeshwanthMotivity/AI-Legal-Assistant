with open("app/modules/user/routes.py", "r") as f:
    content = f.read()

target_create = """@admin_router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    service: UserService = Depends(get_admin_user_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    \"\"\"Create a new user (Admin only).\"\"\"
    return await service.create_user(user_data)"""

repl_create = """@admin_router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    service: UserService = Depends(get_admin_user_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    \"\"\"Create a new user (Admin only).\"\"\"
    user = await service.create_user(user_data)
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user.get("sub", ""), "create_user", "user", user.id)
    return user"""

content = content.replace(target_create, repl_create)

target_delete = """@admin_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    service: UserService = Depends(get_admin_user_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    \"\"\"Delete a user (Admin only).\"\"\"
    success = await service.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )"""

repl_delete = """@admin_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    service: UserService = Depends(get_admin_user_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    \"\"\"Delete a user (Admin only).\"\"\"
    success = await service.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user.get("sub", ""), "deactivate_user", "user", user_id)
"""

content = content.replace(target_delete, repl_delete)

with open("app/modules/user/routes.py", "w") as f:
    f.write(content)

print("Updated user routes.py")

with open("app/modules/case/routes.py", "r") as f:
    case_content = f.read()

target_case_create = """@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    \"\"\"Create a new case.\"\"\"
    return await service.create_case(case_data, current_user["sub"])"""

repl_case_create = """@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    db: AsyncSession = Depends(get_db),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK))
):
    \"\"\"Create a new case.\"\"\"
    case = await service.create_case(case_data, current_user["sub"])
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user["sub"], "create_case", "case", case.id)
    return case"""

case_content = case_content.replace(target_case_create, repl_case_create)

target_case_update = """@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    case_data: CaseUpdate,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK))
):
    \"\"\"Update case.\"\"\"
    case = await service.update_case(case_id, case_data)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return case"""

repl_case_update = """@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    case_data: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.CLERK))
):
    \"\"\"Update case.\"\"\"
    case = await service.update_case(case_id, case_data)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user["sub"], "update_case", "case", case.id)
    return case"""

case_content = case_content.replace(target_case_update, repl_case_update)

target_case_assign = """@router.patch("/{case_id}/assign", response_model=CaseResponse)
async def assign_case(
    case_id: str,
    assign_data: CaseAssign,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    \"\"\"Assign case to a user.\"\"\"
    case = await service.assign_case(case_id, assign_data.assigned_to)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return case"""

repl_case_assign = """@router.patch("/{case_id}/assign", response_model=CaseResponse)
async def assign_case(
    case_id: str,
    assign_data: CaseAssign,
    db: AsyncSession = Depends(get_db),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.ADMIN))
):
    \"\"\"Assign case to a user.\"\"\"
    case = await service.assign_case(case_id, assign_data.assigned_to)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user["sub"], "assign_case", "case", case.id)
    return case"""

case_content = case_content.replace(target_case_assign, repl_case_assign)

target_case_judgment = """@router.post("/{case_id}/judgment", response_model=JudgmentResponse)
async def create_judgment(
    case_id: str,
    judgment_data: JudgmentRequest,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.JUDGE))
):
    \"\"\"Create judgment for case.\"\"\"
    case = await service.get_case(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return await service.create_judgment(case_id, judgment_data.model_dump(), current_user["sub"])"""

repl_case_judgment = """@router.post("/{case_id}/judgment", response_model=JudgmentResponse)
async def create_judgment(
    case_id: str,
    judgment_data: JudgmentRequest,
    db: AsyncSession = Depends(get_db),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(require_role(UserRole.JUDGE))
):
    \"\"\"Create judgment for case.\"\"\"
    case = await service.get_case(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    judgment_res = await service.create_judgment(case_id, judgment_data.model_dump(), current_user["sub"])
    from app.modules.audit.service import AuditService
    await AuditService(db).log(current_user["sub"], "finalize_judgment", "case", case_id)
    return judgment_res"""

case_content = case_content.replace(target_case_judgment, repl_case_judgment)

with open("app/modules/case/routes.py", "w") as f:
    f.write(case_content)

print("Updated case routes.py")
