'use client';

import React from 'react';

export function RefreshButton() {
  return (
    <button
      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      onClick={() => window.location.reload()}
    >
      Refresh Page
    </button>
  );
}