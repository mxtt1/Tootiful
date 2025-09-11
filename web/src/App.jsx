import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import User from "./pages/userManagement";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/user" replace />} />
      <Route path="/user" element={<User />} />
    </Routes>
  );
}