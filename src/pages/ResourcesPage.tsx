import { Link } from 'react-router-dom'
import '../components/resources/resources.css'

/**
 * /resources — the Resources page (spec section 11, Stitch
 * `study_resources` screen). The Stitch prototype also mocks up a "Verb
 * Conjugation Table" and "Noun/Adjective Tables" card — neither exists
 * as a real feature in this app (no conjugation-table view has been
 * built), so per the no-dead-end-links principle used throughout this
 * project (e.g. Dashboard's Practice More row), they are omitted rather
 * than linking to a page that doesn't exist. Only real destinations —
 * Vocabulary, Grammar, and the official JLPT site — are shown.
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
