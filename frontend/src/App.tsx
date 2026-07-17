import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import ReviewWorkspace from './pages/ReviewWorkspace'
import ReviewQueue from './pages/ReviewQueue'
import ReviewDetail from './pages/ReviewDetail'
import RuleCenter from './pages/RuleCenter'
import AuditLogs from './pages/AuditLogs'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/review" element={<ReviewWorkspace />} />
        <Route path="/queue" element={<ReviewQueue />} />
        <Route path="/queue/:taskId" element={<ReviewDetail />} />
        <Route path="/rules" element={<RuleCenter />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Route>
    </Routes>
  )
}

export default App
