import { Navigate, useParams } from 'react-router-dom'

const JudgmentDraft = () => {
 const { id } = useParams<{ id: string }>()
 return <Navigate to={`/judge/cases/${id}`} replace />
}

export default JudgmentDraft
