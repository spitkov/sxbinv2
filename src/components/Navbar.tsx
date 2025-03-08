'use client';
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const handleLogout = async () => {
    await logout();
  };
  return (
    <nav className="bg-[#1a1a1a] border-b border-[#333] py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white">
          sxbin.gay
        </Link>
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : user ? (
            <>
              <span className="text-gray-300">
                Welcome, <span className="font-medium">{user.username}</span>
              </span>
              <Link
                href="/dashboard"
                className="text-white bg-[#3b82f6] px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-white bg-[#333] px-4 py-2 rounded-lg hover:bg-[#444] transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-white hover:text-[#3b82f6] transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-white bg-[#3b82f6] px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 