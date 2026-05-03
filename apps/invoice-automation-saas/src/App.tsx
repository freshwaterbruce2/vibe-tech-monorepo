import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import ErrorBoundary from './components/common/ErrorBoundary'
import ProtectedRoute from './components/common/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import Clients from './pages/Clients'
import CreateInvoice from './pages/CreateInvoice'
import Dashboard from './pages/Dashboard'
import InvoicePayment from './pages/InvoicePayment'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import TaxRates from './pages/TaxRates'
import Templates from './pages/Templates'

import 'react-toastify/dist/ReactToastify.css'

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ToastContainer />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoice/new"
              element={
                <ProtectedRoute>
                  <CreateInvoice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <Templates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tax-rates"
              element={
                <ProtectedRoute>
                  <TaxRates />
                </ProtectedRoute>
              }
            />
            <Route path="/invoice/:invoiceId/payment" element={<InvoicePayment />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
