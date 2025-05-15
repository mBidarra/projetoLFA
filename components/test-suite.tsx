"use client"

import type React from "react"

import { useState } from "react"
import type { DFA } from "@/lib/dfa-parser"
import { simulateDFA } from "@/lib/dfa-simulator"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, Play, CheckCircle2, XCircle } from "lucide-react"

interface TestResult {
  input: string
  accepted: boolean
  finalState: string
  steps: number
}

interface DFATestSuiteProps {
  dfa: DFA
}

const TestSuite = ({ dfa }: DFATestSuiteProps) => {
  const [testInputs, setTestInputs] = useState<string>("")
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTestInputs(e.target.value)
  }

  const runTests = () => {
    setIsRunning(true)

    // Analisar entradas (uma por linha)
    const inputs = testInputs
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    // Executar simulação para cada entrada
    const newResults: TestResult[] = inputs.map((input) => {
      const result = simulateDFA(dfa, input)
      return {
        input,
        accepted: result.accepted,
        finalState: result.steps[result.steps.length - 1].currentState,
        steps: result.steps.length,
      }
    })

    setResults(newResults)
    setIsRunning(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string

      // Lidar com formato CSV
      if (file.name.endsWith(".csv")) {
        const lines = content.split("\n").map((line) => line.trim())
        setTestInputs(lines.join("\n"))
      } else {
        setTestInputs(content)
      }
    }
    reader.readAsText(file)
  }

  const exportResults = () => {
    // Criar conteúdo CSV
    let csvContent = "Input,Accepted,Final State,Steps\n"

    results.forEach((result) => {
      csvContent += `"${result.input}",${result.accepted},${result.finalState},${result.steps}\n`
    })

    // Criar e baixar arquivo
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "dfa-test-results.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getAcceptanceRate = () => {
    if (results.length === 0) return "N/A"
    const acceptedCount = results.filter((r) => r.accepted).length
    const percentage = (acceptedCount / results.length) * 100
    return `${percentage.toFixed(1)}% (${acceptedCount}/${results.length})`
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-xl font-semibold">Suite de Testes</h2>
        <p className="text-gray-600">Digite as entradas de teste (uma por linha) ou carregue um arquivo CSV</p>

        <Textarea
          value={testInputs}
          onChange={handleInputChange}
          placeholder="Digite as entradas de teste, uma por linha..."
          className="min-h-[150px] font-mono"
        />

        <div className="flex space-x-2">
          <Button variant="outline" className="relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".txt,.csv"
              onChange={handleFileUpload}
            />
            <Upload className="mr-2 h-4 w-4" />
            Carregar Testes
          </Button>

          <Button onClick={runTests} className="flex-1" disabled={isRunning || testInputs.trim().length === 0}>
            <Play className="mr-2 h-4 w-4" />
            Executar Testes
          </Button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Resultados dos Testes</h3>
            <div className="flex items-center space-x-4">
              <div>
                <span className="font-medium">Taxa de Aceitação:</span>{" "}
                <Badge variant="outline">{getAcceptanceRate()}</Badge>
              </div>
              <Button variant="outline" onClick={exportResults}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Resultados
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead className="w-24 text-center">Resultado</TableHead>
                  <TableHead className="w-32">Estado Final</TableHead>
                  <TableHead className="w-24 text-right">Passos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-mono">{result.input}</TableCell>
                    <TableCell className="text-center">
                      {result.accepted ? (
                        <Badge variant="success" className="flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aceito
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center justify-center">
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{result.finalState}</TableCell>
                    <TableCell className="text-right">{result.steps}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestSuite
