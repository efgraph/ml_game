## Обзор

Сервис генерирует вопросы и оценивает ответы на заданную тему и состоит из двух моделей:

1.  **Генератор вопросов:** Дообученная модель T5 (`google/t5-small-lm-adapt`), которая генерирует вопросы по статистике на основе тематических запросов.
2.  **Оценка ответов:** Дообученная модель Cross-Encoder (`cross-encoder/ms-marco-MiniLM-L-6-v2`), которая оценивает ответы студентов по отношению к эталонным ответам, присваивая оценку от 0 до 3.

Используются Python, FastAPI, PyTorch/Transformers, Hydra для конфигурации, MLflow для отслеживания экспериментов и Poetry для управления зависимостями.

### Установка

1.  Перейдите в директорию бэкенда:
    ```bash
    cd backend
    ```
2.  Установите зависимости:
    ```bash
    poetry install
    ```
3.  Активируйте виртуальное окружение:
    ```bash
    poetry shell
    ```

#### Запуск API Сервиса

```bash
uvicorn api.api:app --host 0.0.0.0 --port 8000 --reload
```

**API Эндпоинты:**

-   `GET /v1/generate_question?topic=<topic>`: Генерирует вопрос на основе переданной темы
    -   Пример: `curl "http://localhost:8000/v1/generate_question?topic=standard%20deviation"`
-   `POST /v1/classify_answer`: Оценивает ответ и возвращает балл
    -   Тело запроса (JSON):
        ```json
        {
          "question": "What is a p-value?",
          "student_answer": "The probability of observing the data if the null is true.",
          "ref_answers": ["Probability of observing data as extreme or more extreme when null hypothesis is true", "A measure of evidence against the null hypothesis"]
        }
        ```
    -   Пример:
        ```bash
        curl -X POST "http://localhost:8000/v1/classify_answer" \
             -H "Content-Type: application/json" \
             -d '{"question": "What is a p-value?", "student_answer": "The probability of observing the data if the null is true.", "ref_answers": ["Probability of observing data as extreme or more extreme when null hypothesis is true", "A measure of evidence against the null hypothesis"]}'
        ```


**1. Инференс:**

*   **Генерация вопроса:**
    ```bash
    python commands.py infer --questions --prompt "generate a causal question about: ROC curve"
    ```

*   **Оценка ответа:**
    ```bash
    python commands.py infer --grader \
           --question "Define p-value" \
           --student_answer "The probability of the data given the null hypothesis is true" \
           --ref_answers '["Probability of observing data as extreme or more extreme when null hypothesis is true", "The probability that allows us to determine statistical significance"]'
    ```

**2. Обучение:**

*   **Генератор вопросов:**
    ```bash
    python commands.py train --questions
    ```
    *(настраивается в `conf/qa.yaml`)*


*   **Оценка ответов:**
    ```bash
    python commands.py train --classifier
    ```
    *(настраивается в `conf/classifier.yaml`)*


## Разработка

-   **Запуск тестов:** `pytest`
-   **Отслеживание экспериментов:** MLflow  можно запустить через `mlflow ui --backend-store-uri mlruns`.
