import { PipelineValidationTest } from '@rapport/memory';
import { WritingStyleTest, ReplyQualityTest, ConversationIntelligenceTest } from '@rapport/ai-core';

async function main() {
  console.log('====================================================');
  console.log('RAPPORT AI — UNIFIED TEST SUITE RUNNER');
  console.log('====================================================\n');

  let allPassed = true;
  const startTime = Date.now();

  // 1. Pipeline & Memories validation
  console.log('----------------------------------------------------');
  console.log('🧠 Running Pipeline & Memories Validation Tests...');
  console.log('----------------------------------------------------');
  try {
    const pipelineResults = await PipelineValidationTest.runAllTests();
    console.log(`Summary: ${pipelineResults.passCount} passed, ${pipelineResults.failCount} failed.`);
    pipelineResults.results.forEach((r) => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`  ${icon} [${r.durationMs}ms] ${r.testName}`);
      if (r.details) {
        console.log(`     Details: ${r.details}`);
      }
    });
    if (pipelineResults.failCount > 0) {
      allPassed = false;
    }
  } catch (err) {
    console.error('❌ Failed running Pipeline & Memories Validation Tests:', err);
    allPassed = false;
  }
  console.log();

  // 2. Writing Style tests
  console.log('----------------------------------------------------');
  console.log('✍️ Running Writing Style Analyzer Tests...');
  console.log('----------------------------------------------------');
  try {
    const styleResults = WritingStyleTest.runTests();
    console.log(`Passed: ${styleResults.passed ? 'Yes ✅' : 'No ❌'}`);
    for (const [name, r] of Object.entries(styleResults.results)) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`  ${icon} ${name}`);
      if (r.details) {
        console.log(`     Details: ${r.details}`);
      }
    }
    if (!styleResults.passed) {
      allPassed = false;
    }
  } catch (err) {
    console.error('❌ Failed running Writing Style Analyzer Tests:', err);
    allPassed = false;
  }
  console.log();

  // 3. Reply Quality tests
  console.log('----------------------------------------------------');
  console.log('🎭 Running Reply Quality Evaluator Tests...');
  console.log('----------------------------------------------------');
  try {
    const qualityResults = ReplyQualityTest.runTests();
    console.log(`Passed: ${qualityResults.passed ? 'Yes ✅' : 'No ❌'}`);
    for (const [name, r] of Object.entries(qualityResults.results)) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`  ${icon} ${name} (Score: ${r.score}/100, Valid: ${r.isValid})`);
      if (r.issues && r.issues.length > 0) {
        console.log(`     Issues: ${r.issues.join(', ')}`);
      }
      if (r.details) {
        console.log(`     Details: ${r.details}`);
      }
    }
    if (!qualityResults.passed) {
      allPassed = false;
    }
  } catch (err) {
    console.error('❌ Failed running Reply Quality Evaluator Tests:', err);
    allPassed = false;
  }
  console.log();

  // 4. Conversation Intelligence tests
  console.log('----------------------------------------------------');
  console.log('💬 Running Conversation Intelligence Tests...');
  console.log('----------------------------------------------------');
  try {
    const intelligenceResults = ConversationIntelligenceTest.runTests();
    console.log(`Passed: ${intelligenceResults.passed ? 'Yes ✅' : 'No ❌'}`);
    for (const [name, r] of Object.entries(intelligenceResults.results)) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`  ${icon} ${name}`);
      console.log(`     Stage: "${r.stage}" | Topic: "${r.topic}" | Emotion: "${r.primaryEmotion}" | Urgency: "${r.urgency}"`);
      console.log(`     Sentiment: "${r.sentiment}" | Dominant: "${r.dominantParticipant}" | HealthScore: ${r.healthScore}`);
      if (r.details) {
        console.log(`     Details: ${r.details}`);
      }
    }
    if (!intelligenceResults.passed) {
      allPassed = false;
    }
  } catch (err) {
    console.error('❌ Failed running Conversation Intelligence Tests:', err);
    allPassed = false;
  }
  console.log();

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('====================================================');
  if (allPassed) {
    console.log(`🎉 ALL TEST SUITES PASSED! (Total time: ${durationSec}s)`);
    console.log('====================================================');
    process.exit(0);
  } else {
    console.log(`❌ SOME TEST SUITES FAILED! (Total time: ${durationSec}s)`);
    console.log('====================================================');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled test execution error:', err);
  process.exit(1);
});
