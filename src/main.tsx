import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyAccessibilityOnBoot } from './hooks/useAccessibility'

// Apply saved accessibility prefs before first React render so there's no flash
// of default styles before data-attributes kick in.
applyAccessibilityOnBoot();

createRoot(document.getElementById("root")!).render(<App />);
