import ResponsiveSwitcher from './components/layout/ResponsiveSwitcher'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AdminLayout from './components/admin/AdminLayout'
import DatabaseEditor from './components/admin/DatabaseEditor'
import PaketPekerjaanPage from './components/admin/PaketPekerjaanPage'
import PaketDetail from './components/admin/PaketDetail'
import MigrasiPage from './components/admin/MigrasiPage'

function App() {
  return (
    <div className="w-full h-screen overflow-hidden bg-slate-950 text-white">
      <Router basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<ResponsiveSwitcher />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="database" element={<DatabaseEditor />} />
            <Route path="migrasi" element={<MigrasiPage />} />
            <Route path="paket-pekerjaan/:tahun" element={<PaketPekerjaanPage />} />
            <Route path="paket/:id" element={<PaketDetail />} />
          </Route>
        </Routes>
      </Router>
    </div>
  )
}

export default App
