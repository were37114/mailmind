import { useState } from 'react';
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

  return (
    <div className="app">
      <main className="container">
        <h1>MailMind</h1>
        <p>AI邮件第二大脑</p>
        <p>欢迎使用！您的邮件助手已就绪。</p>
      </main>
    </div>
  );
}

export default App;
