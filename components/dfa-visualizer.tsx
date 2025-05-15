"use client"

import type React from "react"

import { useCallback, useEffect, useState, useRef } from "react"
import ReactFlow, {
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "reactflow"
import "reactflow/dist/style.css"
import type { DFA } from "@/lib/dfa-parser"
import { simulateDFA, type SimulationStep } from "@/lib/dfa-simulator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toPng, toSvg, toJpeg } from "html-to-image"
import FileSaver from "file-saver"
import {
  AlertCircle,
  CheckCircle2,
  Play,
  SkipForward,
  Rewind,
  StepForward,
  StepBack,
  Pause,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react"

interface DFAVisualizerProps {
  dfa: DFA
}

const nodeWidth = 50
const nodeHeight = 50

const DFAVisualizer = ({ dfa }: DFAVisualizerProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "jpeg">("png")

  // Simulation state
  const [input, setInput] = useState("")
  const [currentInput, setCurrentInput] = useState("")
  const [steps, setSteps] = useState<SimulationStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isAccepted, setIsAccepted] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1000) // ms per step
  const [activeTransition, setActiveTransition] = useState<string | null>(null)
  const [showSimulation, setShowSimulation] = useState(false)
  const animationRef = useRef<NodeJS.Timeout | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Vamos adicionar um useEffect para garantir que o componente reaja às mudanças no DFA
  useEffect(() => {
    // Resetar a simulação quando o DFA mudar
    resetSimulation()

    // Forçar a recriação dos nós e arestas
    createNodesAndEdges()
  }, [dfa]) // Dependência no objeto dfa

  // Function to generate a random string that will be accepted by the automaton
  const generateAcceptedString = (dfa: DFA): string => {
    // If there are no accepting states, return empty string
    if (dfa.acceptingStates.length === 0) return ""

    // Maximum attempts to find an accepted string
    const maxAttempts = 5

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Start from the initial state
      let currentState = dfa.initialState
      const path: string[] = []
      const maxLength = 20 // Prevent infinite loops

      // Try to find a path to an accepting state
      while (!dfa.acceptingStates.includes(currentState) && path.length < maxLength) {
        // Find all possible transitions from the current state
        const possibleTransitions = dfa.transitions.filter((t) => t.from === currentState)

        if (possibleTransitions.length === 0) {
          // No transitions available, can't continue
          break
        }

        // Choose a random transition
        const randomIndex = Math.floor(Math.random() * possibleTransitions.length)
        const transition = possibleTransitions[randomIndex]

        // Add the symbol to our path
        path.push(transition.symbol)

        // Update current state
        currentState = transition.to
      }

      // If we found a path to an accepting state
      if (dfa.acceptingStates.includes(currentState)) {
        return path.join("")
      }
    }

    // If we couldn't find a random path, try a more directed approach
    // Find the shortest path to any accepting state
    for (const acceptingState of dfa.acceptingStates) {
      const path = findPathToState(dfa, dfa.initialState, acceptingState)
      if (path) return path
    }

    return "" // Couldn't find any accepted string
  }

  // Function to generate a random string that will be rejected by the automaton
  const generateRejectedString = (dfa: DFA): string => {
    // Choose a random rejection strategy
    const strategies = [
      // Strategy 1: Use an invalid symbol
      () => {
        if (dfa.alphabet.length === 0) return null

        // Generate a character that's not in the alphabet
        const allChars = "abcdefghijklmnopqrstuvwxyz0123456789"
        const validChars = new Set(dfa.alphabet)
        const invalidChars = [...allChars].filter((char) => !validChars.has(char))

        if (invalidChars.length === 0) return null

        // Generate a random string with some valid symbols and one invalid
        const length = Math.floor(Math.random() * 5) + 1
        const result = []

        // Add some valid symbols first (optional)
        if (Math.random() > 0.5 && dfa.alphabet.length > 0) {
          for (let i = 0; i < length - 1; i++) {
            const randomIndex = Math.floor(Math.random() * dfa.alphabet.length)
            result.push(dfa.alphabet[randomIndex])
          }
        }

        // Add the invalid symbol
        const randomInvalidChar = invalidChars[Math.floor(Math.random() * invalidChars.length)]
        result.push(randomInvalidChar)

        return result.join("")
      },

      // Strategy 2: Find a path to a non-accepting state
      () => {
        const nonAcceptingStates = dfa.states.filter((s) => !dfa.acceptingStates.includes(s))
        if (nonAcceptingStates.length === 0) return null

        // Choose a random non-accepting state
        const randomState = nonAcceptingStates[Math.floor(Math.random() * nonAcceptingStates.length)]
        const path = findPathToState(dfa, dfa.initialState, randomState)

        // If we found a path and the state is a dead-end (no outgoing transitions)
        // we need to make sure the string is actually rejected
        if (path) {
          const stateHasOutgoingTransitions = dfa.transitions.some((t) => t.from === randomState)

          // If the state has outgoing transitions, we need to make sure it's not an intermediate
          // state that could eventually lead to an accepting state
          if (stateHasOutgoingTransitions) {
            // Add a random valid symbol that doesn't have a transition from this state
            if (dfa.alphabet.length > 0) {
              const validTransitionSymbols = new Set(
                dfa.transitions.filter((t) => t.from === randomState).map((t) => t.symbol),
              )

              const symbolsWithoutTransition = dfa.alphabet.filter((s) => !validTransitionSymbols.has(s))

              if (symbolsWithoutTransition.length > 0) {
                const randomSymbol =
                  symbolsWithoutTransition[Math.floor(Math.random() * symbolsWithoutTransition.length)]
                return path + randomSymbol
              }
            }
          }

          return path
        }

        return null
      },

      // Strategy 3: Generate a completely random string that's likely to be rejected
      () => {
        if (dfa.alphabet.length === 0) return null

        // Generate a random string that's longer than likely paths in the automaton
        const length = Math.floor(Math.random() * 10) + 15 // 15-25 characters
        const result = []

        for (let i = 0; i < length; i++) {
          const randomIndex = Math.floor(Math.random() * dfa.alphabet.length)
          result.push(dfa.alphabet[randomIndex])
        }

        // Verify this string is actually rejected
        const simulation = simulateDFA(dfa, result.join(""))
        if (!simulation.accepted) {
          return result.join("")
        }

        return null
      },
    ]

    // Try each strategy in random order
    const shuffledStrategies = [...strategies].sort(() => Math.random() - 0.5)

    for (const strategy of shuffledStrategies) {
      const result = strategy()
      if (result) return result
    }

    // If all strategies failed, generate a simple string with an invalid character if possible
    if (dfa.alphabet.length > 0) {
      return "x".repeat(5) // Likely to be rejected in most automata
    }

    return "abcdefghij" // Last resort
  }

  // Helper function to find a path from start state to target state
  const findPathToState = (dfa: DFA, startState: string, targetState: string): string => {
    // Simple BFS to find the shortest path
    const queue: { state: string; path: string[] }[] = [{ state: startState, path: [] }]
    const visited = new Set<string>([startState])

    while (queue.length > 0) {
      const { state, path } = queue.shift()!

      if (state === targetState) {
        return path.join("")
      }

      // Find all transitions from this state
      const transitions = dfa.transitions.filter((t) => t.from === state)

      for (const transition of transitions) {
        if (!visited.has(transition.to)) {
          visited.add(transition.to)
          queue.push({
            state: transition.to,
            path: [...path, transition.symbol],
          })
        }
      }
    }

    return "" // No path found
  }

  // Function to identify the active transition in the current step
  const updateActiveTransition = (currentStep: number, nextStep: number) => {
    if (steps.length <= 1 || nextStep >= steps.length) {
      setActiveTransition(null)
      return
    }

    const currentState = steps[currentStep].currentState
    const nextState = steps[nextStep].currentState
    const symbol = currentInput[steps[currentStep].position]

    // Find the corresponding transition
    const transition = dfa.transitions.find((t) => t.from === currentState && t.to === nextState && t.symbol === symbol)

    if (transition) {
      setActiveTransition(`${transition.from}-${transition.to}`)
    } else {
      setActiveTransition(null)
    }
  }

  // Update active transition when step changes
  useEffect(() => {
    if (steps.length > 0 && currentStep < steps.length - 1) {
      updateActiveTransition(currentStep, currentStep + 1)
    } else {
      setActiveTransition(null)
    }
  }, [currentStep, steps, currentInput, dfa.transitions])

  const createNodesAndEdges = useCallback(() => {
    if (!dfa) return

    // Create nodes
    const newNodes: Node[] = dfa.states.map((state, index) => {
      // Calculate position in a circle
      const angle = (index / dfa.states.length) * 2 * Math.PI
      const radius = Math.min(300, 50 * dfa.states.length)
      const x = 400 + radius * Math.cos(angle)
      const y = 300 + radius * Math.sin(angle)

      // Check if this state is the current state in the simulation
      const isCurrentState = steps.length > 0 && currentStep < steps.length && steps[currentStep].currentState === state

      return {
        id: state,
        data: {
          label: state,
          isInitial: state === dfa.initialState,
          isAccepting: dfa.acceptingStates.includes(state),
        },
        position: { x, y },
        style: {
          width: nodeWidth,
          height: nodeHeight,
          borderRadius: "50%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: dfa.acceptingStates.includes(state) ? "4px double #0B3D91" : "2px solid #0B3D91",
          backgroundColor: isCurrentState ? "#FC3D21" : state === dfa.initialState ? "#E6E6E6" : "#ffffff",
          color: isCurrentState ? "#ffffff" : "#0B3D91",
          fontWeight: "bold",
        },
      }
    })

    // Create edges
    const transitionMap = new Map<string, string[]>()

    dfa.transitions.forEach((transition) => {
      const key = `${transition.from}>${transition.to}`
      if (!transitionMap.has(key)) {
        transitionMap.set(key, [])
      }
      transitionMap.get(key)?.push(transition.symbol)
    })

    const newEdges: Edge[] = []

    transitionMap.forEach((symbols, key) => {
      const [from, to] = key.split(">")

      // Check if it's a self-loop
      const isSelfLoop = from === to

      // Check if this edge is the active transition
      const isActive = activeTransition === `${from}-${to}`

      newEdges.push({
        id: `${from}-${to}`,
        source: from,
        target: to,
        label: symbols.join(", "),
        type: "default",
        animated: isActive,
        style: {
          strokeWidth: isActive ? 3 : 2,
          stroke: isActive ? "#FC3D21" : "#0B3D91",
        },
        labelStyle: {
          fill: "#ffffff",
          fontWeight: 500,
          backgroundColor: "#0B3D91",
          padding: "3px 6px",
          borderRadius: "4px",
        },
        labelBgStyle: { fill: "#0B3D91" },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActive ? "#FC3D21" : "#0B3D91",
        },
        // For self-loops, add a curve
        ...(isSelfLoop && {
          type: "default",
          sourceHandle: Position.Top,
          targetHandle: Position.Top,
          style: {
            strokeWidth: isActive ? 3 : 2,
            stroke: isActive ? "#FC3D21" : "#0B3D91",
          },
          labelStyle: {
            fill: "#ffffff",
            fontWeight: 500,
            backgroundColor: "#0B3D91",
            padding: "3px 6px",
            borderRadius: "4px",
          },
          labelBgStyle: { fill: "#0B3D91" },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
        }),
      })
    })

    // Add initial state marker
    if (dfa.initialState) {
      const initialNode = newNodes.find((node) => node.id === dfa.initialState)
      if (initialNode) {
        newEdges.push({
          id: "initial-marker",
          source: "initial-dummy",
          target: dfa.initialState,
          type: "default",
          style: { strokeWidth: 2, stroke: "#0B3D91" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#0B3D91",
          },
        })

        // Add a dummy node for the initial state marker
        newNodes.push({
          id: "initial-dummy",
          data: { label: "" },
          position: {
            x: (initialNode.position.x || 0) - 80,
            y: initialNode.position.y || 0,
          },
          style: {
            width: 1,
            height: 1,
            backgroundColor: "transparent",
            border: "none",
          },
        })
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [dfa, setNodes, setEdges, steps, currentStep, isExpanded, activeTransition])

  useEffect(() => {
    createNodesAndEdges()
  }, [createNodesAndEdges])

  // Animation logic
  useEffect(() => {
    if (isAnimating && steps.length > 0) {
      if (currentStep < steps.length - 1) {
        animationRef.current = setTimeout(() => {
          setCurrentStep((prev) => prev + 1)
        }, animationSpeed)
      } else {
        setIsAnimating(false)
      }
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [isAnimating, currentStep, steps.length, animationSpeed])

  const exportDiagram = () => {
    const flowElement = document.querySelector(".react-flow") as HTMLElement
    if (!flowElement) return

    const exportFn = exportFormat === "png" ? toPng : exportFormat === "svg" ? toSvg : toJpeg

    exportFn(flowElement, {
      backgroundColor: "#fff",
      width: flowElement.offsetWidth,
      height: flowElement.offsetHeight,
    })
      .then((dataUrl) => {
        FileSaver.saveAs(dataUrl, `dfa-diagram.${exportFormat}`)
      })
      .catch((error) => {
        console.error("Error exporting diagram:", error)
      })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    setError(null)
  }

  const validateInput = (input: string): boolean => {
    const validSymbols = new Set(dfa.alphabet)
    for (const char of input) {
      if (!validSymbols.has(char)) {
        setError(`Símbolo inválido: '${char}'. Símbolos válidos são: ${Array.from(validSymbols).join(", ")}`)
        return false
      }
    }
    return true
  }

  const runSimulation = () => {
    if (!validateInput(input)) return

    setCurrentInput(input)
    const simulationResult = simulateDFA(dfa, input)
    setSteps(simulationResult.steps)
    setIsAccepted(simulationResult.accepted)
    setCurrentStep(0)
    setShowSimulation(true)
  }

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step)
    }
  }

  const goToStart = () => {
    setIsAnimating(false)
    goToStep(0)
  }

  const goToEnd = () => {
    setIsAnimating(false)
    goToStep(steps.length - 1)
  }

  const goToPrevious = () => {
    setIsAnimating(false)
    goToStep(currentStep - 1)
  }

  const goToNext = () => {
    setIsAnimating(false)
    goToStep(currentStep + 1)
  }

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating)
  }

  const resetSimulation = () => {
    setShowSimulation(false)
    setSteps([])
    setCurrentStep(0)
    setIsAccepted(null)
    setActiveTransition(null)
    setIsAnimating(false)
    if (animationRef.current) {
      clearTimeout(animationRef.current)
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // If in expanded mode, render only the ReactFlow and essential controls
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex justify-between items-center p-2 border-b bg-nasa-blue text-white">
          <div className="flex items-center space-x-2">
            {isAccepted !== null && (
              <Badge variant={isAccepted ? "success" : "destructive"} className="flex items-center justify-center">
                {isAccepted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aceito
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-1" /> Rejeitado
                  </>
                )}
              </Badge>
            )}
            {showSimulation && steps.length > 0 && (
              <span className="text-sm font-medium">
                Entrada: "{currentInput}" | Passo: {currentStep + 1}/{steps.length} | Estado:{" "}
                {steps[currentStep].currentState}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" onClick={toggleExpanded}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsExpanded(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: "#0B3D91" },
              labelStyle: { fill: "#ffffff", fontWeight: 500 },
              labelBgStyle: { fill: "#0B3D91" },
              labelBgPadding: [4, 2],
              labelBgBorderRadius: 4,
            }}
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>

        {showSimulation && steps.length > 0 && (
          <div className="p-2 border-t bg-nasa-blue text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Velocidade:</span>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-xs">{animationSpeed}ms</span>
              </div>
              <div className="flex space-x-1">
                <Button variant="secondary" size="sm" onClick={goToStart} disabled={currentStep === 0}>
                  <Rewind className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={goToPrevious} disabled={currentStep === 0}>
                  <StepBack className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={toggleAnimation}>
                  {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="secondary" size="sm" onClick={goToNext} disabled={currentStep === steps.length - 1}>
                  <StepForward className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={goToEnd} disabled={currentStep === steps.length - 1}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold text-nasa-blue">Visualização do AFD</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Generate a string that will be accepted by the automaton
              const acceptedString = generateAcceptedString(dfa)
              setInput(acceptedString)
            }}
          >
            Gerar String Aceita
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Generate a string that will be rejected by the automaton
              const rejectedString = generateRejectedString(dfa)
              setInput(rejectedString)
            }}
          >
            Gerar String Rejeitada
          </Button>
        </div>
      </div>

      {/* Simulation Input */}
      <div className="mb-4">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={`Digite a cadeia de entrada (símbolos válidos: ${dfa.alphabet.join(", ")})`}
            className="flex-1 border-nasa-blue"
          />
          <Button onClick={runSimulation}>
            <Play className="mr-2 h-4 w-4" />
            Simular
          </Button>
        </div>

        {error && (
          <div className="flex items-center text-nasa-red mt-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
      </div>

      <div className="border border-nasa-blue rounded-lg h-[500px] relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          defaultEdgeOptions={{
            style: { strokeWidth: 2, stroke: "#0B3D91" },
            labelStyle: { fill: "#ffffff", fontWeight: 500 },
            labelBgStyle: { fill: "#0B3D91" },
            labelBgPadding: [4, 2],
            labelBgBorderRadius: 4,
          }}
        >
          <Controls />
          <Background />
        </ReactFlow>

        <Button variant="outline" size="sm" className="absolute top-2 right-2 z-10 bg-white" onClick={toggleExpanded}>
          <Maximize2 className="h-4 w-4 mr-2" />
          Expandir
        </Button>
      </div>

      {/* Simulation Controls and Info */}
      {showSimulation && steps.length > 0 && (
        <Card className="mt-4 nasa-card">
          <CardHeader className="bg-nasa-blue bg-opacity-5">
            <CardTitle className="flex justify-between">
              <span>Simulação para: "{currentInput}"</span>
              {isAccepted !== null && (
                <Badge variant={isAccepted ? "success" : "destructive"} className="flex items-center justify-center">
                  {isAccepted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Aceito
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-1" /> Rejeitado
                    </>
                  )}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Passo {currentStep + 1} de {steps.length}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <span className="font-semibold">Estado Atual:</span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {steps[currentStep].currentState}
                </Badge>

                {dfa.acceptingStates.includes(steps[currentStep].currentState) && (
                  <Badge variant="success" className="ml-2">
                    Estado de Aceitação
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-semibold">Processamento da Entrada:</span>
                <div className="font-mono text-lg border border-nasa-blue rounded px-3 py-1">
                  {currentInput.split("").map((char, index) => {
                    let className = "px-1"
                    if (index < steps[currentStep].position) {
                      className += " text-gray-400" // Already processed
                    } else if (index === steps[currentStep].position) {
                      className += " bg-nasa-red text-white font-bold" // Current position
                    }
                    return (
                      <span key={index} className={className}>
                        {char}
                      </span>
                    )
                  })}
                </div>
              </div>

              {currentStep > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Transição:</span>
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2">
                      {steps[currentStep - 1].currentState}
                    </Badge>
                    <span className="mx-2 text-nasa-red font-bold">
                      {currentInput[steps[currentStep - 1].position] || "ε"}→
                    </span>
                    <Badge variant="outline">{steps[currentStep].currentState}</Badge>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <span className="font-semibold">Velocidade da Animação:</span>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                  className="w-32"
                />
                <span>{animationSpeed}ms</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-nasa-blue bg-opacity-5">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={goToStart} disabled={currentStep === 0}>
                <Rewind className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToPrevious} disabled={currentStep === 0}>
                <StepBack className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={toggleAnimation}>
                {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={goToNext} disabled={currentStep === steps.length - 1}>
                <StepForward className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToEnd} disabled={currentStep === steps.length - 1}>
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button variant="destructive" onClick={resetSimulation}>
                Reiniciar
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

export default DFAVisualizer
