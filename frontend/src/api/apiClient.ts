import { AnswerEvaluation } from '../utils/answerEvaluator';
import { ApiClient, GenerateQuestionResponse, GetOpponentDataResponse, SubmitAnswerResponse } from './types';

const API_BASE_URL = 'http://localhost:8000/v1';

export const TOPICS = ['mode', 'bagging', 'mean', 'roc curve', 'probability'];

export const getRandomTopic = (): string => {
  const randomIndex = Math.floor(Math.random() * TOPICS.length);
  return TOPICS[randomIndex];
};

const parseQuestionResponse = (responseData: any): string => {
  try {
    const responseText = responseData.question;
    const match = responseText.match(/'generated_question': '([^']+)'/);
    if (match && match[1]) {
      return match[1];
    }
    return 'What is machine learning?';
  } catch (error) {
    console.error('Error parsing question response:', error);
    return 'What is machine learning?';
  }
};

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

  getOpponentData: async (params: { questionId: number }): Promise<GetOpponentDataResponse> => {
    const predictableResponses = [
      null,
      {
        score: 0,
        questionsAnswered: 1,
        lastAnswer: "Neural networks",
        lastEvaluation: {
          evaluation: "INCORRECT",
          score: 0,
          feedback: "That's not quite right."
        }
      },
      {
        score: 1,
        questionsAnswered: 2,
        lastAnswer: "Taking multiple samples with replacement",
        lastEvaluation: {
          evaluation: "CORRECT",
          score: 1,
          feedback: "Correct! Bagging involves sampling with replacement."
        }
      },
      {
        score: 1,
        questionsAnswered: 3,
        lastAnswer: "Sum of values divided by count",
        lastEvaluation: {
          evaluation: "CORRECT",
          score: 0,
          feedback: "That's the basic definition of mean."
        }
      },
      {
        score: 1,
        questionsAnswered: 4,
        lastAnswer: "Likelihood of an event occurring",
        lastEvaluation: {
          evaluation: "PARTIALLY_CORRECT",
          score: 0,
          feedback: "That's a basic explanation, but not fully complete."
        }
      },
      {
        score: 2,
        questionsAnswered: 5,
        lastAnswer: "Receiver Operating Characteristic curve measures classifier performance",
        lastEvaluation: {
          evaluation: "CORRECT",
          score: 1,
          feedback: "Excellent answer!"
        }
      }
    ];
    
    const questionIndex = Math.min(params.questionId, predictableResponses.length - 1);
    const responseData = predictableResponses[questionIndex];
    
    return new Promise<GetOpponentDataResponse>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          opponent: {
            score: responseData?.score || 0,
            questionsAnswered: responseData?.questionsAnswered || 0,
            lastAnswer: responseData?.lastAnswer,
            lastEvaluation: responseData?.lastEvaluation
          }
        });
      }, 300);
    });
  },
  
  submitAnswer: async (params: {
    playerId: string; 
    questionId: number; 
    answer: string;
    questionText?: string;
  }): Promise<SubmitAnswerResponse> => {
    try {
      console.log(`Evaluating answer for question ID ${params.questionId}: "${params.answer}"`);
      
      const questionText = params.questionText || `Question ${params.questionId}`;
      
      const requestData = {
        question: questionText,
        student_answer: params.answer,
        ref_answers: ['', '']
      };
      
      console.log('Request data:', requestData);
      
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
      
      const evaluation: AnswerEvaluation = convertScoreToEvaluation(predictedScore);
      
      const normalizedScore = evaluation === AnswerEvaluation.CORRECT ? 1 : 0;
      
      const feedbackMessages = {
        [AnswerEvaluation.CORRECT]: 'Excellent! Your answer is correct.',
        [AnswerEvaluation.PARTIALLY_CORRECT]: 'Good attempt! Your answer is partially correct.',
        [AnswerEvaluation.INCORRECT]: 'Not quite right. Try again next time.'
      };
      
      return {
        success: true,
        evaluation: {
          evaluation,
          score: normalizedScore,
          feedback: feedbackMessages[evaluation]
        }
      };
    } catch (error) {
      console.error('Error evaluating answer:', error);
      
      console.log('Using predictable fallback evaluation...');
      
      const isCorrect = params.answer.length > 10;
      
      return {
        success: false,
        evaluation: {
          evaluation: isCorrect ? AnswerEvaluation.CORRECT : AnswerEvaluation.INCORRECT,
          score: isCorrect ? 1 : 0,
          feedback: isCorrect ? 
            'Your detailed answer appears to be correct.' : 
            'Your answer is too brief to be correct. Please provide more details.'
        }
      };
    }
  },

  generateQuestion: async (topic?: string): Promise<GenerateQuestionResponse> => {
    const questionTopic = topic || getRandomTopic();
    
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
      
      const questionText = parseQuestionResponse(data);
      console.log('Parsed question:', questionText);
      
      return {
        success: true,
        question: {
          id: Math.floor(Math.random() * 1000),
          question: questionText,
          answer: "",
          topic: questionTopic
        }
      };
    } catch (error) {
      console.error(`Error fetching question for topic ${questionTopic}:`, error);
      
      const fallbackQuestions = {
        'mode': 'What is the mode in statistics?',
        'bagging': 'Explain the concept of bagging in machine learning.',
        'mean': 'How is the arithmetic mean calculated?',
        'roc curve': 'What does the ROC curve represent in machine learning?',
        'probability': 'Define conditional probability.'
      };
      
      const question = fallbackQuestions[questionTopic as keyof typeof fallbackQuestions] || 
                      `What is ${questionTopic}?`;
      
      return {
        success: false,
        question: {
          id: Math.floor(Math.random() * 1000),
          question: question,
          answer: "",
          topic: questionTopic
        }
      };
    }
  }
};

export default apiClient; 