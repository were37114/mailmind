import { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import OnboardingWizard from './pages/OnboardingWizard';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (showOnboarding) {
    return (
      <div className="app">
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  return <MainLayout />;
}

export default App;
