"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface CodeEditorProps {
  code: string
  setCode: (code: string) => void
  inputData: string
  setInputData: (inputData: string) => void
  isExecuting: boolean
  onExecute: () => void
}

export function CodeEditor({ code, setCode, inputData, setInputData, isExecuting, onExecute }: CodeEditorProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div className="space-y-4 bg-white dark:bg-gray-900 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-800 transition-all duration-300">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="code-editor" className="text-lg font-medium">
            Python Code
          </Label>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCode(
                  'print("Hello, World!")\n\n# Create a simple calculation\nresult = 42 * 2\nprint(f"The answer is {result}")',
                )
              }}
            >
              Example
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCode("")
              }}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="relative">
          <Textarea
            id="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="# Write your Python code here..."
            className="font-mono h-80 resize-none bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="input-data" className="text-lg font-medium">
          Input Data (Optional)
        </Label>
        <Textarea
          id="input-data"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="Enter any input data your code might need..."
          className="font-mono h-24 resize-none bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onExecute}
          disabled={isExecuting || !code.trim()}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2 rounded-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            "Execute Code"
          )}
        </Button>
      </div>
    </div>
  )
}
