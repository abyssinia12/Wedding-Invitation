import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import WeddingList from './pages/admin/WeddingList';
import CreateWedding from './pages/admin/CreateWedding';
import EditWedding from './pages/admin/EditWedding';
import GuestList from './pages/admin/GuestList';
import CreateGuest from './pages/admin/CreateGuest';
import Invitations from './pages/admin/Invitations';
import PublicInvitation from './pages/guest/PublicInvitation';
import InvitationStylesPreview from './pages/guest/InvitationStylesPreview';
import AdminSidebar from './components/AdminSidebar';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Admin routes with Sidebar Navigation */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminSidebar>
              <AdminDashboard />
            </AdminSidebar>
          }
        />
        <Route
          path="/admin/weddings"
          element={
            <AdminSidebar>
              <WeddingList />
            </AdminSidebar>
          }
        />
        <Route
          path="/admin/create-wedding"
          element={
            <AdminSidebar>
              <CreateWedding />
            </AdminSidebar>
          }
        />
        <Route
          path="/admin/edit-wedding/:id"
          element={
            <AdminSidebar>
              <EditWedding />
            </AdminSidebar>
          }
        />
        <Route
          path="/admin/wedding/:weddingId/guests"
          element={
            <AdminSidebar>
              <GuestList />
            </AdminSidebar>
          }
        />
        <Route
          path="/admin/wedding/:weddingId/guests/create"
          element={
            <AdminSidebar>
              <CreateGuest />
            </AdminSidebar>
          }
        />
        <Route
          path="/admin/wedding/:weddingId/invitations"
          element={
            <AdminSidebar>
              <Invitations />
            </AdminSidebar>
          }
        />

        {/* Public Guest Personalized Invitation Route */}
        <Route path="/invite/:token" element={<PublicInvitation />} />

        {/* Invitation Styles Preview Route (first, second, thered) */}
        <Route path="/invitation-styles" element={<InvitationStylesPreview />} />
        <Route path="/invite-preview" element={<InvitationStylesPreview />} />

        {/* Default Redirects */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
