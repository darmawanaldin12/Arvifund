'use client'
import InputModal from '../../components/modals/InputModal'
import { DataProvider } from '../../context/DataContext'

export default function InputPage() {
  return (
    <DataProvider>
      <InputModal fullscreen />
    </DataProvider>
  )
}
