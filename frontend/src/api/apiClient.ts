import { AnswerEvaluation } from '../utils/answerEvaluator';
import { ApiClient, GenerateQuestionResponse, GetOpponentDataResponse, SubmitAnswerRequest, GetOpponentDataParams, SubmitAnswerResponse } from './types';

const API_BASE_URL = 'http://localhost:8000/v1';

export const TOPICS = [
    'mean', 'median', 'mode', 'variance', 'standard deviation', 'normal distribution',
    'z-score', 'probability', 'sampling', 'confidence interval', 't-test',
    'chi-square test', 'hypothesis testing', 'correlation', 'regression',
    'linear regression', 'logistic regression', 'outliers', 'skewness',
    'descriptive statistics', 'inference', 'statistical significance',
    'random sampling', 'data distribution', 'histograms', 'percentiles',
    'quartiles', 'scatter plots', 'Bayesian inference', 'p-values',
    'Type I error', 'Type II error', 'confidence levels', 'sample size',
    'response bias', 'non-response bias', "students t-distribution",
    'degrees of freedom', 'z-table', 't-table', 'left-tailed test',
    'frequency distribution', 'relative frequency', 'cumulative frequency',
    'mutually exclusive events', 'independent events', 'dependent events',
    'conditional probability', "Bayes' theorem", 'random variables',
    'discrete random variables', 'continuous random variables', 'expected value',
    'Bernoulli distribution', 'Binomial distribution', 'Poisson distribution',
    'Geometric distribution', 'Uniform distribution', 'Exponential distribution',
    'Beta distribution', 'Gamma distribution', 'joint probability',
    'counting principles', 'permutations', 'combinations',
    'cross-validation', 'train-test split', 'feature selection', 'bagging',
    'boosting', 'ensemble learning', 'data leakage', 'confusion matrix',
    'precision and recall', 'F1 score', 'ROC curve', 'AUC',
    'classification threshold', 'covariance matrix', 'bootstrap',
    'principal component analysis'
];

interface QAEntry {
  topic: string;
  question: string;
  answer: string;
}

let cachedQaEntries: QAEntry[] | null = null;

async function loadQaData(): Promise<QAEntry[]> {
  if (cachedQaEntries) {
    return cachedQaEntries;
  }
  try {
    const response = await fetch('/assets/qa_simple.jsonl');
    if (!response.ok) {
      throw new Error(`Failed to fetch qa_simple.jsonl: ${response.statusText}`);
    }
    const text = await response.text();
    cachedQaEntries = text.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line) as QAEntry);
    return cachedQaEntries;
  } catch (error) {
    console.error('Error loading or parsing qa_simple.jsonl:', error);
    cachedQaEntries = [];
    return cachedQaEntries;
  }
}

const convertScoreToEvaluation = (score: number): AnswerEvaluation => {
  if (score >= 3) return AnswerEvaluation.CORRECT;
  if (score >= 2) return AnswerEvaluation.PARTIALLY_CORRECT;
  return AnswerEvaluation.INCORRECT;
};

