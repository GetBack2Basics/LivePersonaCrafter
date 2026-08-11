import { useState } from 'react';
import { Header } from './components/Header';
import { BentoGrid } from './components/BentoGrid';
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-12 selection:bg-indigo-500 selection:text-white">
      <Header
        state={state}
        onResetState={resetEngineState}
        onOpenGuide={() => setIsGuideOpen(true)}
      />
      <main>
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
      </main>
      <HowToUseGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}

export default App;
