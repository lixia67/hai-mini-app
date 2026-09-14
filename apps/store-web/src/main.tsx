import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <main><h1>胖竹门店管理端</h1><p>M1 foundation is running.</p></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
