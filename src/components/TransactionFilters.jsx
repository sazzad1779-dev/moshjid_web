import React from 'react'

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    marginBottom: 20,
    padding: 16,
    background: '#f8fafc',
    borderRadius: 12,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: '#8898aa',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  input: {
    marginTop: 6,
    border: '1px solid #dfe6ea',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    background: '#fff',
    color: '#233241',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  row: {
    display: 'flex',
    gap: 8,
  }
}

export default function TransactionFilters({ 
  search, onSearchChange,
  type, onTypeChange,
  category, onCategoryChange,
  categories,
  dateStart, onDateStartChange,
  dateEnd, onDateEndChange,
  onClear 
}) {
  return (
    <div style={styles.container}>
      <div style={styles.field}>
        <label style={styles.label}>Search</label>
        <input 
          type="text" 
          placeholder="Search by category, note, date..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Type</label>
        <select 
          value={type} 
          onChange={e => onTypeChange(e.target.value)} 
          style={styles.input}
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Category</label>
        <select 
          value={category} 
          onChange={e => onCategoryChange(e.target.value)} 
          style={styles.input}
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Date Range</label>
        <div style={styles.row}>
          <input 
            type="date" 
            value={dateStart}
            onChange={e => onDateStartChange(e.target.value)}
            style={styles.input}
          />
          <input 
            type="date" 
            value={dateEnd}
            onChange={e => onDateEndChange(e.target.value)}
            style={styles.input}
          />
        </div>
      </div>
    </div>
  )
}