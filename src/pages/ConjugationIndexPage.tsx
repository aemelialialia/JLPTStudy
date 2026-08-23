import { Link } from 'react-router-dom'
import { CONJUGATION_CATEGORIES, CONJUGATION_CATEGORY_LABELS, CONJUGATION_CATEGORY_ICONS } from '../types/conjugation'
import { conjugationService } from '../services/conjugationService'
import '../components/resources/resources.css'

/**
 * /resources/conjugation — Grammar Resources' reference-table section
 * (Phase 5 spec section 10): verb/adjective/noun/politeness conjugation
 * tables. The UI structure and content-loading architecture are real and
 * complete; the content itself is not — every category is honestly
 * empty (see src/content/conjugation/contentLoader.ts) because no table
 * content has been provided yet. This page says so directly rather than
 * hiding the section or fabricating placeholder rows.
 */
export function ConjugationIndexPage() {
  const summaries = conjugationService.getCategorySummaries()
  const totalTables = summaries.reduce((sum, s) => sum + s.tableCount, 0)

  return (
    <section className="resources-page">
      <div className="resources-header">
        <h1 className="text-headline-lg">Reference Tables</h1>
        <p className="text-body-md">Verb, adjective, and noun conjugation references, plus plain/polite forms.</p>
      </div>

      {totalTables === 0 && (
        <div className="conjugation-empty-banner">
          <span className="material-symbols-outlined" data-fill="1">
            info
          </span>
          <p>
            These reference tables haven&apos;t been added yet — nothing here is invented. Share the verb, adjective,
            noun, or plain/polite reference tables you&apos;d like included, and they&apos;ll be added to the
            matching category below.
          </p>
        </div>
      )}

      <div className="resources-grid conjugation-category-grid">
        {CONJUGATION_CATEGORIES.map((category) => {
          const summary = summaries.find((s) => s.category === category)
          const count = summary?.tableCount ?? 0
          return (
            <Link key={category} to={`/resources/conjugation/${category}`} className="resource-card resource-card--conjugation spring-card squish-btn">
              <span className="resource-card__icon">
                <span className="material-symbols-outlined">{CONJUGATION_CATEGORY_ICONS[category]}</span>
              </span>
              <h3 className="resource-card__title text-title-md">{CONJUGATION_CATEGORY_LABELS[category]}</h3>
              <p className="resource-card__desc text-body-md">{count > 0 ? `${count} table${count === 1 ? '' : 's'}` : 'Not yet available'}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
