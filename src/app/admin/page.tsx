"use client";

import UserManagement from '@/components/UserManagement';

export default function AdminPage() {
  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 600 }}>Panel de Administración</h2>
      <UserManagement />
    </div>
  );
}
