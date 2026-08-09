import { Header } from './components/Header';
import { BentoGrid } from './components/BentoGrid';
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
    setState
  } = usePersonaEngine();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-12 selection:bg-indigo-500 selection:text-white">
      <Header state={state} onResetState={resetEngineState} />
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
        />
      </main>
    </div>
  );
}

export default App;
