import { describe, it, expect } from 'vitest'
import { grammarQuizSessionService } from './grammarQuizSessionService'
import { quizService } from './quizService'
import { getQuestionsForLevel } from '../content/contentLoader'

describe('grammarQuizSessionService.startMistakePracticeSession', () => {
  it('throws a clear error when there are no active mistakes for the level', async () => {
    await expect(grammarQuizSessionService.startMistakePracticeSession('N5')).rejects.toThrow(/no active mistakes/i)
  })

  it('builds a session from exactly the level\'s Active (non-Mastered) mistakes, one question each', async () => {
    const [q1, q2, q3] = getQuestionsForLevel('N5')
    // q1 and q2 become mistakes; q3 is answered correctly first try (never a mistake).
    await quizService.submitAnswer(q1, 'definitely-wrong')
    await quizService.submitAnswer(q2, 'definitely-wrong')
    await quizService.submitAnswer(q3, q3.correctAnswer)

    const session = await grammarQuizSessionService.startMistakePracticeSession('N5')
    expect(session.isMistakePractice).toBe(true)
    expect(session.isDaily).toBe(false)
    expect(session.questionIds.sort()).toEqual([q1.id, q2.id].sort())
  })

  it('excludes Mastered mistakes from the practice pool', async () => {
    const [q1, q2] = getQuestionsForLevel('N5')
    await quizService.submitAnswer(q1, 'wrong')
    await quizService.submitAnswer(q1, q1.correctAnswer)
    await quizService.submitAnswer(q1, q1.correctAnswer)
    await quizService.submitAnswer(q1, q1.correctAnswer) // 3rd in a row -> Mastered, drops out of the pool

    await quizService.submitAnswer(q2, 'wrong') // stays Active

    const session = await grammarQuizSessionService.startMistakePracticeSession('N5')
    expect(session.questionIds).toEqual([q2.id])
  })

  it('reusing the shared quiz engine lets a mistake become Mastered mid mistake-practice session', async () => {
    const [q1] = getQuestionsForLevel('N5')
    await quizService.submitAnswer(q1, 'wrong')
    await quizService.submitAnswer(q1, q1.correctAnswer)
    await quizService.submitAnswer(q1, q1.correctAnswer)

    const session = await grammarQuizSessionService.startMistakePracticeSession('N5')
    const question = grammarQuizSessionService.getCurrentQuestion(session)
    expect(question?.id).toBe(q1.id)

    const { result } = await grammarQuizSessionService.submitAnswer(session, question!, q1.correctAnswer)
    expect(result.mistakeMastered).toBe(true)

    const mistakes = await quizService.getMistakes('N5')
    expect(mistakes.find((m) => m.questionId === q1.id)?.mastered).toBe(true)
  })
})
