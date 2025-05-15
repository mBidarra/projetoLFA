"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DFAVisualizer from "@/components/dfa-visualizer"
import DFAExporter from "@/components/dfa-exporter"
import TestSuite from "@/components/test-suite"
import DFAEditor from "@/components/dfa-editor"
import type { DFA } from "@/lib/dfa-parser"
import { defaultDFA } from "@/lib/default-dfa"

export default function Home() {
  const [dfa, setDFA] = useState<DFA>(defaultDFA)
  const [activeTab, setActiveTab] = useState("visualizer")

  const handleDFAImport = (newDFA: DFA) => {
    setDFA(newDFA)
  }

  const handleDFAEdit = (newDFA: DFA) => {
    // Crie uma cópia profunda do objeto para garantir que todas as referências sejam atualizadas
    const updatedDFA = JSON.parse(JSON.stringify(newDFA))
    setDFA(updatedDFA)

    // Forçar a mudança para a aba de visualizador após a edição
    setActiveTab("visualizer")
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-nasa-gray">
      <div className="container mx-auto p-4 max-w-7xl">
        <header className="py-6 mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-nasa-blue">Visualizador e Simulador de AFD</h1>
          <div className="h-1 w-32 bg-nasa-red mx-auto"></div>
        </header>

        {/* Exporter */}
        <div className="mb-6 nasa-card p-4 bg-white">
          <DFAExporter dfa={dfa} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-1 md:grid-cols-3 mb-4 bg-nasa-gray">
            <TabsTrigger value="visualizer" className="data-[state=active]:bg-nasa-blue data-[state=active]:text-white">
              Visualizador e Simulador
            </TabsTrigger>
            <TabsTrigger value="editor" className="data-[state=active]:bg-nasa-blue data-[state=active]:text-white">
              Editor
            </TabsTrigger>
            <TabsTrigger value="test-suite" className="data-[state=active]:bg-nasa-blue data-[state=active]:text-white">
              Testes sem simulação AFD
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visualizer" className="border rounded-lg p-4 bg-white shadow-md">
            <DFAVisualizer dfa={dfa} />
          </TabsContent>

          <TabsContent value="editor" className="border rounded-lg p-4 bg-white shadow-md">
            <DFAEditor dfa={dfa} onEdit={handleDFAEdit} />
          </TabsContent>

          <TabsContent value="test-suite" className="border rounded-lg p-4 bg-white shadow-md">
            <TestSuite dfa={dfa} />
          </TabsContent>
        </Tabs>

        <footer className="mt-12 py-4 text-center text-sm text-nasa-darkgray">
          <p>Simulador de Autômatos Finitos Determinísticos &copy; {new Date().getFullYear()}</p>
          <p className="mt-1">Inspirado no design da NASA</p>
        </footer>
      </div>
    </main>
  )
}
