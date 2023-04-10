const { describe, it, expect } = require('@jest/globals')
const createQuestions = require('./createQuestions')

describe('createQuestion', () => {
  const operations = ['addition', 'subtraction', 'multiplication', 'division']

  operations.forEach(operation => {
    for (let level = 1; level <= 2; level++) {
      it(`returns a valid question for ${operation} at level ${level}`, () => {
        const questionData = createQuestions(operation, level)
        expect(questionData.question).toBeTruthy()
        expect(questionData.answer).toBeDefined()
        expect(questionData.choices).toHaveLength(4)
        expect(questionData.choices).toContain(questionData.answer)
        expect(questionData.timeLimit).toBe(10000)

        const uniqueChoices = new Set(questionData.choices)
        expect(uniqueChoices.size).toBe(4)

        questionData.choices.forEach(choice => {
          expect(typeof choice).toBe('number')
          expect(choice).toBeGreaterThanOrEqual(1)
        })
      })
    }

    ['mixed'].forEach(operation => {
      for (let level = 1; level <= 2; level++) {
        it(`returns a valid answer for ${operation} at level ${level}`, () => {
          const questionData = createQuestions(operation, level)

          let actualOperation

          if (questionData.question.includes('+')) {
            actualOperation = 'addition'
          } else if (questionData.question.includes('-')) {
            actualOperation = 'subtraction'
          } else if (questionData.question.includes('×')) {
            actualOperation = 'multiplication'
          } else if (questionData.question.includes('/')) {
            actualOperation = 'division'
          }

          const calculatedAnswer = calculateAnswer(questionData.question, actualOperation)

          if (actualOperation === 'division') {
            expect(Math.abs(questionData.answer - calculatedAnswer)).toBeLessThanOrEqual(0.0001)
          } else {
            expect(questionData.answer).toEqual(calculatedAnswer)
          }
        })
      }
    })
  })

  const calculateAnswer = (question, operation) => {
    const [num1, num2] = question.split(/[\s+×\/-]+/).map(Number)

    switch (operation) {
      case 'addition':
        return num1 + num2
      case 'subtraction':
        return num1 - num2
      case 'multiplication':
        return num1 * num2
      case 'division':
        return num1 / num2
    }
  }
})
