"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import type { DFA } from "@/lib/dfa-parser"
import { simulateDFA, type SimulationStep } from "@/lib/dfa-simulator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import Image from "next/image"

interface DFASimulatorProps {
  dfa: DFA
}

// Componente personalizado para o nó do estado
const StateNode = ({ data }: { data: any }) => {
  const roverSize = data.isExpanded ? 60 : 30

  return (
    <div
      className={`flex items-center justify-center rounded-full w-[50px] h-[50px] ${
        data.isAccepting ? "border-double border-4" : "border-2"
      } ${data.isInitial ? "bg-blue-50" : "bg-white"} border-gray-800`}
    >
      <div className="text-sm font-medium">{data.label}</div>
      {data.hasRover && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <Image src="/images/rover.gif" alt="Rover" width={roverSize} height={roverSize} className="z-10" />
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  state: StateNode,
}

const nodeWidth = 50
const nodeHeight = 50

const DFASimulator = ({ dfa }: DFASimulatorProps) => {
  const [input, setInput] = useState("")
  const [currentInput, setCurrentInput] = useState("")
  const [steps, setSteps] = useState<SimulationStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isAccepted, setIsAccepted] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1000) // ms per step
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTransition, setActiveTransition] = useState<string | null>(null)
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  // Função para identificar a transição ativa no passo atual
  const updateActiveTransition = (currentStep: number, nextStep: number) => {
    if (steps.length <= 1 || nextStep >= steps.length) {
      setActiveTransition(null)
      return
    }

    const currentState = steps[currentStep].currentState
    const nextState = steps[nextStep].currentState
    const symbol = currentInput[steps[currentStep].position]

    // Encontrar a transição correspondente
    const transition = dfa.transitions.find((t) => t.from === currentState && t.to === nextState && t.symbol === symbol)

    if (transition) {
      setActiveTransition(`${transition.from}-${transition.to}`)
    } else {
      setActiveTransition(null)
    }
  }

  // Atualizar a transição ativa quando o passo muda
  useEffect(() => {
    if (steps.length > 0 && currentStep < steps.length - 1) {
      updateActiveTransition(currentStep, currentStep + 1)
    } else {
      setActiveTransition(null)
    }
  }, [currentStep, steps, currentInput, dfa.transitions])

  // Create nodes and edges for the automaton visualization
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
        type: "state", // Use our custom node type
        data: {
          label: state,
          isInitial: state === dfa.initialState,
          isAccepting: dfa.acceptingStates.includes(state),
          hasRover: isCurrentState, // Flag to show rover on this node
          isExpanded: isExpanded, // Pass expanded state to node
        },
        position: { x, y },
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
          stroke: isActive ? "#ff0000" : "#000",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActive ? "#ff0000" : undefined,
        },
        // For self-loops, add a curve
        ...(isSelfLoop && {
          type: "default",
          sourceHandle: Position.Top,
          targetHandle: Position.Top,
          style: {
            strokeWidth: isActive ? 3 : 2,
            stroke: isActive ? "#ff0000" : "#000",
          },
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
          style: { strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
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

  // Atualizar nós e arestas quando necessário
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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Se estiver no modo expandido, renderiza apenas o ReactFlow e os controles essenciais
  if (isExpanded && steps.length > 0) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex justify-between items-center p-2 border-b">
          <div className="flex items-center space-x-2">
            <Badge variant={isAccepted ? "success" : "destructive"} className="text-sm">
              {isAccepted ? "Aceito" : "Rejeitado"}
            </Badge>
            <span className="text-sm font-medium">
              Entrada: "{currentInput}" | Passo: {currentStep + 1}/{steps.length} | Estado:{" "}
              {steps[currentStep].currentState}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={toggleExpanded}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
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
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>

        <div className="p-2 border-t bg-white">
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
              <Button variant="outline" size="sm" onClick={goToStart} disabled={currentStep === 0}>
                <Rewind className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToPrevious} disabled={currentStep === 0}>
                <StepBack className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={toggleAnimation}>
                {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={goToNext} disabled={currentStep === steps.length - 1}>
                <StepForward className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToEnd} disabled={currentStep === steps.length - 1}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Renderização normal
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-xl font-semibold">Simulador de AFD</h2>
        <p className="text-gray-600">
          Digite uma sequência de símbolos para simular o AFD. Símbolos válidos: {dfa.alphabet.join(", ")}
        </p>

        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Digite a cadeia de entrada (ex: bhno)"
            className="flex-1"
          />
          <Button onClick={runSimulation}>
            <Play className="mr-2 h-4 w-4" />
            Simular
          </Button>
        </div>

        {error && (
          <div className="flex items-center text-red-500">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
      </div>

      {steps.length > 0 && (
        <>
          <div className="border rounded-lg h-[450px] relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-right"
            >
              <Controls />
              <Background />
            </ReactFlow>

            {/* Botão de expansão */}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 z-10 bg-white"
              onClick={toggleExpanded}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Expandir
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Simulação para: "{currentInput}"</span>
                {isAccepted !== null && (
                  <Badge variant={isAccepted ? "success" : "destructive"}>
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
                  <div className="font-mono text-lg border rounded px-3 py-1">
                    {currentInput.split("").map((char, index) => {
                      let className = "px-1"
                      if (index < steps[currentStep].position) {
                        className += " text-gray-400" // Already processed
                      } else if (index === steps[currentStep].position) {
                        className += " bg-yellow-200 font-bold" // Current position
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
                      <span className="mx-2">{currentInput[steps[currentStep - 1].position] || "ε"}→</span>
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

            <CardFooter>
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
              </div>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}

export default DFASimulator
