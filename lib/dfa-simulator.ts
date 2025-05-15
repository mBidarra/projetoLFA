import type { DFA } from "./dfa-parser"

export interface SimulationStep {
  currentState: string
  position: number
}

export interface SimulationResult {
  steps: SimulationStep[]
  accepted: boolean
}

export function simulateDFA(dfa: DFA, input: string): SimulationResult {
  const steps: SimulationStep[] = []
  let currentState = dfa.initialState

  // Adicionar estado inicial
  steps.push({
    currentState,
    position: 0,
  })

  // Processar cada símbolo de entrada
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i]

    // Encontrar transição
    const transition = dfa.transitions.find((t) => t.from === currentState && t.symbol === symbol)

    if (!transition) {
      // Nenhuma transição válida encontrada, adicionar passo final e retornar
      steps.push({
        currentState,
        position: i + 1,
      })

      return {
        steps,
        accepted: false,
      }
    }

    // Atualizar estado atual
    currentState = transition.to

    // Adicionar passo
    steps.push({
      currentState,
      position: i + 1,
    })
  }

  // Verificar se o estado final é de aceitação
  const accepted = dfa.acceptingStates.includes(currentState)

  return {
    steps,
    accepted,
  }
}
