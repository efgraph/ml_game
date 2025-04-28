import { createContext, useContext } from 'react';
import { makeAutoObservable, runInAction, action as mobxAction } from 'mobx';
import apiClient from '../api/apiClient';
import { EvaluationResult, AnswerEvaluation, EvaluationOptions } from '../utils/answerEvaluator';

interface Question {
  id: number;
  question: string;
  answer: string;
  topic?: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  questionsAnswered: number;
  lastAnswer?: string;
  lastEvaluation: EvaluationResult | null;
}

export enum GameState {
  INITIAL = 'INITIAL',
  SETTINGS = 'SETTINGS',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface GameSettings {
  questionTimeLimit: number;
  numberOfPlayers: number;
}

class GameStore {
  gameState: GameState = GameState.INITIAL;
  
  settings: GameSettings = {
    questionTimeLimit: 30,
    numberOfPlayers: 2
  };
  
  currentPlayerId: string = 'player1';
  players: Map<string, Player> = new Map();
  currentQuestionIndex: number = 0;
  isLoading: boolean = false;
  
  timeRemaining: number = 30;
  timerActive: boolean = false;
  private timerInterval: number | null = null;
  
  questions: Question[] = [];
  
  isLoadingQuestion: boolean = false;
  
  evaluationOptions: EvaluationOptions = {
    fuzzyMatching: true,
    similarityThreshold: 0.7,
    allowPartialMatch: true,
    ignoreCase: true
  };

  private opponentPollingInterval: number | null = null;

  private _pendingPlayerName: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }
  
  async initializeGame(): Promise<void> {
    this.stopTimer();
    if (this.opponentPollingInterval) {
      clearInterval(this.opponentPollingInterval);
      this.opponentPollingInterval = null;
    }
    
    this.currentQuestionIndex = 0;
    this.players.clear();
    
    this.players.set('player1', {
      id: 'player1',
      name: this._pendingPlayerName || 'Шурик',
      score: 0,
      questionsAnswered: 0,
      lastEvaluation: null
    });
    
    this._pendingPlayerName = null;
    
    const playerNames = ['Балбес', 'Бывалый', 'Трус'];
    
    for (let i = 1; i < this.settings.numberOfPlayers; i++) {
      this.players.set(`player${i+1}`, {
        id: `player${i+1}`,
        name: playerNames[i-1],
        score: 0,
        questionsAnswered: 0,
        lastEvaluation: null
      });
    }
    
    this.timeRemaining = this.settings.questionTimeLimit;
    
    await this.loadQuestions();
    
    this.startPollingOpponentData();
  }
  
  async loadQuestions(): Promise<void> {
    this.isLoadingQuestion = true;
    this.questions = [];
    
    try {
      console.log('Starting to load questions from API...');
      
      const numberOfQuestions = 5;
      const loadedQuestions: Question[] = [];
      
      for (let i = 0; i < numberOfQuestions; i++) {
        const topic = apiClient.getRandomTopic();
        console.log(`Loading question ${i+1}/${numberOfQuestions}, topic: ${topic}`);
        
        try {
          const result = await apiClient.generateQuestion(topic);
          
          if (result.success) {
            const question = {
              ...result.question,
              id: i + 1
            };
            loadedQuestions.push(question);
            console.log(`Question ${i+1} loaded:`, question.question);
          } else {
            console.warn(`Failed to load question ${i+1}, using fallback`);
            loadedQuestions.push({
              ...result.question,
              id: i + 1
            });
          }
        } catch (err) {
          console.error(`Error loading question ${i+1}:`, err);
          loadedQuestions.push({
            id: i + 1,
            question: `Question ${i+1}: What is ${topic}?`,
            answer: "",
            topic: topic
          });
        }
      }
      
      runInAction(() => {
        if (loadedQuestions.length > 0) {
          this.questions = loadedQuestions;
          console.log(`Successfully loaded ${loadedQuestions.length} questions`);
        } else {
          console.warn('No questions loaded from API, using default questions');
          this.questions = this.getDefaultQuestions();
        }
        this.isLoadingQuestion = false;
      });
    } catch (error) {
      console.error('Error in loadQuestions:', error);
      
      runInAction(() => {
        console.warn('Error loading questions, using default questions');
        this.questions = this.getDefaultQuestions();
        this.isLoadingQuestion = false;
      });
    }
  }
  
