import { useState } from 'react'
import type { StudySession } from '../../types/studySession'
import type { StudyCard } from '../../services/studySessionService'
import { StudyProgress } from './StudyProgress'
import { Flashcard } from './Flashcard'
import { AnswerControls } from './AnswerControls'
import './study.css'

/**
 * One card's worth of flip state (spec sections 6-11). Split out from
 * StudySessionView and remounted via `key={card.word.id}` there, rather
 * than resetting `flipped` in an effect keyed on the card id — a fresh
 * mount per card is the idiomatic way to reset local UI state when an
 * identity changes, and it's what "the next word always starts on its
 * front" actually means: a new card component, not a synchronized reset.
 */
function ActiveCard({
  session,
  card,
  onAnswer,
}: {
  session: StudySession
  card: StudyCard
  onAnswer: (result: 'correct' | 'incorrect') => void
}) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="study-screen">
      <StudyProgress level={session.level} completed={session.currentIndex} total={session.vocabularyIds.length} />

      <Flashcard word={card.word} flipped={flipped} onFlip={() => setFlipped(true)} />

      {flipped ? (
        <AnswerControls onIncorrect={() => onAnswer('incorrect')} onCorrect={() => onAnswer('correct')} />
      ) : (
        <button type="button" className="study-flip-button squish-btn" onClick={() => setFlipped(true)}>
          Reveal Answer
          <span className="material-symbols-outlined">visibility</span>
        </button>
      )}
    </div>
  )
}

/** The active flashcard screen. Everything besides flip state (advancing, scoring, persistence) happens in the parent via `onAnswer`, which ultimately calls studySessionService.submitAnswer. */
export function StudySessionView({
  session,
  card,
  onAnswer,
}: {
  session: StudySession
  card: StudyCard
  onAnswer: (result: 'correct' | 'incorrect') => void
}) {
  return <ActiveCard key={card.word.id} session={session} card={card} onAnswer={onAnswer} />
}
