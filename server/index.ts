import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { LLMOrchestrator } from './llmOrchestrator';

dotenv.config();

const app = express();
const START_PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// 1. Health & Config Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'MeetPersona AI Express & Gemini Orchestration Engine',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY)
  });
});

// 2. Available Models Endpoint
app.get('/api/models', (req, res) => {
  const models = LLMOrchestrator.getAvailableModels();
  res.json({ models });
});

// 3. Persona Alignment Response Endpoint (Gemini / OpenRouter Orchestration)
app.post('/api/persona/response', async (req, res) => {
  try {
    const { persona, contextPrompt, recentTranscripts, selectedModel, targetDurationSec, userApiKey } = req.body;
    
    if (!persona || !contextPrompt) {
      return res.status(400).json({ error: 'Missing persona profile or context prompt' });
    }

    const result = await LLMOrchestrator.generateResponse(
      persona,
      contextPrompt,
      recentTranscripts || [],
      selectedModel || 'gemini-1.5-flash',
      targetDurationSec || 45,
      userApiKey
    );

    res.json({
      responseText: result.responseText,
      topicAddressed: result.topicAddressed,
      alignmentConfidence: result.alignmentConfidence,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
      targetDurationSec: targetDurationSec || 45,
      vocalizedAudioUrl: `audio_stream_${Date.now()}.mp3`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Express API Persona Error:', error);
    res.status(500).json({ error: error?.message || 'Internal LLM persona orchestration error' });
  }
});

// 4. Alignment Scorer Endpoint
app.post('/api/persona/evaluate-alignment', (req, res) => {
  const { responseText, persona, topicPrompt } = req.body;
  if (!responseText || !persona) {
    return res.status(400).json({ error: 'Missing responseText or persona object' });
  }
  const scoreResult = LLMOrchestrator.calculateAlignmentScore(responseText, persona, topicPrompt || '');
  res.json({ alignmentScore: scoreResult.score, matchedTraits: scoreResult.matchedTraits, calculatedAt: new Date().toISOString() });
});

// 5. STT Transcript Processing Endpoint
app.post('/api/transcript/process', (req, res) => {
  const { text, personaName } = req.body;
  const textLower = String(text || '').toLowerCase();
  const nameLower = String(personaName || '').toLowerCase();

  const isTriggered = nameLower && textLower.includes(nameLower);

  res.json({
    processed: true,
    isBotTriggered: isTriggered,
    detectedKeywords: isTriggered ? [personaName] : []
  });
});

// Participant Feedback Ingress Endpoint
app.post('/api/feedback', (req, res) => {
  const { responseId, alignmentScore } = req.body;
  res.json({
    success: true,
    feedbackId: `fb-${Date.now()}`,
    loggedAt: new Date().toISOString(),
    message: `Feedback recorded for response ${responseId} with score ${alignmentScore}/5.`
  });
});

/**
 * Checks if a port is in use and recursively finds the next available port.
 */
function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${startPort} in use, trying port ${startPort + 1}...`);
        resolve(findAvailablePort(startPort + 1));
      } else {
        resolve(startPort);
      }
    });
    tester.once('listening', () => {
      tester.close(() => resolve(startPort));
    });
    tester.listen(startPort, '0.0.0.0');
  });
}

async function startServer() {
  const port = await findAvailablePort(START_PORT);
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`⚡ MeetPersona AI Express & Gemini Orchestrator listening on http://0.0.0.0:${port}`);
    
    try {
      const baseDir = (import.meta as any).dirname || process.cwd();
      fs.writeFileSync(path.resolve(baseDir, '../.server-port'), String(port));
    } catch (e) {
      console.warn('Could not write .server-port file:', e);
    }
  });
}

startServer();