  private getDefaultQuestions(): Question[] {
    return [
      {
        id: 1,
        question: "What is the capital of France?",
        answer: "Paris"
      },
      {
        id: 2,
        question: "What is the largest planet in our solar system?",
        answer: "Jupiter"
      },
      {
        id: 3,
        question: "Who wrote 'Romeo and Juliet'?",
        answer: "William Shakespeare"
      },
      {
        id: 4,
        question: "What is the square root of 144?",
        answer: "12"
      },
      {
        id: 5,
        question: "What is the main component of Earth's atmosphere?",
        answer: "Nitrogen"
      }
    ];
  }
  
  async startGame(): Promise<void> {
    try {
      this.isLoading = true;
      
      await this.initializeGame();
      
      runInAction(() => {
        this.gameState = GameState.PLAYING;
        this.isLoading = false;
        this.startTimer();
      });
    } catch (error) {
      console.error('Error starting game:', error);
      runInAction(() => {
        this.isLoading = false;
        this.gameState = GameState.PLAYING;
        if (this.questions.length === 0) {
          this.questions = this.getDefaultQuestions();
        }
      });
    }
  }
  
  showSettings(): void {
    this.gameState = GameState.SETTINGS;
  }
  
  showStartScreen(): void {
    this.gameState = GameState.INITIAL;
  }
  
  updateSettings(newSettings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  get currentPlayer(): Player {
    return this.players.get(this.currentPlayerId)!;
  }
  
  get opponentPlayer(): Player {
    return this.players.get(this.currentPlayerId === 'player1' ? 'player2' : 'player1')!;
  }
  
  get opponentPlayers(): Player[] {
    return Array.from(this.players.values())
      .filter(player => player.id !== this.currentPlayerId);
  }

  get currentQuestion(): Question {
    if (this.questions.length === 0) {
      return {
        id: 0,
        question: this.isLoadingQuestion ? "Loading question..." : "No questions available.",
        answer: ""
      };
    }
    return this.questions[this.currentQuestionIndex];
  }

  get totalQuestions(): number {
    return this.questions.length;
  }
  
  get timerProgress(): number {
    return (this.timeRemaining / this.settings.questionTimeLimit) * 100;
  }

  startTimer(): void {
    this.stopTimer();
    
    this.timeRemaining = this.settings.questionTimeLimit;
    this.timerActive = true;
    
    this.timerInterval = window.setInterval(() => {
      runInAction(() => {
        if (this.timeRemaining > 0) {
          this.timeRemaining -= 1;
        } else {
          this.handleTimeUp();
        }
      });
    }, 1000);
  }
  
  stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerActive = false;
  }
  
  private handleTimeUp(): void {
    this.stopTimer();
    
    if (this.currentPlayer.questionsAnswered <= this.currentQuestionIndex) {
      const player = this.currentPlayer;
      player.lastAnswer = "Time's up!";
      player.lastEvaluation = {
        evaluation: AnswerEvaluation.INCORRECT,
        score: 0,
        feedback: "Time's up! You didn't answer in time."
      };
      player.questionsAnswered += 1;
      
      if (this.shouldMoveToNextQuestion()) {
        this.moveToNextQuestion();
      }
    }
  }

  private startPollingOpponentData() {
    this.opponentPollingInterval = window.setInterval(() => {
      this.fetchOpponentData();
    }, 2000);
  }

  async fetchOpponentData() {
    if (this.gameState !== GameState.PLAYING) {
      return;
    }
    
    try {
      const currentQuestionId = this.currentQuestionIndex + 1;
      console.log(`Fetching opponent data for question ${currentQuestionId}`);
      
      const response = await apiClient.getOpponentData({
        questionId: currentQuestionId
      });
      
      if (response.success && this.gameState === GameState.PLAYING) {
        runInAction(() => {
          const opponent = this.opponentPlayer;
          const prevScore = opponent.score;
          const prevAnswered = opponent.questionsAnswered;
          
          opponent.score = response.opponent.score;
          opponent.questionsAnswered = response.opponent.questionsAnswered;
          
          if (response.opponent.lastAnswer) {
            opponent.lastAnswer = response.opponent.lastAnswer;
          }
          
          if (response.opponent.lastEvaluation) {
            opponent.lastEvaluation = {
              evaluation: response.opponent.lastEvaluation.evaluation,
              score: response.opponent.lastEvaluation.score,
              feedback: response.opponent.lastEvaluation.feedback || ''
            };
          }
          
          if (prevScore !== opponent.score || prevAnswered !== opponent.questionsAnswered) {
            console.log(`Opponent updated: Score ${prevScore} → ${opponent.score}, Answered ${prevAnswered} → ${opponent.questionsAnswered}`);
          }
          
          if (this.shouldMoveToNextQuestion()) {
            console.log("Both players have answered. Moving to next question.");
            this.moveToNextQuestion();
          }
        });
      }
    } catch (error) {
      console.error('Error fetching opponent data:', error);
    }
  }
  
