import { describe, it, expect, beforeEach } from 'vitest'
import { studySessionService } from './studySessionService'
import { studySessionRepository } from '../data/repositories/studySessionRepository'
import { vocabularyRepository } from '../data/repositories/vocabularyRepository'
import { studyStateRepository } from '../data/repositories/studyStateRepository'
import type { VocabularyItem } from '../types/vocabulary'
import type { JLPTLevel } from '../types/jlpt'

function makeWord(id: string, level: JLPTLevel = 'N5'): VocabularyItem {
  const now = new Date().toISOString()
  return {
    id,
    level,
    vocab: id,
    reading: id,
    meaning: `meaning-${id}`,
    partOfSpeech: 'Noun',
    createdAt: now,
    updatedAt: now,
  }
}

async function answerCurrent(sessionId: string, result: 'correct' | 'incorrect') {
  const session = await studySessionRepository.get(sessionId)
  if (!session) throw new Error('session not found in test helper')
  const card = await studySessionService.getCurrentCard(session)
  if (!card) throw new Error('no current card in test helper')
  return studySessionService.submitAnswer(session, card.word.id, result)
}

describe('studySessionService', () => {
  beforeEach(async () => {
    await vocabularyRepository.addMany(['w1', 'w2', 'w3', 'w4', 'w5'].map((id) => makeWord(id)))
  })

  describe('createStudySession', () => {
    it('selects up to targetCount eligible words and persists the session', async () => {
      const session = await studySessionService.createStudySession('N5', 15)
      expect(session.level).toBe('N5')
      expect(session.targetCount).toBe(15)
      expect(session.vocabularyIds).toHaveLength(5) // pool only has 5 words
      expect(session.status).toBe('active')
      expect(session.currentIndex).toBe(0)
      expect(await studySessionRepository.get(session.id)).toEqual(session)
    })

    it('never duplicates a word within one session even when the pool is smaller than requested', async () => {
      const session = await studySessionService.createStudySession('N5', 20)
      expect(new Set(session.vocabularyIds).size).toBe(session.vocabularyIds.length)
      expect(session.vocabularyIds).toHaveLength(5)
    })

    it('excludes already-memorized words from a new session', async () => {
      await studyStateRepository.recordCorrect('w1')
      await studyStateRepository.recordCorrect('w1') // learning -> memorized
      const session = await studySessionService.createStudySession('N5', 10)
      expect(session.vocabularyIds).not.toContain('w1')
      expect(session.vocabularyIds).toHaveLength(4)
    })

    it('throws when there is no eligible vocabulary to study', async () => {
      for (const id of ['w1', 'w2', 'w3', 'w4', 'w5']) {
        await studyStateRepository.recordCorrect(id)
        await studyStateRepository.recordCorrect(id)
      }
      await expect(studySessionService.createStudySession('N5', 10)).rejects.toThrow(/no eligible/i)
    })

    it('keeps levels isolated — N4 candidates never come from N5 vocabulary', async () => {
      await vocabularyRepository.add(makeWord('n4word', 'N4'))
      const session = await studySessionService.createStudySession('N4', 10)
      expect(session.vocabularyIds).toEqual(['n4word'])
    })
  })

  describe('getCurrentStudySession / resumability', () => {
    it('returns undefined when no session has been started for a level', async () => {
      expect(await studySessionService.getCurrentStudySession('N5')).toBeUndefined()
    })

    it('returns the same active session on a later call, unchanged (simulating a page reload)', async () => {
      const created = await studySessionService.createStudySession('N5', 10)
      const resumed = await studySessionService.getCurrentStudySession('N5')
      expect(resumed).toEqual(created)
    })

    it('reflects progress made so far when resumed mid-session', async () => {
      const created = await studySessionService.createStudySession('N5', 10)
      await answerCurrent(created.id, 'correct')

      const resumed = await studySessionService.getCurrentStudySession('N5')
      expect(resumed?.currentIndex).toBe(1)
      expect(resumed?.answers).toHaveLength(1)
    })
  })

  describe('getCurrentCard', () => {
    it('returns the word and live study state for the current position', async () => {
      const session = await studySessionService.createStudySession('N5', 10)
      const card = await studySessionService.getCurrentCard(session)
      expect(card?.word.id).toBe(session.vocabularyIds[0])
      expect(card?.studyState.vocabularyId).toBe(session.vocabularyIds[0])
      expect(card?.studyState.status).toBe('new')
    })

    it('returns null once the session is complete', async () => {
      let session = await studySessionService.createStudySession('N5', 10)
      for (const id of session.vocabularyIds) {
        session = await studySessionService.submitAnswer(session, id, 'correct')
      }
      expect(await studySessionService.getCurrentCard(session)).toBeNull()
    })
  })

  describe('submitAnswer', () => {
    it('rejects an answer for a word that is not the current card', async () => {
      const session = await studySessionService.createStudySession('N5', 10)
      const wrongId = session.vocabularyIds[1]
      await expect(studySessionService.submitAnswer(session, wrongId, 'correct')).rejects.toThrow(
        /not the current card/i,
      )
    })

    it('advances currentIndex and records the answer', async () => {
      const session = await studySessionService.createStudySession('N5', 10)
      const firstId = session.vocabularyIds[0]
      const updated = await studySessionService.submitAnswer(session, firstId, 'correct')
      expect(updated.currentIndex).toBe(1)
      expect(updated.answers).toEqual([{ vocabularyId: firstId, result: 'correct', answeredAt: expect.any(String) }])
      expect(updated.status).toBe('active')
    })

    it('marks the session completed once the last card is answered', async () => {
      let session = await studySessionService.createStudySession('N5', 10)
      const total = session.vocabularyIds.length
      for (let i = 0; i < total; i++) {
        const card = await studySessionService.getCurrentCard(session)
        session = await studySessionService.submitAnswer(session, card!.word.id, 'correct')
      }
      expect(session.status).toBe('completed')
      expect(session.completedAt).not.toBeNull()
      expect(session.currentIndex).toBe(total)
      expect(await studySessionService.getCurrentStudySession('N5')).toBeUndefined() // no longer "active"
    })

    it('does not count a card as completed just because it was viewed — only once answered', async () => {
      const session = await studySessionService.createStudySession('N5', 10)
      await studySessionService.getCurrentCard(session) // "flip" / view only
      const stillFresh = await studySessionRepository.get(session.id)
      expect(stillFresh?.currentIndex).toBe(0)
      expect(stillFresh?.answers).toHaveLength(0)
    })

    it('applies the real memorization-status transition via studyStateRepository — correct promotes new -> learning', async () => {
      const session = await studySessionService.createStudySession('N5', 10)
      const firstId = session.vocabularyIds[0]
      await studySessionService.submitAnswer(session, firstId, 'correct')
      expect((await studyStateRepository.get(firstId))?.status).toBe('learning')
      expect((await studyStateRepository.get(firstId))?.timesCorrect).toBe(1)
    })

    it('a second correct answer (in a later session) promotes learning -> memorized', async () => {
      let session = await studySessionService.createStudySession('N5', 10)
      const firstId = session.vocabularyIds[0]
      session = await studySessionService.submitAnswer(session, firstId, 'correct') // new -> learning

      // Simulate the word coming up again in a fresh session (the pool is
      // small enough that every word — including firstId — is included,
      // though not necessarily in the same position).
      let reviewSession = await studySessionService.startNewSession('N5', 10)
      expect(reviewSession.vocabularyIds).toContain(firstId)

      // Answer cards in order until firstId comes up.
      let card = await studySessionService.getCurrentCard(reviewSession)
      while (card && card.word.id !== firstId) {
        reviewSession = await studySessionService.submitAnswer(reviewSession, card.word.id, 'correct')
        card = await studySessionService.getCurrentCard(reviewSession)
      }
      await studySessionService.submitAnswer(reviewSession, firstId, 'correct') // learning -> memorized

      const state = await studyStateRepository.get(firstId)
      expect(state?.status).toBe('memorized')
    })

    it('incorrect answers keep the word eligible for future study and never abort the session', async () => {
      const session = await studySessionService.createStudySession('N5', 10)
      const firstId = session.vocabularyIds[0]
      await studySessionService.submitAnswer(session, firstId, 'incorrect')
      const state = await studyStateRepository.get(firstId)
      expect(state?.status).toBe('learning')
      expect(state?.timesIncorrect).toBe(1)
    })

    it('throws when submitting to a session that is already completed', async () => {
      let session = await studySessionService.createStudySession('N5', 10)
      for (const id of session.vocabularyIds) {
        session = await studySessionService.submitAnswer(session, id, 'correct')
      }
      await expect(studySessionService.submitAnswer(session, session.vocabularyIds[0], 'correct')).rejects.toThrow(
        /not active/i,
      )
    })
  })

  describe('startNewSession', () => {
    it('abandons the previous active session (without deleting it) and creates a fresh one', async () => {
      const first = await studySessionService.createStudySession('N5', 10)
      const second = await studySessionService.startNewSession('N5', 10)

      expect(second.id).not.toBe(first.id)
      const oldRecord = await studySessionRepository.get(first.id)
      expect(oldRecord?.status).toBe('abandoned')
      expect(await studySessionService.getCurrentStudySession('N5')).toEqual(second)
    })

    it('does not lose progress already recorded on the abandoned session', async () => {
      const first = await studySessionService.createStudySession('N5', 10)
      const firstId = first.vocabularyIds[0]
      await studySessionService.submitAnswer(first, firstId, 'correct')

      await studySessionService.startNewSession('N5', 10)

      expect((await studyStateRepository.get(firstId))?.status).toBe('learning')
    })
  })

  describe('createReviewOfIncorrect', () => {
    it('starts a session containing exactly the words missed, deduplicated', async () => {
      let session = await studySessionService.createStudySession('N5', 10)
      const ids = session.vocabularyIds
      session = await studySessionService.submitAnswer(session, ids[0], 'incorrect')
      session = await studySessionService.submitAnswer(session, ids[1], 'correct')
      session = await studySessionService.submitAnswer(session, ids[2], 'incorrect')
      session = await studySessionService.submitAnswer(session, ids[3], 'correct')
      session = await studySessionService.submitAnswer(session, ids[4], 'correct')

      const review = await studySessionService.createReviewOfIncorrect(session)
      expect(review.vocabularyIds.sort()).toEqual([ids[0], ids[2]].sort())
      expect(review.level).toBe('N5')
    })

    it('throws when nothing was answered incorrectly', async () => {
      let session = await studySessionService.createStudySession('N5', 10)
      for (const id of session.vocabularyIds) {
        session = await studySessionService.submitAnswer(session, id, 'correct')
      }
      await expect(studySessionService.createReviewOfIncorrect(session)).rejects.toThrow(/no incorrect/i)
    })
  })

  describe('level completion + review cycle', () => {
    it('detects a level is complete only once every word is memorized', async () => {
      expect(await studySessionService.isLevelComplete('N5')).toBe(false)
      for (const id of ['w1', 'w2', 'w3', 'w4', 'w5']) {
        await studyStateRepository.recordCorrect(id)
        await studyStateRepository.recordCorrect(id)
      }
      expect(await studySessionService.isLevelComplete('N5')).toBe(true)
    })

    it('starting a review cycle makes memorized words eligible again without erasing their history', async () => {
      await studyStateRepository.recordCorrect('w1')
      await studyStateRepository.recordCorrect('w1')
      const beforeReview = await studyStateRepository.get('w1')

      await studySessionService.startReviewCycle('N5')

      const afterReview = await studyStateRepository.get('w1')
      expect(afterReview?.status).toBe('learning')
      expect(afterReview?.timesSeen).toBe(beforeReview?.timesSeen) // history preserved, not wiped
      expect(afterReview?.timesCorrect).toBe(beforeReview?.timesCorrect)

      const session = await studySessionService.createStudySession('N5', 10)
      expect(session.vocabularyIds).toContain('w1')
    })

    it('getLevelProgress reflects real counts, never fabricated', async () => {
      await studyStateRepository.recordCorrect('w1')
      const progress = await studySessionService.getLevelProgress('N5')
      expect(progress).toEqual({ level: 'N5', total: 5, new: 4, learning: 1, memorized: 0 })
    })
  })
})
