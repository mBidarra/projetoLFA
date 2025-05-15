"use client"
import type { DFA } from "@/lib/dfa-parser"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import Image from "next/image"

interface DFAExporterProps {
  dfa: DFA
}

const DFAExporter = ({ dfa }: DFAExporterProps) => {
  const exportToJSON = () => {
    const jsonData = JSON.stringify(dfa, null, 2)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "dfa-definition.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportToText = () => {
    let textData = ""

    // Alphabet
    textData += `Alfabeto Σ = { ${dfa.alphabet.join(", ")} }\n\n`

    // States
    textData += `Estados Q = { ${dfa.states.join(", ")} }\n\n`

    // Initial state
    textData += `Estado inicial q0 = ${dfa.initialState}\n`

    // Accepting states
    textData += `Estado(s) aceitador(es) F = { ${dfa.acceptingStates.join(", ")} }\n\n`

    // Transitions
    textData += "Transições (formato s:e>s'):\n"
    const transitionStrings = dfa.transitions.map((t) => `${t.from}:${t.symbol}>${t.to}`)
    textData += transitionStrings.join(", ")

    const blob = new Blob([textData], { type: "text/plain" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "dfa-definition.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <Image src="/images/nasa-logo.png" alt="NASA Logo" width={60} height={50} className="mr-4" />
        <div>
          <h2 className="text-xl font-bold text-nasa-blue">Exportar AFD</h2>
          <p className="text-sm text-nasa-darkgray">Salve a definição do seu autômato</p>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button onClick={exportToJSON} variant="outline" className="border-nasa-blue">
          <Download className="mr-2 h-4 w-4" />
          Exportar como JSON
        </Button>

        <Button onClick={exportToText} variant="default">
          <Download className="mr-2 h-4 w-4" />
          Exportar como Texto
        </Button>
      </div>
    </div>
  )
}

export default DFAExporter
