interface TemplateData {
  caseNumber: string
  claimantName: string
  respondentName: string
  filingDate: string
  outcome?: string
  reasoning?: string
  lawArticles?: string[]
  precedents?: string[]
  compensation?: string
}

export const TEMPLATE_LABELS: Record<string, string> = {
  unpaid_wages: 'Unpaid Wages',
  wrongful_termination: 'Wrongful Termination',
  end_of_service: 'End of Service Gratuity',
  contract_dispute: 'Contract Dispute',
  other: 'General Judgment',
}

export const TEMPLATE_LABELS_AR: Record<string, string> = {
  unpaid_wages: 'الأجور غير المدفوعة',
  wrongful_termination: 'الفصل التعسفي',
  end_of_service: 'مكافأة نهاية الخدمة',
  contract_dispute: 'نزاع تعاقدي',
  other: 'حكم عام',
}

export function buildTemplate(caseType: string, data: TemplateData, language: string = 'en'): string {
  const isAR = language === 'ar';
  
  const h = {
    court: isAR ? 'محاكم مركز دبي المالي العالمي - محكمة المطالبات الصغيرة' : 'DIFC COURTS — SMALL CLAIMS TRIBUNAL',
    caseNo: isAR ? 'رقم القضية' : 'Case No',
    filingDate: isAR ? 'تاريخ تقديم الطلب' : 'Filing Date',
    claimant: isAR ? 'المدعي' : 'Claimant',
    respondent: isAR ? 'المدعى عليه' : 'Respondent',
    nature: isAR ? '1. طبيعة المطالبة' : '1. NATURE OF CLAIM',
    facts: isAR ? '2. الوقائع' : '2. FACTS',
    law: isAR ? '3. القانون الواجب التطبيق' : '3. APPLICABLE LAW',
    reasoning: isAR ? '4. التسبيب القانوني' : '4. LEGAL REASONING',
    precedents: isAR ? '5. السوابق القضائية المستشهد بها' : '5. CITED PRECEDENTS',
    judgment: isAR ? '6. الحكم والأمر' : '6. JUDGMENT AND ORDER',
    end: isAR ? '--- نهاية مسودة الحكم ---' : '--- End of Judgment Draft ---',
    defaultLaw: isAR ? 'قانون العمل - قانون مركز دبي المالي العالمي رقم 2 لسنة 2019' : 'Employment Law — DIFC Law No. 2 of 2019',
    noPrecedents: isAR ? 'لم يتم الاستشهاد بسوابق قضائية' : 'No precedents cited',
  };

  const articles = data.lawArticles?.length
    ? data.lawArticles.map(a => `<li>${a}</li>`).join('')
    : `<li>${h.defaultLaw}</li>`

  const precedentList = data.precedents?.length
    ? data.precedents.map(p => `<li>${p}</li>`).join('')
    : `<li>${h.noPrecedents}</li>`

  const header = `
    <h2 style="text-align:center"><strong>${h.court}</strong></h2>
    <p style="text-align:center">${h.caseNo}: ${data.caseNumber}</p>
    <p style="text-align:center">${h.filingDate}: ${data.filingDate}</p>
    <br/>
    <p><strong>${h.claimant}:</strong> ${data.claimantName}</p>
    <p><strong>${h.respondent}:</strong> ${data.respondentName}</p>
    <hr/>
  `

  const templates: Record<string, string> = {
    unpaid_wages: `
      ${header}
      <h3><strong>${h.nature}</strong></h3>
      <p>This matter concerns a claim by the Claimant, <strong>${data.claimantName}</strong>, against the Respondent, <strong>${data.respondentName}</strong>, for recovery of unpaid wages in breach of the applicable employment agreement and DIFC Employment Law.</p>
      <h3><strong>${h.facts}</strong></h3>
      <p>${data.reasoning || 'The Claimant was employed by the Respondent. The Respondent failed to pay the Claimant\'s wages for [X] months despite repeated written and verbal requests.'}</p>
      <h3><strong>${h.law}</strong></h3>
      <ul>${articles}</ul>
      <h3><strong>${h.reasoning}</strong></h3>
      <p>The Tribunal finds that the non-payment of wages constitutes a clear breach of the Employment Contract and Article 18 of DIFC Employment Law No. 2 of 2019, which mandates timely payment of wages. The Claimant is entitled to recover all outstanding amounts.</p>
      <h3><strong>${h.precedents}</strong></h3>
      <ul>${precedentList}</ul>
      <h3><strong>${h.judgment}</strong></h3>
      <p>The Tribunal <strong>${data.outcome === 'Rejected' ? 'DISMISSES' : 'UPHOLDS'}</strong> the Claimant's claim. The Respondent is hereby ordered to:</p>
      <ul>
        <li>Pay all outstanding wages in the amount of AED [AMOUNT] within 14 days of this order.</li>
        <li>Pay the Claimant's legal costs as assessed by the Tribunal.</li>
      </ul>
      <p><em>${h.end}</em></p>
    `,

    wrongful_termination: `
      ${header}
      <h3><strong>${h.nature}</strong></h3>
      <p>This matter concerns an allegation of wrongful termination by <strong>${data.claimantName}</strong> against <strong>${data.respondentName}</strong>, in contravention of DIFC Employment Law.</p>
      <h3><strong>${h.facts}</strong></h3>
      <p>${data.reasoning || 'The Claimant was employed by the Respondent under a written employment contract. The Respondent terminated the Claimant\'s employment without lawful cause or sufficient notice.'}</p>
      <h3><strong>${h.law}</strong></h3>
      <ul>${articles}</ul>
      <h3><strong>${h.reasoning}</strong></h3>
      <p>Under Article 59 of DIFC Employment Law No. 2 of 2019, an employer may only terminate employment for cause with proper notice. The Tribunal finds that the termination lacked valid grounds and the required notice period was not observed.</p>
      <h3><strong>${h.precedents}</strong></h3>
      <ul>${precedentList}</ul>
      <h3><strong>${h.judgment}</strong></h3>
      <p>The Tribunal <strong>${data.outcome === 'Rejected' ? 'DISMISSES' : 'UPHOLDS'}</strong> the wrongful termination claim. The Respondent is ordered to pay:</p>
      <ul>
        <li>Wages in lieu of notice: AED [AMOUNT]</li>
        <li>Compensation for wrongful termination: AED [AMOUNT]</li>
        <li>Any accrued but unpaid entitlements</li>
      </ul>
      <p><em>${h.end}</em></p>
    `,

    end_of_service: `
      ${header}
      <h3><strong>${h.nature}</strong></h3>
      <p>The Claimant, <strong>${data.claimantName}</strong>, seeks payment of End of Service Gratuity from the Respondent, <strong>${data.respondentName}</strong>, pursuant to DIFC Employment Law.</p>
      <h3><strong>${h.facts}</strong></h3>
      <p>${data.reasoning || 'The Claimant completed [X] years of continuous employment with the Respondent. Upon termination, the Respondent failed to pay the statutory End of Service Gratuity.'}</p>
      <h3><strong>${h.law}</strong></h3>
      <ul>${articles}</ul>
      <h3><strong>${h.reasoning}</strong></h3>
      <p>Article 66 of DIFC Employment Law No. 2 of 2019 entitles an employee who completes at least one year of continuous employment to a Gratuity Payment calculated at 21 days' basic wage per year for the first 5 years, and 30 days per year thereafter.</p>
      <h3><strong>${h.precedents}</strong></h3>
      <ul>${precedentList}</ul>
      <h3><strong>${h.judgment}</strong></h3>
      <p>The Tribunal orders the Respondent to pay End of Service Gratuity in the amount of <strong>AED [AMOUNT]</strong> within 21 days of this judgment.</p>
      <p><em>${h.end}</em></p>
    `,

    contract_dispute: `
      ${header}
      <h3><strong>${h.nature}</strong></h3>
      <p>This matter involves a contractual dispute between <strong>${data.claimantName}</strong> (Claimant) and <strong>${data.respondentName}</strong> (Respondent) regarding the terms of their employment agreement.</p>
      <h3><strong>${h.facts}</strong></h3>
      <p>${data.reasoning || 'The parties entered into an employment contract. The Respondent is alleged to have breached material terms of the contract, causing financial harm to the Claimant.'}</p>
      <h3><strong>${h.law}</strong></h3>
      <ul>${articles}</ul>
      <h3><strong>${h.reasoning}</strong></h3>
      <p>The Tribunal has reviewed the employment contract and finds that the following terms were breached: [SPECIFY TERMS]. The Claimant is entitled to damages flowing from the breach.</p>
      <h3><strong>${h.precedents}</strong></h3>
      <ul>${precedentList}</ul>
      <h3><strong>${h.judgment}</strong></h3>
      <p>The Tribunal <strong>${data.outcome === 'Rejected' ? 'DISMISSES' : 'UPHOLDS'}</strong> the claim. Damages of AED [AMOUNT] are awarded to the Claimant.</p>
      <p><em>${h.end}</em></p>
    `,

    other: `
      ${header}
      <h3><strong>${h.nature}</strong></h3>
      <p>The Claimant, <strong>${data.claimantName}</strong>, brings this action against the Respondent, <strong>${data.respondentName}</strong>, in respect of an employment-related matter before the DIFC Small Claims Tribunal.</p>
      <h3><strong>${h.facts}</strong></h3>
      <p>${data.reasoning || '[Insert summary of material facts as established by the evidence]'}</p>
      <h3><strong>${h.law}</strong></h3>
      <ul>${articles}</ul>
      <h3><strong>${h.reasoning}</strong></h3>
      <p>[Insert legal analysis and application of law to facts]</p>
      <h3><strong>${h.precedents}</strong></h3>
      <ul>${precedentList}</ul>
      <h3><strong>${h.judgment}</strong></h3>
      <p>Having regard to the evidence and applicable law, the Tribunal orders: [INSERT ORDER]</p>
      <p><em>${h.end}</em></p>
    `,
  }

  return (templates[caseType] || templates['other']).trim()
}