  shouldMoveToNextQuestion(): boolean {
    const currentQuestionNumber = this.currentQuestionIndex + 1;
    
    const allPlayersAnswered = Array.from(this.players.values())
      .every(player => player.questionsAnswered >= currentQuestionNumber);
    
    if (allPlayersAnswered && this.currentQuestionIndex === this.questions.length - 1) {
      console.log("All questions answered. Ending the game.");
      if (this.opponentPollingInterval) {
        clearInterval(this.opponentPollingInterval);
        this.opponentPollingInterval = null;
      }
      
      runInAction(() => {
        Array.from(this.players.values()).forEach(player => {
          player.questionsAnswered = this.questions.length;
        });
      });
      
      this.gameState = GameState.GAME_OVER;
      this.stopTimer();
      return false;
    }
    
    return (
      allPlayersAnswered &&
      this.currentQuestionIndex < this.questions.length - 1
    );
  }
  
  private moveToNextQuestion(): void {
    this.currentQuestionIndex++;
    
    if (this.currentQuestionIndex >= this.questions.length) {
      if (this.opponentPollingInterval) {
        clearInterval(this.opponentPollingInterval);
        this.opponentPollingInterval = null;
      }
      
      runInAction(() => {
        Array.from(this.players.values()).forEach(player => {
          player.questionsAnswered = this.questions.length;
        });
      });
      
      this.gameState = GameState.GAME_OVER;
      this.stopTimer();
      return;
    }
    
    this.startTimer();
  }

  async evaluateUserAnswer(userAnswer: string): Promise<EvaluationResult> {
    this.isLoading = true;
    
    this.stopTimer();
    
    try {
      console.log(`Submitting answer for question: "${this.currentQuestion.question}"`);
      
      const response = await apiClient.submitAnswer({
        playerId: this.currentPlayer.id,
        questionId: this.currentQuestionIndex + 1,
        answer: userAnswer,
        questionText: this.currentQuestion.question
      });
      
      if (response.success) {
        runInAction(() => {
          const player = this.currentPlayer;
          
          player.lastAnswer = userAnswer;
          player.lastEvaluation = response.evaluation;
          
          player.score += response.evaluation.score;
          player.questionsAnswered = this.currentQuestionIndex + 1;
          
          this.isLoading = false;
        });
        
        return response.evaluation;
      } else {
        throw new Error('Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      runInAction(() => {
        this.isLoading = false;
        this.startTimer();
      });
      
      return {
        evaluation: AnswerEvaluation.INCORRECT,
        score: 0,
        feedback: 'Error submitting answer. Please try again.'
      };
    }
  }

  resetGame(): void {
    this.stopTimer();
    if (this.opponentPollingInterval) {
      clearInterval(this.opponentPollingInterval);
      this.opponentPollingInterval = null;
    }
    
    this.gameState = GameState.INITIAL;
    this.currentQuestionIndex = 0;
    this.timeRemaining = this.settings.questionTimeLimit;
    this.isLoading = false;
    this.isLoadingQuestion = false;
    
    Array.from(this.players.values()).forEach(player => {
      player.score = 0;
      player.questionsAnswered = 0;
      player.lastAnswer = undefined;
      player.lastEvaluation = null;
    });
  }
  
  dispose() {
    if (this.opponentPollingInterval) {
      clearInterval(this.opponentPollingInterval);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  clearPlayerEvaluation = mobxAction("clearPlayerEvaluation", function(this: GameStore) {
    if (this.currentPlayer) {
      this.currentPlayer.lastEvaluation = null;
    }
  });

  goToNextQuestion = mobxAction("goToNextQuestion", function(this: GameStore) {
    if (this.currentPlayer) {
      this.currentPlayer.lastAnswer = undefined;
      this.currentPlayer.lastEvaluation = null;
    }
    
    this.moveToNextQuestion();
  });

  setPlayerName(name: string): void {
    if (!name.trim()) return;
    
    const player = this.players.get(this.currentPlayerId);
    if (player) {
      player.name = name.trim();
      this.players.set(this.currentPlayerId, player);
    } else if (this.currentPlayerId === 'player1' && this.players.size === 0) {
      this._pendingPlayerName = name.trim();
    }
  }
}

const gameStore = new GameStore();

const GameStoreContext = createContext<GameStore>(gameStore);

export const useStore = () => useContext(GameStoreContext);

export default gameStore; 