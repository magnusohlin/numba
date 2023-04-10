const generateNumber = (level, num2, type) => {
  const max = level === 1 ? 10 : 100
  const randomNum = Math.floor(Math.random() * max) + 1

  if (num2 !== undefined && type !== undefined) {
    if (type === 'subtraction') {
      return Math.min(randomNum + num2, max)
    } else if (type === 'division') {
      const multiplier = Math.floor(Math.random() * max) + 1
      return num2 * multiplier
    }
  }

  return randomNum
}

const isWholeNumber = (num) => num % 1 === 0

const generateDistractors = (answer, type, level) => {
  const max = level === 1 ? 10 : 100
  const baseRange = level === 1 ? 2 : 10
  const distractors = new Set()

  while (distractors.size < 3) {
    let distractor
    let iterationCount = 0

    const adjustedRange = Math.max(Math.floor(answer * 0.5), baseRange, answer + 1)

    do {
      iterationCount++

      switch (type) {
        case 'addition':
        case 'subtraction':
          distractor = answer + (Math.floor(Math.random() * adjustedRange * 2) - adjustedRange)
          if (type === 'subtraction' && (answer === 0 || answer === 1)) {
            distractor = answer + Math.floor(Math.random() * (max - 1)) + 1
          }
          break
        case 'multiplication':
          distractor = Math.round(answer * (1 + (Math.floor(Math.random() * adjustedRange * 2) - adjustedRange) / 10))
          break
        case 'division':
          const baseDistractor = Math.floor(Math.random() * max) + 1
          distractor = baseDistractor + (Math.floor(Math.random() * adjustedRange * 2) - adjustedRange)
          break
      }

      if (iterationCount >= 20) {
        break
      }

      if (!isWholeNumber(distractor)) {
        distractor = Math.round(distractor)
      }
    } while (distractors.has(distractor) || distractor === answer)

    // Generate a random whole number if the iteration limit is reached
    if (iterationCount >= 20) {
      distractor = Math.floor(Math.random() * max) + 1
    }

    // Ensure distractor is within the valid range
    if (distractor < 1) {
      continue
    }

    // Check if the distractor is a whole number, if not, adjust it
    if (!isWholeNumber(distractor)) {
      distractor = Math.round(distractor)
    }

    // Check if the distractor is not equal to the answer
    if (distractor !== answer) {
      distractors.add(distractor)
    }
  }

  return Array.from(distractors)
}

const generateChoices = (answer, level, type) => {
  const distractors = generateDistractors(answer, type, level)
  const choices = [answer, ...distractors].sort(() => Math.random() - 0.5)
  return choices
}

const createQuestion = (type, level) => {
  let num1, num2, question, answer

  switch (type) {
    case 'addition':
      do {
        num1 = generateNumber(level)
        num2 = generateNumber(level)
      } while (num1 === 0 && num2 === 0) // Ensure at least one number is not 0

      question = `${num1} + ${num2}`
      answer = num1 + num2
      break
    case 'subtraction':
      do {
        num1 = generateNumber(level)
        num2 = generateNumber(level)
      } while (num1 === num2 || num1 < num2)

      question = `${num1} - ${num2}`
      answer = num1 - num2
      break
    case 'multiplication':
      do {
        num1 = generateNumber(level)
        num2 = generateNumber(level)
      } while (num1 === 0 || num2 === 0) // Ensure neither number is 0

      question = `${num1} × ${num2}`
      answer = num1 * num2
      break
    case 'division':
      do {
        num2 = generateNumber(level)
      } while (num2 === 0) // Ensure num2 is not 0

      num1 = generateNumber(level, num2, type)
      question = `${num1} / ${num2}`
      answer = num1 / num2
      break
    case 'mixed':
      const operations = ['addition', 'subtraction', 'multiplication', 'division']
      const randomType = operations[Math.floor(Math.random() * operations.length)]
      return createQuestion(randomType, level)
    default:
      num1 = generateNumber(level)
      num2 = generateNumber(level)
      question = `${num1} + ${num2}`
      answer = num1 + num2
      break
  }

  const choices = generateChoices(answer, level, type)

  return { question, answer, choices, timeLimit: 10000 }
}

module.exports = createQuestion
