import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface QAEntry {
  topic: string;
  question: string;
  answer: string;
}

const qaFilePath = path.resolve('public/assets/qa_simple.jsonl');
const qaEntries: QAEntry[] = fs.readFileSync(qaFilePath, 'utf-8')
  .split('\n')
  .filter(line => line.trim() !== '')
  .map(line => JSON.parse(line) as QAEntry);

function getWordSet(text: string): Set<string> {
  return new Set((text || '').toLowerCase().match(/\b(\w+)\b/g) || []);
}

function countCommonWords(set1: Set<string>, set2: Set<string>): number {
  let commonCount = 0;
  for (const word of set1) {
    if (set2.has(word)) {
      commonCount++;
    }
  }
  return commonCount;
}

function findBestAnswer(currentTopic: string, currentGameQuestion: string, allQaEntries: QAEntry[]): string {
  const normalizedCurrentTopic = (currentTopic || '').toLowerCase();
  const topicCandidates = allQaEntries.filter(entry => (entry.topic || '').toLowerCase() === normalizedCurrentTopic);

  if (topicCandidates.length === 0) {
    return "No answer found for topic.";
  }

  const gameQuestionWords = getWordSet(currentGameQuestion);
  let bestMatch: QAEntry | null = null;
  let maxCommonWords = -1;

  for (const candidate of topicCandidates) {
    const candidateQuestionWords = getWordSet(candidate.question);
    const commonWords = countCommonWords(gameQuestionWords, candidateQuestionWords);

    if (commonWords > maxCommonWords) {
      maxCommonWords = commonWords;
      bestMatch = candidate;
    }
  }

  if (bestMatch && maxCommonWords > 0) {
    return bestMatch.answer;
  } else {
    return "Unable to determine an answer.";
  }
}

test.describe('Gameplay Video Recording', () => {
  test('should record a gameplay session', async ({ page }) => {
    test.setTimeout(180000);

    await page.goto('http://localhost:5173');
    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(page.getByLabel('Your Name:')).toBeVisible();
    await page.getByLabel('Your Name:').fill('Шурик');
    await page.getByRole('button', { name: 'Start Game' }).click();
    
    await expect(page.getByRole('button', { name: 'Loading...' })).toBeHidden({ timeout: 60000 }); 

    const numberOfQuestions = 5;
    for (let i = 0; i < numberOfQuestions; i++) {
      const answerInput = page.getByPlaceholder('Type your answer...');
      await expect(answerInput).toBeVisible({ timeout: 20000 });

      const topicElement = page.getByText(/Topic:/i);
      await expect(topicElement).toBeVisible();
      const topicTextContent = await topicElement.textContent();
      const currentTopic = (topicTextContent || '').replace(/Topic:/i, '').trim();
      
      const questionElement = topicElement.locator('xpath=following-sibling::p[1]');
      await expect(questionElement).toBeVisible();
      const currentGameQuestion = (await questionElement.textContent() || '').trim();

      if (i === 1 || i === 3) { 
        const flipCard = page.locator('.flip-card');
        await expect(flipCard).toBeVisible();
        await flipCard.click();
        await page.waitForTimeout(3000);
        await flipCard.click(); 
        await page.waitForTimeout(500);
      }

      await page.waitForTimeout(2000);

      const answerFromQA = findBestAnswer(currentTopic, currentGameQuestion, qaEntries);

      await answerInput.fill(answerFromQA);

      await page.waitForTimeout(4000);

      const submitButton = page.getByRole('button', { name: 'Submit' });
      await expect(submitButton).toBeEnabled({ timeout: 10000 });
      await submitButton.click();

      if (i < numberOfQuestions - 1) {
        await page.waitForTimeout(3000);
      } else {
        await page.waitForTimeout(2000);
      }
    }

    await expect(page.getByRole('heading', { name: /Game Over/i })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);
  });
}); 