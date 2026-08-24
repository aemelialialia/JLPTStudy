import { useState, type FormEvent } from 'react'
import { ShaderBackground } from './ShaderBackground'
import { AppLogo } from './AppLogo'
import './WelcomeNamePrompt.css'

/**
 * First-visit-only gate: asks for the user's name once, then stores it in
 * settings (UserSettings.userName) so it can be displayed instead of the
 * generic "Nihongo Learner" placeholder in the nav drawer and Profile page.
 * Reuses the loading screen's shader/pattern/frosted-card treatment rather
 * than inventing a new overlay style, since this sits at the same "app is
 * just opening" moment — it renders right where LoadingScreen fades out
 * (see AppShell), not as a separate modal design.
 */
export function WelcomeNamePrompt({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('')
  const trimmed = name.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <div className="welcome-name-prompt" role="dialog" aria-modal="true" aria-labelledby="welcome-name-prompt-title">
      <ShaderBackground className="welcome-name-prompt__shader" />
      <div className="welcome-name-prompt__pattern pattern-asanoha" />
      <form className="welcome-name-prompt__card" onSubmit={handleSubmit}>
        <AppLogo size={88} />
        <h1 id="welcome-name-prompt-title" className="text-headline-lg welcome-name-prompt__title">
          What should we call you?
        </h1>
        <input
          type="text"
          className="welcome-name-prompt__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoFocus
          maxLength={60}
          aria-label="Your name"
        />
        <button type="submit" className="welcome-name-prompt__submit squish-btn" disabled={!trimmed}>
          Continue
        </button>
      </form>
    </div>
  )
}
