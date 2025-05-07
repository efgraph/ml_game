import { EvaluationResult } from '../utils/answerEvaluator';


export interface SubmitAnswerRequest {
  playerId: string;
  questionId: number;
  answer: string;
}

export interface SubmitAnswerResponse {
  success: boolean;
  evaluation: EvaluationResult;
}

export interface GetOpponentDataRequest {
  gameId?: string;
  questionId?: number;
}

export interface GetOpponentDataResponse {
  success: boolean;
  opponent: OpponentData;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface ApiQuestion {
  id: number;
  question: string;
  answer: string;
  topic?: string;
  context?: string;
}

export interface GenerateQuestionResponse {
  success: boolean;
  question: ApiQuestion;
}

export interface OpponentEvaluation {
  evaluation: string;
  score: number;
  feedback?: string;
}

export interface OpponentData {
  score: number;
  questionsAnswered: number;
  lastAnswer?: string;
  lastEvaluation?: OpponentEvaluation;
}

export interface GetOpponentDataParams {
  questionId: number;
  topic: string;
}

export interface ApiClient {
  getRandomTopic: () => string;
  getOpponentData: (params: GetOpponentDataParams) => Promise<GetOpponentDataResponse>;
  submitAnswer: (params: SubmitAnswerRequest) => Promise<SubmitAnswerResponse>;
  generateQuestion: (topic?: string) => Promise<GenerateQuestionResponse>;
} 