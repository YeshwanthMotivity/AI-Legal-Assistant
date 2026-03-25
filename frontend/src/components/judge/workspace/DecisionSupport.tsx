import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Send, Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMutation } from '@tanstack/react-query'
import { submitFeedback } from '@/api/judge'

interface DecisionSupportProps {
  caseId: string
  onFeedbackSuccess?: () => void
}

const DecisionSupport = ({ caseId, onFeedbackSuccess }: DecisionSupportProps) => {
  const { t } = useTranslation()
  const [feedback, setFeedback] = useState('')

  const feedbackMutation = useMutation({
    mutationFn: (text: string) => submitFeedback(caseId, { 
      legal_relevance_score: 5, // Default for now
      reasoning_quality_score: 5,
      explanation_clarity_score: 5,
      feedback_text: text 
    }),
    onSuccess: () => {
      setFeedback('')
      if (onFeedbackSuccess) onFeedbackSuccess()
    }
  })

  const handleSubmit = () => {
    if (!feedback.trim() || feedbackMutation.isPending) return
    feedbackMutation.mutate(feedback)
  }

  return (
    <Card className="bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
      <CardHeader className="p-5 border-b border-outline-variant/20 bg-surface-container-low/40">
        <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          {t('judge.workspace.feedbackTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('judge.workspace.feedbackDesc') || "Provide direct feedback to the reasoning engine to refine future insights and alignment."}
        </p>
        <div className="relative">
          <textarea
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[120px] transition-all placeholder:italic text-on-surface"
            placeholder={t('judge.feedback.feedbackText') + "..."}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="absolute bottom-3 right-3">
             <Sparkles className="w-4 h-4 text-primary/20" />
          </div>
        </div>
        <Button
          className="w-full h-10 rounded-lg bg-primary text-on-primary font-bold text-[11px] uppercase tracking-widest gap-2"
          disabled={!feedback.trim() || feedbackMutation.isPending}
          onClick={handleSubmit}
        >
          {feedbackMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              {t('judge.feedback.submit') || "Submit Feedback"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default DecisionSupport
