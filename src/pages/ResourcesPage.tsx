import { Link } from 'react-router-dom'
import '../components/resources/resources.css'

/**
 * /resources — the Resources page (spec section 11, Stitch
 * `study_resources` screen). The Stitch prototype also mocks up a "Verb
 * Conjugation Table" and "Noun/Adjective Tables" card. Phase 4 omitted
 * these entirely (no such feature existed yet) per the no-dead-end-links
 * principle used throughout this project (e.g. Dashboard's Practice More
 * row). Phase 5 adds the real architecture for that section (routes,
 * types, content loader, service — see src/types/conjugation.ts and
 * src/content/conjugation/) but STILL has no actual table content to
 * show, since inventing conjugation tables is explicitly out of scope —
 * so the card below links to a real page that says so honestly, rather
 * than either a dead link or fabricated content.
 */
export function ResourcesPage() {
  return (
    <section className="resources-page">
      <div className="resources-header">
        <h1 className="text-headline-lg">Learning Resources</h1>
        <p className="text-body-md">Your toolkit for mastering Japanese.</p>
      </div>

      <div className="resources-grid">
        <Link to="/study" className="resource-card resource-card--vocab spring-card squish-btn pattern-asanoha">
          <span className="resource-card__icon">
            <span className="material-symbols-outlined">translate</span>
          </span>
          <h3 className="resource-card__title text-title-md">Vocabulary Collection</h3>
          <p className="resource-card__desc text-body-md">Curated lists by JLPT level.</p>
        </Link>

        <Link to="/grammar" className="resource-card resource-card--grammar spring-card squish-btn pattern-asanoha">
          <span className="resource-card__icon">
            <span className="material-symbols-outlined">menu_book</span>
          </span>
          <h3 className="resource-card__title text-title-md">Grammar Collection</h3>
          <p className="resource-card__desc text-body-md">Detailed explanations and examples.</p>
        </Link>

        <Link to="/resources/conjugation" className="resource-card resource-card--conjugation spring-card squish-btn">
          <span className="resource-card__icon">
            <span className="material-symbols-outlined">sync_alt</span>
          </span>
          <h3 className="resource-card__title text-title-md">Reference Tables</h3>
          <p className="resource-card__desc text-body-md">Verb, adjective, and noun conjugation references.</p>
        </Link>

        <a
          href="https://www.jlpt.jp/e/"
          target="_blank"
          rel="noopener noreferrer"
          className="resources-external-card squish-btn"
        >
          <span className="resources-external-card__left">
            <span className="resources-external-card__icon">
              <span className="material-symbols-outlined">language</span>
            </span>
            <span>
              <h3 className="resources-external-card__title text-title-md">Official JLPT Website</h3>
              <p className="resources-external-card__desc">Test dates, registration, and official info.</p>
            </span>
          </span>
          <span className="resources-external-card__arrow material-symbols-outlined">open_in_new</span>
        </a>
      </div>
    </section>
  )
}
