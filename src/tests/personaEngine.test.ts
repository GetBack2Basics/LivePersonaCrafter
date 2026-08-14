import { 
  validateApiKey, 
  extractTopicFromPrompt, 
  calculateTargetWords, 
  buildSystemPrompt, 
  getOpenRouterModelId,
  calculateClientAlignmentScore,
  parseCoreQuestionFromJsonResponse
} from '../engine/storageProxy';
import { LLMOrchestrator } from '../../server/llmOrchestrator';
import { INITIAL_PERSONAS } from '../data/initialData';
import type { PersonaProfile } from '../types';

import { parseQuestionFromTranscript } from '../utils/transcriptParser';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== RUNNING LIVEPERSONACRAFTER ENGINE AUTOMATED TEST SUITE ===\n');

  // Test 1: API Key Validation for empty/missing key
  console.log('[Test Group 1: API Key Validation]');
  const emptyRes = await validateApiKey('', 'gemini');
  assert(!emptyRes.isValid, 'Empty API key should fail validation');
  assert(emptyRes.message.includes('API Key is empty'), 'Empty key message is clear');

  // Test 2: OpenRouter & Gemini Model ID Mapping
  console.log('\n[Test Group 2: Model Mapping & Catalog]');
  assert(getOpenRouterModelId('') === 'google/gemini-2.0-flash-lite-preview-02-05:free', 'Default model ID fallback to Gemini 2.0 Flash Lite Free');
  assert(getOpenRouterModelId('deepseek-r1-free') === 'deepseek/deepseek-r1:free', 'Model ID mapping for DeepSeek R1');
  assert(getOpenRouterModelId('gemini-2.5-flash') === 'google/gemini-2.5-flash', 'Model ID mapping for Gemini 2.5 Flash');
  assert(getOpenRouterModelId('gemini-2.0-flash') === 'google/gemini-2.0-flash-lite-preview-02-05:free', 'Model ID mapping for Gemini 2.0 Flash');
  assert(getOpenRouterModelId('meta-llama/llama-3.3-70b-instruct:free') === 'meta-llama/llama-3.3-70b-instruct:free', 'Pass-through model IDs containing slashes');

  const models = LLMOrchestrator.getAvailableModels();
  assert(models.length >= 12, 'Models catalog returns complete list of options including Gemini 2.5 Flash');
  assert(models.some(m => m.id === 'gemini-2.5-flash'), 'Gemini 2.5 Flash is present in catalog');
  assert(models.some(m => m.id === 'gemma-2-9b-free'), 'Default free Gemma model is present in catalog');

  // Test 2.5: Spoken Audio Transcript Question Parser
  console.log('\n[Test Group 2.5: Spoken Audio Transcript Question Parser]');
  const parsed1 = parseQuestionFromTranscript('Um, hey persona, can you tell me how to optimize 3D splat depth sorting?');
  assert(parsed1 === 'How to optimize 3D splat depth sorting?', 'Parses core question from conversational voice filler');
  const parsed2 = parseQuestionFromTranscript('I wanted to ask what is the best way to convert GDA94 to GDA2020?');
  assert(parsed2 === 'What is the best way to convert GDA94 to GDA2020?', 'Strips preamble and extracts question');

  // Test 2.6: JSON Schema Core Question Extraction Parser
  console.log('\n[Test Group 2.6: JSON Schema Core Question Extraction Parser]');
  const sampleJsonOutput = `\`\`\`json
{
  "core_question": "What happens—and how do we prepare—if AI becomes smarter than humans within the next 20 years?"
}
\`\`\``;
  const extractedQ = parseCoreQuestionFromJsonResponse(sampleJsonOutput);
  assert(extractedQ === 'What happens—and how do we prepare—if AI becomes smarter than humans within the next 20 years?', 'Extracts core_question cleanly from JSON schema response');

  // Test 3: Target Word & Token Calculation
  console.log('\n[Test Group 3: Duration & Token Budget Math]');
  const calc30 = calculateTargetWords(30);
  assert(calc30.targetWordCount === 80 && calc30.maxTokens === 220, '30s duration budget calculation');
  const calc60 = calculateTargetWords(60);
  assert(calc60.targetWordCount === 165 && calc60.maxTokens === 420, '60s duration budget calculation');

  // Test 4: Topic Extraction Logic
  console.log('\n[Test Group 4: Topic Extraction]');
  const topicTheology = extractTopicFromPrompt('How do we train separate AI models on Quran and Bible texts?');
  assert(topicTheology.includes('Comparative Literature & Theological Texts'), 'Extract theological comparative analysis topic');

  const topicSplat = extractTopicFromPrompt('How do we handle GPU WebWorker depth sorting for 3D Gaussian Splatting?');
  assert(topicSplat.includes('3D Gaussian Splatting'), 'Extract 3D Gaussian Splatting topic');

  const topicSpatial = extractTopicFromPrompt('What is the best way to convert GDA94 to GDA2020 spatial coordinates?');
  assert(topicSpatial.includes('Spatial Querying'), 'Extract Spatial GIS topic');

  // Test 5: Dynamic Alignment Scoring
  console.log('\n[Test Group 5: Dynamic Alignment Scoring]');
  const samplePersona: PersonaProfile = INITIAL_PERSONAS[0];
  
  const scoreEmpty = LLMOrchestrator.calculateAlignmentScore('', samplePersona, 'topic');
  assert(scoreEmpty.score === 0, 'Empty response scores 0 alignment');

  const sampleResponse = "Let's get back to basics and solve the core spatial data bottleneck using offline-first local persistence and IndexedDB R-Tree indexes rather than complex cloud gateways.";
  const scoreResult = LLMOrchestrator.calculateAlignmentScore(sampleResponse, samplePersona, 'topic', 45);
  assert(scoreResult.score >= 65, `Dynamic alignment score calculation (${scoreResult.score}/100)`);
  assert(scoreResult.matchedTraits.length > 0, 'Matched persona traits detected');

  const clientScore = calculateClientAlignmentScore(sampleResponse, samplePersona, 45);
  assert(clientScore >= 65, `Client alignment score calculation (${clientScore}/100)`);

  // Test 6: System Prompt Generation
  console.log('\n[Test Group 6: System Prompt Engineering]');
  const prompt = buildSystemPrompt(samplePersona, [], 45, 'Sample prompt');
  assert(prompt.includes('GetBack2Basics'), 'System prompt includes persona name');
  assert(prompt.includes('CRITICAL LENGTH RULE') || prompt.includes('TARGET LENGTH'), 'System prompt includes duration target directive');

  // Test 7: Persona Profile & Key Validation Security Rejection
  console.log('\n[Test Group 7: Persona Generation Security & Key Rejection]');
  try {
    await LLMOrchestrator.generatePersonaFromProfile('too short', 'AIzaTestValidKey123456');
    assert(false, 'Short profile text should throw error');
  } catch (err: any) {
    assert(err.message.includes('Insufficient profile details'), 'Rejects profile text under 20 chars with clear error message');
  }

  try {
    await LLMOrchestrator.generatePersonaFromProfile('Valid detailed persona profile bio text for testing key enforcement requirement');
    assert(false, 'Missing API key should throw error');
  } catch (err: any) {
    assert(err.message.includes('required'), 'Rejects profile generation when user API key is missing');
  }

  console.log(`\n=== TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
