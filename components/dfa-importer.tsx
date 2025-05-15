"use client"

import type React from "react"

import { useState } from "react"
import { parseDFA, type DFA } from "@/lib/dfa-parser"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Upload } from "lucide-react"

interface DFAImporterProps {
  onImport: (dfa: DFA) => void
}

const DFAImporter = ({ onImport }: DFAImporterProps) => {
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    setError(null)
  }

  const handleImport = () => {
    try {
      const dfa = parseDFA(input)
      onImport(dfa)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setInput(content)
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-xl font-semibold">Importar Definição do AFD</h2>

      <div className="flex flex-col space-y-2">
        <Textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Cole a definição do AFD aqui ou faça upload de um arquivo..."
          className="min-h-[150px] font-mono"
        />

        <div className="flex space-x-2">
          <Button variant="outline" className="relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".txt"
              onChange={handleFileUpload}
            />
            <Upload className="mr-2 h-4 w-4" />
            Carregar Arquivo
          </Button>

          <Button onClick={handleImport} className="flex-1">
            Importar AFD
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-gray-500">
        <p className="font-semibold">Formato esperado:</p>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {`Alfabeto Σ = { a, b, c, ... }

Estados Q = { s0, s1, s2, ... }

Estado inicial q0 = s0  
Estado(s) aceitador(es) F = { s1, s2, ... }

Transições (formato s:e>s'):
s0:a>s1, s0:b>s2, ...`}
        </pre>
      </div>
    </div>
  )
}

export default DFAImporter
