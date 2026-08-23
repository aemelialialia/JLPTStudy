import { describe, it, expect } from 'vitest'
import { studySessionRepository } from './studySessionRepository'
import { createStudySessionRecord } from '../../types/studySession'

describe('studySessionRepository', () => {
  it('creates and retrieves a session by id', async () => {
    const session = createStudySessionRecord('N5', 10, ['w1', 'w2'])
    await studySessionRepository.create(session)
    expect(await studySessionRepository.get(session.id)).toEqual(session)
  })

  it('returns undefined for an unknown session id', async () => {
    expect(await studySessionRepository.get('nope')).toBeUndefined()
  })

  it('lists sessions scoped to one level', async () => {
    await studySessionRepository.create(createStudySessionRecord('N5', 10, ['a']))
    await studySessionRepository.create(createStudySessionRecord('N4', 10, ['b']))
    expect(await studySessionRepository.listByLevel('N5')).toHaveLength(1)
    expect(await studySessionRepository.listByLevel('N4')).toHaveLength(1)
    expect(await studySessionRepository.listByLevel('N3')).toHaveLength(0)
  })

  it('finds the active session for a level, ignoring completed/abandoned ones', async () => {
    const completed = { ...createStudySessionRecord('N5', 10, ['a']), status: 'completed' as const }
    const abandoned = { ...createStudySessionRecord('N5', 10, ['b']), status: 'abandoned' as const }
    const active = createStudySessionRecord('N5', 10, ['c'])
    await studySessionRepository.create(completed)
    await studySessionRepository.create(abandoned)
    await studySessionRepository.create(active)

    const found = await studySessionRepository.getActiveForLevel('N5')
    expect(found?.id).toBe(active.id)
  })

  it('returns undefined when no active session exists for a level', async () => {
    await studySessionRepository.create({
      ...createStudySessionRecord('N5', 10, ['a']),
      status: 'completed',
    })
    expect(await studySessionRepository.getActiveForLevel('N5')).toBeUndefined()
  })

  it('update() overwrites an existing session in place', async () => {
    const session = createStudySessionRecord('N5', 10, ['a', 'b'])
    await studySessionRepository.create(session)

    const updated = { ...session, currentIndex: 1 }
    await studySessionRepository.update(updated)

    expect((await studySessionRepository.get(session.id))?.currentIndex).toBe(1)
  })
})
