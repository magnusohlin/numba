const generateNumber = (level) => {
  const max = level === 1 ? 10 : 100
  return Math.floor(Math.random() * max) + 1
}

const generateChoices = (answer, level) => {
  const max = level === 1 ? 10 : 100
  const choices = new Set()
  choices.add(answer)

  while (choices.size < 4) {
    choices.add(Math.floor(Math.random() * max) + 1)
  }

  return Array.from(choices).sort(() => Math.random() - 0.5)
}

const createQuestion = (type, level) => {
  const num1 = generateNumber(level)
  const num2 = generateNumber(level)
  let question, answer

  switch (type) {
    case 'addition':
      question = `${num1} + ${num2}`
      answer = num1 + num2
      break
    case 'subtraction':
      question = `${num1} - ${num2}`
      answer = num1 - num2
      break
    case 'multiplication':
      question = `${num1} * ${num2}`
      answer = num1 * num2
      break
    case 'division':
      question = `${num1} / ${num2}`
      answer = num1 / num2
      break
    case 'mixed':
      const operations = ['addition', 'subtraction', 'multiplication', 'division']
      const randomType = operations[Math.floor(Math.random() * operations.length)]
      return createQuestion(randomType, level)
    default:
      question = `${num1} + ${num2}`
      answer = num1 + num2
      break
  }

  const choices = generateChoices(answer, level)

  return { question, answer, choices, timeLimit: 10000 }
}

module.exports = createQuestion
