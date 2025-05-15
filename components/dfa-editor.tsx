"use client"

import { useState, useEffect } from "react"
import type { DFA, Transition } from "@/lib/dfa-parser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Save, X, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DFAEditorProps {
  dfa: DFA
  onEdit: (dfa: DFA) => void
}

const DFAEditor = ({ dfa, onEdit }: DFAEditorProps) => {
  const [editedDFA, setEditedDFA] = useState<DFA>({ ...dfa })
  const [newState, setNewState] = useState("")
  const [newSymbol, setNewSymbol] = useState("")
  const [isAddingTransition, setIsAddingTransition] = useState(false)
  const [transitionFrom, setTransitionFrom] = useState("")
  const [transitionSymbol, setTransitionSymbol] = useState("")
  const [transitionTo, setTransitionTo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")

  useEffect(() => {
    setEditedDFA({ ...dfa })
  }, [dfa])

  const validateDFA = (): boolean => {
    // Check if initial state is in states
    if (!editedDFA.states.includes(editedDFA.initialState)) {
      setError("Initial state must be one of the defined states")
      return false
    }

    // Check if accepting states are in states
    for (const state of editedDFA.acceptingStates) {
      if (!editedDFA.states.includes(state)) {
        setError(`Accepting state '${state}' is not in the defined states`)
        return false
      }
    }

    // Check transitions
    for (const transition of editedDFA.transitions) {
      if (!editedDFA.states.includes(transition.from)) {
        setError(`Transition from state '${transition.from}' which is not defined`)
        return false
      }

      if (!editedDFA.states.includes(transition.to)) {
        setError(`Transition to state '${transition.to}' which is not defined`)
        return false
      }

      if (!editedDFA.alphabet.includes(transition.symbol)) {
        setError(`Transition symbol '${transition.symbol}' is not in the alphabet`)
        return false
      }
    }

    // Check if the DFA is deterministic (no duplicate from-symbol pairs)
    const transitionMap = new Map<string, boolean>()
    for (const transition of editedDFA.transitions) {
      const key = `${transition.from}:${transition.symbol}`
      if (transitionMap.has(key)) {
        setError(`Multiple transitions from state '${transition.from}' with symbol '${transition.symbol}'`)
        return false
      }
      transitionMap.set(key, true)
    }

    return true
  }

  const handleSave = () => {
    if (validateDFA()) {
      setConfirmMessage("Tem certeza que deseja salvar as alterações no AFD?")
      setShowConfirmModal(true)
    }
  }

  const confirmSave = () => {
    // Crie uma cópia profunda do objeto para garantir que todas as referências sejam atualizadas
    const updatedDFA = JSON.parse(JSON.stringify(editedDFA))
    onEdit(updatedDFA)
    setError(null)
    setShowConfirmModal(false)
  }

  const addState = () => {
    if (!newState.trim()) return

    if (editedDFA.states.includes(newState)) {
      setError(`State '${newState}' already exists`)
      return
    }

    setEditedDFA({
      ...editedDFA,
      states: [...editedDFA.states, newState],
    })

    setNewState("")
    setError(null)
  }

  const removeState = (state: string) => {
    // Check if it's the initial state
    if (state === editedDFA.initialState) {
      setError("Cannot remove the initial state")
      return
    }

    // Remove state from states
    const newStates = editedDFA.states.filter((s) => s !== state)

    // Remove state from accepting states
    const newAcceptingStates = editedDFA.acceptingStates.filter((s) => s !== state)

    // Remove transitions involving this state
    const newTransitions = editedDFA.transitions.filter((t) => t.from !== state && t.to !== state)

    setEditedDFA({
      ...editedDFA,
      states: newStates,
      acceptingStates: newAcceptingStates,
      transitions: newTransitions,
    })

    setError(null)
  }

  const addSymbol = () => {
    if (!newSymbol.trim()) return

    if (editedDFA.alphabet.includes(newSymbol)) {
      setError(`Symbol '${newSymbol}' already exists in the alphabet`)
      return
    }

    setEditedDFA({
      ...editedDFA,
      alphabet: [...editedDFA.alphabet, newSymbol],
    })

    setNewSymbol("")
    setError(null)
  }

  const removeSymbol = (symbol: string) => {
    // Remove symbol from alphabet
    const newAlphabet = editedDFA.alphabet.filter((s) => s !== symbol)

    // Remove transitions involving this symbol
    const newTransitions = editedDFA.transitions.filter((t) => t.symbol !== symbol)

    setEditedDFA({
      ...editedDFA,
      alphabet: newAlphabet,
      transitions: newTransitions,
    })

    setError(null)
  }

  const addTransition = () => {
    if (!transitionFrom || !transitionSymbol || !transitionTo) {
      setError("All transition fields are required")
      return
    }

    // Check if transition already exists
    const existingTransition = editedDFA.transitions.find(
      (t) => t.from === transitionFrom && t.symbol === transitionSymbol,
    )

    if (existingTransition) {
      setError(`Transition from '${transitionFrom}' with symbol '${transitionSymbol}' already exists`)
      return
    }

    const newTransition: Transition = {
      from: transitionFrom,
      symbol: transitionSymbol,
      to: transitionTo,
    }

    setEditedDFA({
      ...editedDFA,
      transitions: [...editedDFA.transitions, newTransition],
    })

    setTransitionFrom("")
    setTransitionSymbol("")
    setTransitionTo("")
    setIsAddingTransition(false)
    setError(null)
  }

  const removeTransition = (index: number) => {
    const newTransitions = [...editedDFA.transitions]
    newTransitions.splice(index, 1)

    setEditedDFA({
      ...editedDFA,
      transitions: newTransitions,
    })

    setError(null)
  }

  const toggleAcceptingState = (state: string) => {
    if (editedDFA.acceptingStates.includes(state)) {
      // Remove from accepting states
      setEditedDFA({
        ...editedDFA,
        acceptingStates: editedDFA.acceptingStates.filter((s) => s !== state),
      })
    } else {
      // Add to accepting states
      setEditedDFA({
        ...editedDFA,
        acceptingStates: [...editedDFA.acceptingStates, state],
      })
    }

    setError(null)
  }

  const setInitialState = (state: string) => {
    // Não permitir a alteração do estado inicial
    setError("Não é permitido alterar o estado inicial")

    // Manter o estado inicial original
    // Não fazemos nada aqui, apenas mostramos o erro
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Editor de AFD</h2>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* States Section */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Estados</h3>

          <div className="flex space-x-2 mb-4">
            <Input
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              placeholder="Nome do novo estado..."
              className="flex-1"
            />
            <Button onClick={addState}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-y-auto max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24 text-center">Inicial</TableHead>
                  <TableHead className="w-24 text-center">Aceitação</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedDFA.states.map((state) => (
                  <TableRow key={state}>
                    <TableCell>{state}</TableCell>
                    <TableCell className="text-center">
                      <input
                        type="radio"
                        checked={state === editedDFA.initialState}
                        onChange={() => setInitialState(state)}
                        className="h-4 w-4"
                        disabled={true} // Desabilitar a alteração do estado inicial
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={editedDFA.acceptingStates.includes(state)}
                        onChange={() => toggleAcceptingState(state)}
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeState(state)}
                        disabled={state === editedDFA.initialState} // Desabilitar a remoção do estado inicial
                      >
                        <Trash2
                          className={`h-4 w-4 ${state === editedDFA.initialState ? "text-gray-300" : "text-red-500"}`}
                        />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Alphabet Section */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Alfabeto</h3>

          <div className="flex space-x-2 mb-4">
            <Input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="Novo símbolo..."
              className="flex-1"
              maxLength={1}
            />
            <Button onClick={addSymbol}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {editedDFA.alphabet.map((symbol) => (
              <Badge key={symbol} variant="outline" className="text-base px-3 py-1">
                {symbol}
                <Button variant="ghost" size="icon" className="h-4 w-4 ml-2" onClick={() => removeSymbol(symbol)}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Transitions Section */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Transições</h3>

          <Dialog open={isAddingTransition} onOpenChange={setIsAddingTransition}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Transição
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Transição</DialogTitle>
                <DialogDescription>Defina uma nova transição para o AFD</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right">De:</label>
                  <Select value={transitionFrom} onValueChange={setTransitionFrom}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {editedDFA.states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right">Símbolo:</label>
                  <Select value={transitionSymbol} onValueChange={setTransitionSymbol}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione o símbolo" />
                    </SelectTrigger>
                    <SelectContent>
                      {editedDFA.alphabet.map((symbol) => (
                        <SelectItem key={symbol} value={symbol}>
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right">Para:</label>
                  <Select value={transitionTo} onValueChange={setTransitionTo}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {editedDFA.states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingTransition(false)}>
                  Cancelar
                </Button>
                <Button onClick={addTransition}>Adicionar Transição</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-y-auto max-h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>De</TableHead>
                <TableHead>Símbolo</TableHead>
                <TableHead>Para</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedDFA.transitions.map((transition, index) => (
                <TableRow key={index}>
                  <TableCell>{transition.from}</TableCell>
                  <TableCell>{transition.symbol}</TableCell>
                  <TableCell>{transition.to}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeTransition(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {showConfirmModal && (
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Alterações</DialogTitle>
              <DialogDescription>{confirmMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmSave}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default DFAEditor
