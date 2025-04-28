import { getRandomDelay } from './config';
import { AnswerEvaluation } from '../utils/answerEvaluator';
import { 
  SubmitAnswerRequest, 
  SubmitAnswerResponse, 
  GetOpponentDataRequest, 
  GetOpponentDataResponse 
} from './types';

const MOCK_QUESTIONS = [
  { id: 1, question: "What is the capital of France?", answer: "Paris" },
  { id: 2, question: "What is the largest planet in our solar system?", answer: "Jupiter" },
  { id: 3, question: "Who wrote 'Romeo and Juliet'?", answer: "William Shakespeare" },
  { id: 4, question: "What is the square root of 144?", answer: "12" },
  { id: 5, question: "What is the main component of Earth's atmosphere?", answer: "Nitrogen" }
];

let mockOpponentState = {
  id: 'player2',
  name: 'Балбес',
  score: 0,
  questionsAnswered: 0,
  lastAnswer: '' as string | undefined,
  lastEvaluation: undefined,
  activeOnQuestion: 0
};

const mockEvaluateAnswer = (userAnswer: string, correctAnswer: string): {
  evaluation: AnswerEvaluation,
  score: number,
  feedback: string
} => {
  const normalizedUserAnswer = userAnswer.toLowerCase().trim();
  const normalizedCorrectAnswer = correctAnswer.toLowerCase().trim();
  
  if (normalizedUserAnswer === normalizedCorrectAnswer) {
    return {
      evaluation: AnswerEvaluation.CORRECT,
      score: 1,
      feedback: "Correct!"
    };
  }
  
  if (normalizedCorrectAnswer.includes(normalizedUserAnswer) ||
      normalizedUserAnswer.includes(normalizedCorrectAnswer)) {
    return {
      evaluation: AnswerEvaluation.PARTIALLY_CORRECT,
      score: 0.5,
      feedback: "Partially correct. You're on the right track!"
    };
  }
  
  return {
    evaluation: AnswerEvaluation.INCORRECT,
    score: 0,
    feedback: "Incorrect. Try again!"
  };
};

export const submitAnswer = async (request: SubmitAnswerRequest): Promise<SubmitAnswerResponse> => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
  
  const question = MOCK_QUESTIONS.find(q => q.id === request.questionId);
  
  if (!question) {
    throw new Error(`Question with ID ${request.questionId} not found`);
  }
  
  const evaluationResult = mockEvaluateAnswer(request.answer, question.answer);
  
  return {
    success: true,
    evaluation: evaluationResult,
    correctAnswer: question.answer
  };
};

export const getOpponentData = async (request: GetOpponentDataRequest): Promise<GetOpponentDataResponse> => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
  
  if (request.questionId !== undefined && mockOpponentState.activeOnQuestion < request.questionId) {
    const questionIndex = request.questionId - 1;
    const currentQuestion = MOCK_QUESTIONS[questionIndex];
    
    const random = Math.random();
    let answer: string;
    let evaluation: any;
    
    if (random < 0.7) {
      answer = currentQuestion.answer;
      evaluation = {
        evaluation: AnswerEvaluation.CORRECT,
        score: 1,
        feedback: "Correct!"
      };
      mockOpponentState.score += 1;
    } else if (random < 0.9) {
      answer = currentQuestion.answer.substring(0, currentQuestion.answer.length / 2);
      evaluation = {
        evaluation: AnswerEvaluation.PARTIALLY_CORRECT,
        score: 0.5,
        feedback: "Partially correct."
      };
      mockOpponentState.score += 0.5;
    } else {
      const wrongAnswers = ["Not sure", "I don't know", "Maybe something else?"];
      answer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
      evaluation = {
        evaluation: AnswerEvaluation.INCORRECT,
        score: 0,
        feedback: "Incorrect."
      };
    }
    
    mockOpponentState = {
      ...mockOpponentState,
      questionsAnswered: request.questionId,
      lastAnswer: answer,
      lastEvaluation: evaluation,
      activeOnQuestion: request.questionId
    };
  }
  
  return {
    success: true,
    opponent: { ...mockOpponentState }
  };
}; 