with open("app/modules/case/services.py", "r") as f:
    content = f.read()

target = """    async def get_case(self, case_id: str) -> Optional[CaseResponse]:
        \"\"\"Get case by ID.\"\"\"
        case = await self.case_repository.get_by_id(case_id)
        if not case:
            return None
        return CaseResponse.model_validate(case)
    
    async def get_all_cases(self, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> CaseListResponse:
        \"\"\"Get all cases with pagination.\"\"\"
        cases = await self.case_repository.get_all(skip, limit)
        total = await self.case_repository.count()
        return CaseListResponse(
            total=total,
            items=[CaseResponse.model_validate(c) for c in cases]
        )"""

repl = """    async def get_case(self, case_id: str, user_id: str = '', user_role: str = '') -> Optional[CaseResponse]:
        \"\"\"Get case by ID.\"\"\"
        case = await self.case_repository.get_by_id(case_id)
        if not case:
            return None
            
        if user_role == 'judge' and case.assigned_to != user_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail='Forbidden')
            
        return CaseResponse.model_validate(case)
    
    async def get_all_cases(self, user_id: str = '', user_role: str = '', skip: int = 0, limit: int = 100, status: Optional[str] = None) -> CaseListResponse:
        \"\"\"Get all cases with pagination and scope.\"\"\"
        if user_role == 'judge':
            cases = await self.case_repository.get_by_judge(user_id, skip, limit)
            total = len(cases)
        elif user_role == 'clerk':
            cases = await self.case_repository.get_clerk_visible(skip, limit, status)
            total = len(cases)
        else:
            cases = await self.case_repository.get_all(skip, limit, status)
            total = await self.case_repository.count(status)
            
        return CaseListResponse(
            total=total,
            items=[CaseResponse.model_validate(c) for c in cases]
        )"""

if target in content:
    content = content.replace(target, repl)

with open("app/modules/case/services.py", "w") as f:
    f.write(content)

print("Updated services.py")
