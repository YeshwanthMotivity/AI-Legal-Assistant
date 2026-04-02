from typing import Optional, List
from app.modules.document.schemas import DocumentCreate, DocumentUpdate, DocumentResponse, DocumentListResponse
from app.modules.document.repository import DocumentRepository


class DocumentService:
    def __init__(self, document_repository: DocumentRepository):
        self.document_repository = document_repository
    
    async def create_document(self, document_data: DocumentCreate, uploaded_by: str) -> DocumentResponse:
        """Create a new document."""
        document = await self.document_repository.create(document_data, uploaded_by)
        return DocumentResponse.model_validate(document)
    
    async def get_document(self, document_id: str) -> Optional[DocumentResponse]:
        """Get document by ID."""
        document = await self.document_repository.get_by_id(document_id)
        if not document:
            return None
        return DocumentResponse.model_validate(document)
    
    async def get_case_documents(self, case_id: str, skip: int = 0, limit: int = 100) -> DocumentListResponse:
        """Get all documents for a case."""
        documents = await self.document_repository.get_by_case(case_id, skip, limit)
        total = await self.document_repository.count(case_id)
        return DocumentListResponse(
            total=total,
            items=[DocumentResponse.model_validate(d) for d in documents]
        )
    
    async def update_document(self, document_id: str, document_data: DocumentUpdate) -> Optional[DocumentResponse]:
        """Update document."""
        document = await self.document_repository.update(document_id, document_data)
        if not document:
            return None
        return DocumentResponse.model_validate(document)
    
    async def delete_document(self, document_id: str) -> bool:
        """Delete document."""
        return await self.document_repository.delete(document_id)

