import { Link } from 'react-router-dom'
import { Avatar } from '../components/layout/Avatar'
import { useUserSettings } from '../hooks/useUserSettings'
import { useProfileData } from '../hooks/useProfileData'
import { VocabMasteryRow } from '../components/profile/VocabMasteryRow'
import { GrammarBubbleRow } from '../components/profile/GrammarBubbleRow'
import '../components/profile/profile.css'

/**
 * /profile — the Profile page (spec section 10, Stitch `learner_profile`
 * screen). Every number shown — daily goal progress, streak, per-level
 * vocabulary mastery, per-level grammar points studied — comes from
 * useProfileData/useUserSettings, never hard-coded.
 */
export function ProfilePage() {
  const { settings } = useUserSettings()
  const { data, loading } = useProfileData()

  const dailyGoal = settings?.dailyGoal ?? 50
  const todayCount = data?.todayCount ?? 0
  const streak = data?.streak ?? 0

  return (
    <section className="profile-page">
      <div className="profile-overview">
        <div className="profile-card profile-user-card">
          <Avatar size={80} />
          <div>
            <h1 className="profile-user-card__name text-headline-lg">Nihongo Learner</h1>
            <div className="profile-user-card__badges">
              <span className="profile-badge profile-badge--target">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  flag
                </span>
                {settings?.targetLevel ? `Target: Level ${settings.targetLevel}` : 'No target level set'}
              </span>
              <span className="profile-badge profile-badge--streak">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  local_fire_department
                </span>
                {`${streak} Day${streak === 1 ? '' : 's'}`}
              </span>
            </div>
            <p className="profile-user-card__blurb text-body-md">
              Keep up the daily practice — every word and grammar point studied brings you closer to your goal.
            </p>
          </div>
        </div>

        <div className="profile-card profile-goal-card">
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
            emoji_events
          </span>
          <p className="profile-goal-card__value text-headline-lg">{`${todayCount}/${dailyGoal}`}</p>
          <p className="profile-goal-card__label text-label-sm">Cards Studied Today</p>
        </div>
      </div>

      <div className="profile-section-grid">
        <div className="profile-card">
          <h2 className="profile-section-title text-title-md">
            <span className="profile-section-title__icon profile-section-title__icon--vocab material-symbols-outlined">
              menu_book
            </span>
            Vocabulary
          </h2>
          {loading || !data ? (
            <p>Loading…</p>
          ) : (
            data.vocabByLevel.map((progress) => <VocabMasteryRow key={progress.level} progress={progress} />)
          )}
        </div>

        <div className="profile-card profile-grammar-card">
          <h2 className="profile-section-title text-title-md">
            <span className="profile-section-title__icon profile-section-title__icon--grammar material-symbols-outlined">
              school
            </span>
            Grammar
          </h2>
          {loading || !data ? (
            <p>Loading…</p>
          ) : (
            data.grammarByLevel.map((progress) => <GrammarBubbleRow key={progress.level} progress={progress} />)
          )}
        </div>
      </div>

      <Link
        to="/settings"
        className="text-label-sm"
        style={{ color: 'var(--color-text-secondary)', textAlign: 'center', textDecoration: 'underline' }}
      >
        Manage study data (export / import / reset)
      </Link>
    </section>
  )
}
