import { JLPTLevel } from '@prisma/client'

export interface SectionScoreResult {
  type: string
  title: string
  totalQuestions: number
  correctAnswers: number
  maxScore: number
  earnedScore: number
  minPass?: number
  passed: boolean
  weight?: number
}

export interface GradingResult {
  totalScore: number
  maxScore: number
  sectionScores: SectionScoreResult[]
  passed: boolean
  suggestedLevel?: JLPTLevel
}

export function calculateSectionScore(
  correctAnswers: number,
  totalQuestions: number,
  maxScore: number,
  weight?: number
): number {
  if (totalQuestions === 0) return 0
  
  const rawScore = (correctAnswers / totalQuestions) * maxScore
  return weight ? rawScore * weight : rawScore
}

export function gradeAssessmentAttempt(
  answers: Array<{ isCorrect: boolean; question: { type: string } }>,
  scoreProfileSections: Array<{
    type: string
    title: string
    maxScore: number
    weight?: number
    minPass?: number
  }>,
  minTotalPass?: number
): GradingResult {
  // Group answers by section type
  const answersBySection = new Map<string, { correct: number; total: number }>()
  
  for (const answer of answers) {
    const sectionType = answer.question.type
    const current = answersBySection.get(sectionType) || { correct: 0, total: 0 }
    
    current.total++
    if (answer.isCorrect) {
      current.correct++
    }
    
    answersBySection.set(sectionType, current)
  }

  // Calculate score for each section
  const sectionScores: SectionScoreResult[] = []
  let totalEarnedScore = 0
  let totalMaxScore = 0

  for (const section of scoreProfileSections) {
    const stats = answersBySection.get(section.type) || { correct: 0, total: 0 }
    
    const earnedScore = calculateSectionScore(
      stats.correct,
      stats.total,
      section.maxScore,
      section.weight
    )
    
    const sectionPassed = section.minPass ? earnedScore >= section.minPass : true
    
    sectionScores.push({
      type: section.type,
      title: section.title,
      totalQuestions: stats.total,
      correctAnswers: stats.correct,
      maxScore: section.maxScore,
      earnedScore: Math.round(earnedScore * 100) / 100,
      minPass: section.minPass,
      passed: sectionPassed,
      weight: section.weight,
    })
    
    totalEarnedScore += earnedScore
    totalMaxScore += section.maxScore
  }

  // Check if passed
  const allSectionsPassed = sectionScores.every(s => s.passed)
  const totalPassed = minTotalPass ? totalEarnedScore >= minTotalPass : true
  const passed = allSectionsPassed && totalPassed

  return {
    totalScore: Math.round(totalEarnedScore * 100) / 100,
    maxScore: totalMaxScore,
    sectionScores,
    passed,
  }
}

export function suggestJLPTLevel(
  currentLevel: JLPTLevel,
  totalScore: number,
  maxScore: number,
  passed: boolean
): JLPTLevel | null {
  if (!passed) {
    // Failed - suggest lower level or same
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
    const currentIndex = levels.indexOf(currentLevel)
    
    if (currentIndex > 0) {
      return levels[currentIndex - 1] // Lower level
    }
    return currentLevel // Already at lowest
  }

  // Passed - check if should suggest higher level
  const percentage = (totalScore / maxScore) * 100
  
  if (percentage >= 85) {
    // Excellent performance - suggest higher level
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
    const currentIndex = levels.indexOf(currentLevel)
    
    if (currentIndex < levels.length - 1) {
      return levels[currentIndex + 1] // Higher level
    }
  }
  
  return null // Stay at current level
}
