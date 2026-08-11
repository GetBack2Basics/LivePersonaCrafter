import { useState } from 'react';
import { Header } from './components/Header';
import { BentoGrid } from './components/BentoGrid';
import { IssueTrackerPage } from './components/IssueTrackerPage';
import { HowToUseGuide } from './components/HowToUseGuide';
import { usePersonaEngine } from './hooks/usePersonaEngine';

export function App() {
  const {
    state,
    isSyncing,
    lastSyncStatus,
    selectedModel,
    setSelectedModel,
    addTranscriptEntry,
    switchActivePersona,
    triggerPersonaResponse,
    submitFeedback,
    toggleListening,
    resetEngineState,
    setState,
    addPersona,
    updatePersona
  } = usePersonaEngine();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'MATRIX' | 'ISSUES'>('MATRIX');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-12 selection:bg-indigo-500 selection:text-white">
      <Header
        state={state}
        onResetState={resetEngineState}
        onOpenGuide={() => setIsGuideOpen(true)}
        activeTab={activeMainTab}
        onTabChange={setActiveMainTab}
      />
      <main>
        {activeMainTab === 'MATRIX' ? (
          <BentoGrid
            state={state}
            onStateUpdate={setState}
            onSwitchPersona={switchActivePersona}
            onTriggerResponse={triggerPersonaResponse}
            onSubmitFeedback={submitFeedback}
            onToggleListening={toggleListening}
            onAddTranscript={addTranscriptEntry}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            syncStatus={lastSyncStatus}
            isSyncing={isSyncing}
            onAddPersona={addPersona}
            onUpdatePersona={updatePersona}
          />
        ) : (
          <IssueTrackerPage />
        )}
      </main>
      <HowToUseGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}

export default App;
