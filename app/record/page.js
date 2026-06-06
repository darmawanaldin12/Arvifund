// Redirect ke /wallet — halaman record telah digabung ke wallet
import { redirect } from 'next/navigation'
export default function RecordRedirect() {
  redirect('/wallet')
}
