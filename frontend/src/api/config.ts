export const MOCK_DELAY = {
  MIN: 300,
  MAX: 1200,
};

export const getRandomDelay = (): number => {
  return Math.floor(
    Math.random() * (MOCK_DELAY.MAX - MOCK_DELAY.MIN) + MOCK_DELAY.MIN
  );
}; 