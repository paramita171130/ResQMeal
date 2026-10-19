import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DonorDashboard from "@/pages/DonorDashboard";
import DonationDetail from "@/pages/DonationDetail";
import RecipientDashboard from "@/pages/RecipientDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import { Dashboard, NotFound, Privacy, Terms } from "@/pages/Misc";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/donor" element={<DonorDashboard />} />
        <Route path="/donations/:id" element={<DonationDetail />} />
        <Route path="/recipient" element={<RecipientDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster richColors position="bottom-right" />
    </>
  );
}
