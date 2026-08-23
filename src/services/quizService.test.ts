import { describe, it, expect } from 'vitest'
import { quizService } from './quizService'
import { quizRepository } from '../data/repositories/quizRepository'
import type { GrammarQuestion } from '../types/question'

const question: GrammarQuestion = {
  id: 'q1',
  level: 'N5',
  questionText: 'ここに＿＿＿ください。',
  choices: ['座って', '座り', '座る', '座った'],
  correctAnswer: '座って',
  explanation: 'Te-form + ください makes a polite request.',
  grammarPointId: 'n5-te-form-01',
  difficulty: 'easy',
}

describe('quizService', () => {
  it('records a correct attempt and creates no mistake', async () => {
    const result = await quizService.submitAnswer(question, '座って')
    expect(result.isCorrect).toBe(true)

    const attempts = await quizRepository.getAttemptsForQuestion('q1')
    expect(attempts).toHaveLength(1)
    expect(attempts[0].isCorrect).toBe(true)

    expect(await quizRepository.getMistakeForQuestion('q1')).toBeUndefined()
  })

  it('records an incorrect attempt and creates a linked mistake record', async () => {
    const result = await quizService.submitAnswer(question, '座り')
    expect(result.isCorrect).toBe(false)
    expect(result.correctAnswer).toBe('座って')
    expect(result.grammarPointId).toBe('n5-te-form-01')

    const mistake = await quizRepository.getMistakeForQuestion('q1')
    expect(mistake).toBeDefined()
    expect(mistake?.mastered).toBe(false)
    expect(mistake?.selectedAnswer).toBe('座り')
  })

  it('refreshes (rather than duplicates) an existing mistake on a repeated wrong answer', async () => {
    await quizService.submitAnswer(question, '座り')
    await quizService.submitAnswer(question, '座る')

    const allMistakes = await quizRepository.getMistakes()
    expect(allMistakes).toHaveLength(1)
    expect(allMistakes[0].selectedAnswer).toBe('座る')
  })

  it('leaves a mistake Active after fewer than 3 consecutive correct answers', async () => {
    await quizService.submitAnswer(question, '座り') // wrong -> creates the mistake
    await quizService.submitAnswer(question, '座って') // correct #1
    await quizService.submitAnswer(question, '座って') // correct #2

    const [mistake] = await quizRepository.getMistakes()
    expect(mistake.mastered).toBe(false)
    expect(mistake.consecutiveCorrect).toBe(2)
    expect(mistake.timesCorrect).toBe(2)
    expect(mistake.timesWrong).toBe(1)
  })

  it('marks a mistake Mastered after 3 consecutive correct answers', async () => {
    await quizService.submitAnswer(question, '座り') // wrong -> creates the mistake
    await quizService.submitAnswer(question, '座って')
    await quizService.submitAnswer(question, '座って')
    await quizService.submitAnswer(question, '座って') // 3rd in a row -> Mastered

    const [mistake] = await quizRepository.getMistakes()
    expect(mistake.mastered).toBe(true)
    expect(mistake.consecutiveCorrect).toBe(3)
  })

  it('resets Mastered back to Active (and the streak) on a subsequent wrong answer, without losing history', async () => {
    await quizService.submitAnswer(question, '座り')
    await quizService.submitAnswer(question, '座って')
    await quizService.submitAnswer(question, '座って')
    await quizService.submitAnswer(question, '座って') // Mastered
    await quizService.submitAnswer(question, '座り') // wrong again -> back to Active

    const [mistake] = await quizRepository.getMistakes()
    expect(mistake.mastered).toBe(false)
    expect(mistake.consecutiveCorrect).toBe(0)
    // History is never erased by a reset.
    expect(mistake.timesWrong).toBe(2)
    expect(mistake.timesCorrect).toBe(3)
  })

  it('builds a quiz session from the static (currently empty) N5 question bank', () => {
    const session = quizService.startQuizSession('N5')
    expect(Array.isArray(session)).toBe(true)
  })
})