export const apiClient: ApiClient = {
  getRandomTopic: () => {
    const randomIndex = Math.floor(Math.random() * TOPICS.length);
    return TOPICS[randomIndex];
  },

  getOpponentData: async (params: GetOpponentDataParams): Promise<GetOpponentDataResponse> => {
    await loadQaData();

    const { questionId, topic } = params;
    let opponentAnswer = "I'm not sure about that topic."; // Default fallback
    let opponentEvaluationResult: "CORRECT" | "INCORRECT" = "INCORRECT";

    if (cachedQaEntries && cachedQaEntries.length > 0) {
      const normalizedTopic = topic.toLowerCase();
      const topicCandidates = cachedQaEntries.filter(entry => 
        entry.topic && entry.topic.toLowerCase() === normalizedTopic
      );

      if (topicCandidates.length > 0) {
        const randomIndex = Math.floor(Math.random() * topicCandidates.length);
        opponentAnswer = topicCandidates[randomIndex].answer;
        opponentEvaluationResult = "CORRECT";
        console.log(`Opponent found answer for topic '${topic}': "${opponentAnswer}"`);
      } else {
        console.log(`No entries for topic: '${topic}'`);
      }
    }

    const opponentScoreContribution = opponentEvaluationResult === "CORRECT" ? 1 : 0;
    
    const baseScores = [0, 0, 1, 1, 1, 2];
    const baseAnsweredCount = [0, 1, 2, 3, 4, 5];

    let currentOpponentScore = baseScores[Math.min(questionId -1 , baseScores.length -1)] + opponentScoreContribution;
    if (questionId > 1 && opponentEvaluationResult === "INCORRECT") {
        currentOpponentScore = baseScores[Math.min(questionId -1 , baseScores.length -1)];
    }
    if (questionId === 1 && opponentEvaluationResult === "INCORRECT") {
        currentOpponentScore = 0;
    }


    const opponentQuestionsAnswered = baseAnsweredCount[Math.min(questionId, baseAnsweredCount.length -1)];

    return new Promise<GetOpponentDataResponse>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          opponent: {
            score: currentOpponentScore,
            questionsAnswered: opponentQuestionsAnswered, 
            lastAnswer: opponentAnswer,
            lastEvaluation: {
              evaluation: opponentEvaluationResult,
              score: opponentScoreContribution,
              feedback: opponentEvaluationResult === "CORRECT" ? "Opponent seems confident!" : "Opponent is unsure."
            }
          }
        });
      }, 300); 
    });
  },
  
  submitAnswer: async (params: SubmitAnswerRequest): Promise<SubmitAnswerResponse> => {
    try {
      const questionForBackend = `Question ID: ${params.questionId}`; 
      
      const requestData = {
        question: questionForBackend, 
        student_answer: params.answer,
        ref_answers: ['', ''] 
      };
      
      console.log('Request data to /classify_answer:', requestData);
      
      const response = await fetch(`${API_BASE_URL}/classify_answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData),
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}): ${errorText}`);
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Answer evaluation response:', data);
      
      const predictedScore = data.predicted_score;
      console.log('Predicted score:', predictedScore);
      
      if (predictedScore === undefined || predictedScore === null) {
        throw new Error('No predicted_score in API response');
      }
      
      const evaluationStatus: AnswerEvaluation = convertScoreToEvaluation(predictedScore);
      
      const feedbackMessages = {
        [AnswerEvaluation.CORRECT]: 'Excellent! Your answer is correct.',
        [AnswerEvaluation.PARTIALLY_CORRECT]: 'Good attempt! Your answer is partially correct.',
        [AnswerEvaluation.INCORRECT]: 'Not quite right. Try again next time.'
      };
      
      return {
        success: true,
        evaluation: {
          evaluation: evaluationStatus,
          score: predictedScore,
          feedback: feedbackMessages[evaluationStatus]
        }
      };
    } catch (error) {
      console.error('Error evaluating answer:', error);

      const isCorrect = params.answer.length > 10;

      return {
        success: false,
        evaluation: {
          evaluation: isCorrect ? AnswerEvaluation.CORRECT : AnswerEvaluation.INCORRECT,
          score: isCorrect ? 1 : 0,
          feedback: isCorrect ? 'Your answer is correct.' : 'Please provide more details.'
        }
      };
    }
  },

  generateQuestion: async (topic?: string): Promise<GenerateQuestionResponse> => {
    const questionTopic = topic || apiClient.getRandomTopic(); 
    try {
      console.log(`Fetching question for topic: ${questionTopic}`);
      const response = await fetch(`${API_BASE_URL}/generate_question?topic=${encodeURIComponent(questionTopic)}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error ${response.status}: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json(); 
      console.log('API Response:', data);
      const questionText = data.generated_question || `What is ${questionTopic}?`;
      console.log('Using question:', questionText);
      return {
        success: true,
        question: {
          id: Math.floor(Math.random() * 1000),
          question: questionText,
          answer: "",
          topic: data.topic || questionTopic,
          context: data.context || "No context available."
        }
      };
    } catch (error) {
      console.error(`Error fetching question for topic ${questionTopic}:`, error);
      const fallbackQuestions: { [key: string]: string } = {
        'mode': 'What is the mode in statistics?',
        'bagging': 'Explain the concept of bagging in machine learning.',
        'mean': 'How is the arithmetic mean calculated?',
        'probability': 'Define conditional probability.'
      };
      const question = fallbackQuestions[questionTopic] || `What is ${questionTopic}?`;
      return {
        success: false,
        question: {
          id: Math.floor(Math.random() * 1000),
          question: question,
          answer: "",
          topic: questionTopic,
          context: "Failed to load context."
        }
      };
    }
  }
};

export default apiClient; 