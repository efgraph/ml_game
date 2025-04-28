export enum AnswerEvaluation {
  CORRECT = 'CORRECT',
  PARTIALLY_CORRECT = 'PARTIALLY_CORRECT',
  INCORRECT = 'INCORRECT'
}

export interface EvaluationResult {
  evaluation: AnswerEvaluation;
  score: number;
  feedback?: string;
}


export interface EvaluationOptions {
  fuzzyMatching?: boolean;
  similarityThreshold?: number;
  allowPartialMatch?: boolean;
  ignoreCase?: boolean;
}


export function evaluateAnswer(
  userAnswer: string, 
  correctAnswer: string,
  options: EvaluationOptions = {}
): EvaluationResult {
  const {
    fuzzyMatching = false,
    similarityThreshold = 0.8,
    allowPartialMatch = true,
    ignoreCase = true
  } = options;

  const normalizedUserAnswer = ignoreCase ? userAnswer.toLowerCase().trim() : userAnswer.trim();
  const normalizedCorrectAnswer = ignoreCase ? correctAnswer.toLowerCase().trim() : correctAnswer.trim();

  if (normalizedUserAnswer === normalizedCorrectAnswer) {
    return {
      evaluation: AnswerEvaluation.CORRECT,
      score: 1,
      feedback: "Correct!"
    };
  }

  if (allowPartialMatch) {
    if (normalizedCorrectAnswer.includes(normalizedUserAnswer) || 
        normalizedUserAnswer.includes(normalizedCorrectAnswer)) {
      
      return {
        evaluation: AnswerEvaluation.PARTIALLY_CORRECT,
        score: 0.5,
        feedback: "Partially correct. You're on the right track!"
      };
    }
    
    if (fuzzyMatching) {
      const similarity = calculateSimilarity(normalizedUserAnswer, normalizedCorrectAnswer);
      
      if (similarity >= similarityThreshold) {
        return {
          evaluation: AnswerEvaluation.PARTIALLY_CORRECT,
          score: similarity,
          feedback: "Close! You're on the right track."
        };
      }
    }
  }

  return {
    evaluation: AnswerEvaluation.INCORRECT,
    score: 0,
    feedback: "Incorrect. Try again!"
  };
}


function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  let matchCount = 0;
  
  for (const word of words1) {
    if (word.length > 2 && words2.includes(word)) {
      matchCount++;
    }
  }
  
  const totalDistinctWords = new Set([...words1, ...words2]).size;
  
  return totalDistinctWords > 0 ? matchCount / totalDistinctWords : 0;
} 