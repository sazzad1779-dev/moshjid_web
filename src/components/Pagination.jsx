import React from 'react'

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid #eef2f5',
  },
  btn: {
    border: '1px solid #dfe6ea',
    background: '#fff',
    borderRadius: 8,
    padding: '6px 12px',
    cursor: 'pointer',
    color: '#5f6b7a',
    fontWeight: 600,
    fontSize: 13,
    minWidth: 36,
    transition: 'all 0.2s',
  },
  active: {
    background: '#1d4f2f',
    color: '#fff',
    border: '1px solid #1d4f2f',
  },
  disabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  }
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  let visiblePages = pages
  if (totalPages > 7) {
    if (currentPage <= 3) {
      visiblePages = [...pages.slice(0, 5), '...', totalPages]
    } else if (currentPage >= totalPages - 2) {
      visiblePages = [1, '...', ...pages.slice(totalPages - 5)]
    } else {
      visiblePages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
    }
  }

  return (
    <div style={styles.container}>
      <button 
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{ ...styles.btn, ...(currentPage === 1 ? styles.disabled : {}) }}
      >
        ← Prev
      </button>

      {visiblePages.map((p, i) => (
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={{ color: '#8898aa', padding: '0 4px' }}>...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={{
              ...styles.btn,
              ...(currentPage === p ? styles.active : {})
            }}
          >
            {p}
          </button>
        )
      ))}

      <button 
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{ ...styles.btn, ...(currentPage === totalPages ? styles.disabled : {}) }}
      >
        Next →
      </button>
    </div>
  )
}