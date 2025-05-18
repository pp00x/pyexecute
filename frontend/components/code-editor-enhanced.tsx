"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Loader2, Save, Upload, Undo, Redo, Code, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { xcodeLight } from "@uiw/codemirror-theme-xcode"
import { useTheme } from "next-themes"

interface CodeEditorProps {
  code: string
  setCode: (code: string) => void
  inputData: string
  setInputData: (inputData: string) => void
  isExecuting: boolean
  onExecute: () => void
}

export function CodeEditorEnhanced({
  code,
  setCode,
  inputData,
  setInputData,
  isExecuting,
  onExecute,
}: CodeEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [history, setHistory] = useState<string[]>([code])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { theme } = useTheme()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Add to history when code changes, but only if it's a user action (not undo/redo)
  useEffect(() => {
    const lastCode = history[historyIndex]
    if (code !== lastCode && isMounted) {
      // Add new state to history, removing any future states
      const newHistory = [...history.slice(0, historyIndex + 1), code]
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }, [code, isMounted])

  // Add global keyboard shortcut for Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the editor has focus
      if (document.activeElement && editorRef.current?.contains(document.activeElement)) {
        // Check for Ctrl+Enter or Cmd+Enter
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault()
          if (!isExecuting && code.trim()) {
            onExecute()
            toast({
              title: "Executing Code",
              description: "Running your Python code (Ctrl+Enter)",
            })
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [code, isExecuting, onExecute, toast])

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setCode(history[historyIndex - 1])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setCode(history[historyIndex + 1])
    }
  }

  const handleOpenFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Only accept .py files
    if (!file.name.endsWith(".py")) {
      toast({
        title: "Invalid File Type",
        description: "Please select a Python (.py) file",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()

    // Handle potential errors during file reading
    reader.onerror = () => {
      toast({
        title: "Error Reading File",
        description: "Failed to read the selected file",
        variant: "destructive",
      })
    }

    reader.onload = (e) => {
      const content = e.target?.result as string
      // Set the code state with the file content
      // This will be used when sending the request to the API
      setCode(content)
      toast({
        title: "File Loaded",
        description: `Successfully loaded ${file.name}`,
      })
    }

    // Read the file as text
    reader.readAsText(file)

    // Reset the input value so the same file can be selected again
    if (event.target) {
      event.target.value = ""
    }
  }

  const handleSaveFile = () => {
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "python_script.py"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "File Saved",
      description: "Your Python script has been saved to disk",
    })
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Copied to Clipboard",
      description: "Code has been copied to clipboard",
    })
  }

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="h-8 w-8"
                  >
                    <Undo className="h-4 w-4" />
                    <span className="sr-only">Undo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Undo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="h-8 w-8"
                  >
                    <Redo className="h-4 w-4" />
                    <span className="sr-only">Redo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Redo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleOpenFile} className="h-8 w-8">
                    <Upload className="h-4 w-4" />
                    <span className="sr-only">Open File</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open Python File</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleSaveFile} className="h-8 w-8">
                    <Save className="h-4 w-4" />
                    <span className="sr-only">Save File</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save as Python File</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={copyToClipboard} className="h-8 w-8">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copy Code</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy to Clipboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".py"
              className="hidden"
              aria-label="Open Python file"
            />

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
        <div className="relative border rounded-md overflow-hidden" ref={editorRef}>
          <div className="absolute top-2 right-2 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center h-6 w-6 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    <Code className="h-3 w-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Python Syntax Highlighting (Ctrl+Enter to run)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <CodeMirror
            value={code}
            height="320px"
            onChange={setCode}
            theme={theme === "dark" ? vscodeDark : xcodeLight}
            extensions={[python()]}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              foldGutter: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              searchKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
            }}
            className="min-h-[320px]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="input-data" className="text-lg font-medium">
          Input Data (Optional)
        </Label>
        <textarea
          id="input-data"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="Enter any input data your code might need..."
          className="font-mono h-24 w-full resize-none bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          onKeyDown={(e) => {
            // Also allow Ctrl+Enter in the input data field
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault()
              if (!isExecuting && code.trim()) {
                onExecute()
              }
            }
          }}
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
            <>Execute Code (Ctrl+Enter)</>
          )}
        </Button>
      </div>
    </div>
  )
}
