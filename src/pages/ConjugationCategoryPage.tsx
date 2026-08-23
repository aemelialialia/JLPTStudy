import { Link, useParams } from 'react-router-dom'
import type { ConjugationCategory } from '../types/conjugation'
import { CONJUGATION_CATEGORIES, CONJUGATION_CATEGORY_LABELS } from '../types/conjugation'
import { conjugationService } from '../services/conjugationService'
import '../components/resources/resources.css'
import '../components/vocabulary/vocabulary.css'

function isConjugationCategory(value: unknown): value is ConjugationCategory {
  return CONJUGATION_CATEGORIES.includes(value as ConjugationCategory)
}

/**
 * /resources/conjugation/:category — one reference-table category. Fully
 * functional rendering for whenever real tables exist (see
 * conjugationService/ConjugationTable), but today always shows the empty
 * state below, since no content has been added (Phase 5 spec section 10:
 * do not invent conjugation tables).
 */
export function ConjugationCategoryPage() {
  const { category: categoryParam } = useParams<{ category: string }>()
  const isValid = isConjugationCategory(categoryParam)
  const category = isValid ? categoryParam : 'verb'
  const tables = conjugationService.getTablesForCategory(category)

  if (!isValid) {
    return (
      <section>
        <h1>Unknown reference category</h1>
        <Link to="/resources/conjugation">Back to Reference Tables</Link>
      </section>
    )
  }

  return (
    <section className="resources-page">
      <div className="resources-header">
        <Link to="/resources/conjugation" className="conjugation-back-link text-label-sm">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            arrow_back
          </span>
          Reference Tables
        </Link>
        <h1 className="text-headline-lg">{CONJUGATION_CATEGORY_LABELS[category]}</h1>
      </div>

      {tables.length === 0 ? (
        <div className="conjugation-empty-banner">
          <span className="material-symbols-outlined" data-fill="1">
            info
          </span>
          <p>
            No {CONJUGATION_CATEGORY_LABELS[category].toLowerCase()} tables yet. Share the reference table you&apos;d
            like here (which forms, which examples) and it will be added — nothing is fabricated automatically.
          </p>
        </div>
      ) : (
        <div className="conjugation-table-list">
          {tables.map((table) => (
            <div key={table.id} className="conjugation-table-card">
              <h2 className="text-title-md">{table.title}</h2>
              {table.description && <p className="text-body-md">{table.description}</p>}
              <div className="vocab-table-wrap">
                <table className="vocab-table">
                  <thead>
                    <tr>
                      <th>Form</th>
                      <th>Example</th>
                      <th>Reading</th>
                      <th>Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, i) => (
                      <tr key={i}>
                        <td>{row.form}</td>
                        <td>{row.example}</td>
                        <td>{row.reading ?? ''}</td>
                        <td>{row.meaning ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
