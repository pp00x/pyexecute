"use client"

import { useState } from "react"
import { CodeEditorEnhanced } from "@/components/code-editor-enhanced"
import { ExecutionResults } from "@/components/execution-results"
import { useToast } from "@/hooks/use-toast"

interface ExecutionResponse {
  stdout: string | null
  stderr: string | null
  error_details: {
    type: string
    message: string
  } | null
  exit_code: number
  output_files:
    | {
        filename: string
        content_base64: string
      }[]
    | null
}

export function CodeExecutor() {
  const [code, setCode] = useState(
    'name = input("Enter your name: ")\nprint(f"Hello, {name}!")\n\n# Create a file\nwith open("/app/outputs/greeting.txt", "w") as f:\n    f.write(f"Greetings to {name}")\nprint("File created.")',
  )
  const [inputData, setInputData] = useState("World")
  const [isExecuting, setIsExecuting] = useState(false)
  const [results, setResults] = useState<ExecutionResponse | null>(null)
  const { toast } = useToast()

  const executeCode = async () => {
    if (!code.trim()) return

    setIsExecuting(true)
    setResults(null)

    try {
      // The code state (which may have been loaded from a file)
      // is included in the request body
      const response = await fetch("/api/execute", { // Changed path from /api/v1/execute
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code, // This is the Python code from the editor or loaded file
          input_data: inputData || null,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResults(data)

      if (data.error_details) {
        toast({
          title: "Execution Error",
          description: data.error_details.message,
          variant: "destructive",
        })
      } else if (data.exit_code === 0) {
        toast({
          title: "Success",
          description: "Code executed successfully!",
        })
      } else {
        toast({
          title: "Script Error",
          description: "Your script encountered an error during execution.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error executing code:", error)
      toast({
        title: "API Error",
        description: "Failed to connect to the execution service.",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lg:col-span-1">
        <CodeEditorEnhanced
          code={code}
          setCode={setCode}
          inputData={inputData}
          setInputData={setInputData}
          isExecuting={isExecuting}
          onExecute={executeCode}
        />
      </div>
      <div className="lg:col-span-1">
        <ExecutionResults results={results} isExecuting={isExecuting} />
      </div>
    </div>
  )
}
