import React from 'react'

export default function TransactionFilters({
  search, onSearchChange,
  type, onTypeChange,
  category, onCategoryChange,
  categories,
  dateStart, onDateStartChange,
  dateEnd, onDateEndChange,
}) {
  return (
    <div className="transaction-filters">
      <label className="transaction-filters__search">
        Search
        <input
          type="search"
          placeholder="Category, note, or date"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
        />
      </label>
      <label>
        Type
        <select value={type} onChange={event => onTypeChange(event.target.value)}>
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </label>
      <label>
        Category
        <select value={category} onChange={event => onCategoryChange(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        From
        <input type="date" value={dateStart} onChange={event => onDateStartChange(event.target.value)} />
      </label>
      <label>
        To
        <input type="date" value={dateEnd} onChange={event => onDateEndChange(event.target.value)} />
      </label>
    </div>
  )
}
