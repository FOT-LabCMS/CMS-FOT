import { Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AddChemical from "./pages/chemicals/AddChemical";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/Common/ProtectedRoute";
import DashboardLayout from "./components/Layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import ViewChemicals from "./pages/chemicals/ViewChemicals";
import ChemicalDetails from "./pages/chemicals/ChemicalDetails";
import AddUsers from "./pages/admin/AddUsers";
import ViewUsers from "./pages/admin/ViewUsers";
import PasswordReset from "./components/PasswordReset";
import ViewDeactivatedChemicals from "./pages/chemicals/ViewDeactivatedChemicals";
import AddNewBatch from "./pages/batches/AddNewBatch";
import AddLocation from "./pages/locations/AddLocation";
import ViewLocations from "./pages/locations/ViewLocations";
import LocationDetails from "./pages/locations/LocationDetails";
import ViewAllBatches from "./pages/batches/ViewAllBatches";
import ViewBatchDetail from "./pages/batches/ViewBatchDetail";
import DisposalReq from "./pages/chemicals/DisplosaReq";
import ReturnedPage from "./pages/chemicals/ReturnedPage";
import BatchWiseUsage from "./pages/chemicals/usage/BatchWise";
import ChemicalWiseUsage from "./pages/chemicals/usage/ChemicalWise";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ChemicalWiseReport from "./pages/reports/ChemicalWise";
import UsageReport from "./pages/reports/UsageReport";
import ViewSdsLibrary from "./pages/chemicals/sds/ViewSdsLibrary";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chemicals/:id" element={<ChemicalDetails />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chemicals/add-chemical" element={<AddChemical />} />
          <Route path="/chemicals/list" element={<ViewChemicals />} />
          <Route
            path="/chemicals/deactivated"
            element={<ViewDeactivatedChemicals />}
          />
          <Route
            path="/admin/users/add"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AddUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/view"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <ViewUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute roles={["ADMIN", "TECHNICAL_OFFICER"]}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/stock/add" element={<AddNewBatch />} />
          <Route path="/locations/add" element={<AddLocation />} />
          <Route path="/locations" element={<ViewLocations />} />
          <Route path="/locations/:id" element={<LocationDetails />} />
          <Route path="/stock/batches" element={<ViewAllBatches />} />
          <Route path="/stock/batches/:id" element={<ViewBatchDetail />} />
          <Route path="/disposal/request" element={<DisposalReq />} />
          <Route path="/disposal/return" element={<ReturnedPage />} />
          <Route path="/usage/batchwise" element={<BatchWiseUsage />} />
          <Route path="/usage/chemicalwise" element={<ChemicalWiseUsage />} />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute roles={["ADMIN", "TECHNICAL_OFFICER"]}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/chemicalwise"
            element={
              <ProtectedRoute roles={["ADMIN", "TECHNICAL_OFFICER"]}>
                <ChemicalWiseReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/usage"
            element={
              <ProtectedRoute roles={["ADMIN", "TECHNICAL_OFFICER"]}>
                <UsageReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sds/library"
            element={<ViewSdsLibrary />}
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
