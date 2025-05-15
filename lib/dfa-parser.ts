export interface Transition {
  from: string
  symbol: string
  to: string
}

export interface DFA {
  alphabet: string[]
  states: string[]
  initialState: string
  acceptingStates: string[]
  transitions: Transition[]
}

export function parseDFA(input: string): DFA {
  const lines = input.split("\n").map((line) => line.trim())

  // Analisar alfabeto
  const alphabetLine = lines.find((line) => line.startsWith("Alfabeto") || line.startsWith("Alphabet"))
  if (!alphabetLine) {
    throw new Error("Alphabet definition not found")
  }

  const alphabetMatch = alphabetLine.match(/\{([^}]*)\}/)
  if (!alphabetMatch) {
    throw new Error("Invalid alphabet format")
  }

  const alphabet = alphabetMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Analisar estados
  const statesLine = lines.find((line) => line.startsWith("Estados") || line.startsWith("States"))
  if (!statesLine) {
    throw new Error("States definition not found")
  }

  const statesMatch = statesLine.match(/\{([^}]*)\}/)
  if (!statesMatch) {
    throw new Error("Invalid states format")
  }

  const states = statesMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Analisar estado inicial
  const initialStateLine = lines.find(
    (line) => line.startsWith("Estado inicial") || line.startsWith("Initial state") || line.includes("q0 ="),
  )
  if (!initialStateLine) {
    throw new Error("Initial state definition not found")
  }

  const initialStateMatch = initialStateLine.match(/=\s*(\w+)/)
  if (!initialStateMatch) {
    throw new Error("Invalid initial state format")
  }

  const initialState = initialStateMatch[1].trim()

  // Analisar estados de aceitação
  const acceptingStatesLine = lines.find((line) => line.startsWith("Estado(s) aceitador(es)") || line.includes("F ="))
  if (!acceptingStatesLine) {
    throw new Error("Accepting states definition not found")
  }

  const acceptingStatesMatch = acceptingStatesLine.match(/\{([^}]*)\}/)
  if (!acceptingStatesMatch) {
    throw new Error("Invalid accepting states format")
  }

  const acceptingStates = acceptingStatesMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Analisar transições
  const transitionsLine = lines.find((line) => line.startsWith("Transições") || line.startsWith("Transitions"))

  if (!transitionsLine) {
    throw new Error("Transitions definition not found")
  }

  // Encontrar o índice da linha das transições
  const transitionsLineIndex = lines.indexOf(transitionsLine)

  // Obter todas as linhas de transição (podem ser múltiplas linhas)
  let transitionsText = ""
  for (let i = transitionsLineIndex + 1; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      transitionsText += lines[i] + ", "
    }
  }

  // Se nenhuma transição for encontrada nas linhas subsequentes, verificar a linha atual
  if (transitionsText.trim().length === 0) {
    const match = transitionsLine.match(/$$formato[^)]*$$:\s*(.*)/)
    if (match) {
      transitionsText = match[1]
    }
  }

  // Analisar transições
  const transitions: Transition[] = []
  const transitionParts = transitionsText
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const part of transitionParts) {
    const match = part.match(/(\w+):(\w+)>(\w+)/)
    if (!match) {
      throw new Error(`Invalid transition format: ${part}`)
    }

    transitions.push({
      from: match[1],
      symbol: match[2],
      to: match[3],
    })
  }

  // Validar DFA
  if (!states.includes(initialState)) {
    throw new Error(`Initial state '${initialState}' is not in the set of states`)
  }

  for (const state of acceptingStates) {
    if (!states.includes(state)) {
      throw new Error(`Accepting state '${state}' is not in the set of states`)
    }
  }

  for (const transition of transitions) {
    if (!states.includes(transition.from)) {
      throw new Error(`Transition from state '${transition.from}' which is not defined`)
    }

    if (!states.includes(transition.to)) {
      throw new Error(`Transition to state '${transition.to}' which is not defined`)
    }

    if (!alphabet.includes(transition.symbol)) {
      throw new Error(`Transition symbol '${transition.symbol}' is not in the alphabet`)
    }
  }

  return {
    alphabet,
    states,
    initialState,
    acceptingStates,
    transitions,
  }
}
