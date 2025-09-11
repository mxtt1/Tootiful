import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import './admin.css';

export default function AdminLayout() {
  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="brand">Tutiful</div>
        <nav>
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/users">User Management</Link>
          <Link to="/admin/media">Media</Link>
          <Link to="/admin/pages">Pages</Link>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <h2>User Management</h2>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}