'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('arvifund_transactions')
      if (saved) setTransactions(JSON.parse(saved))
    } catch (e) {
      console.error('Failed to load transactions:', e)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('arvifund_transactions', JSON.stringify(transactions))
    } catch (e) {
      console.error('Failed to save transactions:', e)
    }
  }, [transactions])

  function addTransaction(tx) {
    const newTx = { id: Date.now(), date: new Date().toISOString(), ...tx }
    setTransactions((prev) => [newTx, ...prev])
    return newTx
  }

  function updateTransaction(id, updates) {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    )
  }

  function deleteTransaction(id) {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id))
  }

  function getRecentTransactions(limit = 10) {
    return transactions.slice(0, limit)
  }

  return (
    <DataContext.Provider value={{
      transactions,
      loading,
      setLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      getRecentTransactions,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside a DataProvider')
  return ctx
}

export default DataContext
