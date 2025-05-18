"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Copy, Check, FileText, ImageIcon, File, AlertCircle, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface ExecutionResultsProps {
  results: {
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
  } | null
  isExecuting: boolean
}

export function ExecutionResults({ results, isExecuting }: ExecutionResultsProps) {
  const [activeTab, setActiveTab] = useState("output")
  const [copied, setCopied] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(null), 2000)
      return () => clearTimeout(timeout)
    }
  }, [copied])

  useEffect(() => {
    // Switch to the files tab if there are output files and no stdout/stderr
    if (
      results?.output_files?.length &&
      (!results.stdout || results.stdout.trim() === "") &&
      (!results.stderr || results.stderr.trim() === "")
    ) {
      setActiveTab("files")
    }
  }, [results])

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
  }

  const getFileIcon = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase()
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(extension || "")) {
      return <ImageIcon className="h-5 w-5" />
    } else if (["txt", "md", "csv", "json", "xml", "html", "css", "js", "py"].includes(extension || "")) {
      return <FileText className="h-5 w-5" />
    }
    return <File className="h-5 w-5" />
  }

  // Function to download a file from base64 data
  const downloadFile = (filename: string, content_base64: string) => {
    try {
      // Create a Blob from the base64 data
      const byteCharacters = atob(content_base64)
      const byteArrays = []

      // Convert base64 to byte array
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512)

        const byteNumbers = new Array(slice.length)
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i)
        }

        const byteArray = new Uint8Array(byteNumbers)
        byteArrays.push(byteArray)
      }

      // Determine MIME type based on file extension
      let mimeType = "application/octet-stream" // Default MIME type
      const extension = filename.split(".").pop()?.toLowerCase()

      if (extension === "txt") mimeType = "text/plain"
      else if (extension === "json") mimeType = "application/json"
      else if (extension === "csv") mimeType = "text/csv"
      else if (extension === "html") mimeType = "text/html"
      else if (extension === "xml") mimeType = "application/xml"
      else if (extension === "pdf") mimeType = "application/pdf"
      else if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension || "")) {
        mimeType = `image/${extension === "jpg" ? "jpeg" : extension}`
      }

      // Create blob and download link
      const blob = new Blob(byteArrays, { type: mimeType })
      const url = URL.createObjectURL(blob)

      // Create download link and trigger click
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()

      // Clean up
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "File Downloaded",
        description: `${filename} has been downloaded successfully.`,
      })
    } catch (error) {
      console.error("Error downloading file:", error)
      toast({
        title: "Download Failed",
        description: "There was an error downloading the file.",
        variant: "destructive",
      })
    }
  }

  const renderFileContent = (file: { filename: string; content_base64: string }) => {
    const extension = file.filename.split(".").pop()?.toLowerCase()

    if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension || "")) {
      return (
        <div className="flex justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
          <img
            src={`data:image/${extension};base64,${file.content_base64}`}
            alt={file.filename}
            className="max-w-full max-h-96 object-contain rounded-md shadow-md"
          />
        </div>
      )
    }

    // For text files, decode and display
    try {
      const content = atob(file.content_base64)
      return (
        <div className="relative">
          <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto max-h-96 text-sm font-mono">
            {content}
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copyToClipboard(content, file.filename)}
          >
            {copied === file.filename ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )
    } catch (e) {
      return (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
          <p className="text-sm">Binary file - download to view</p>
        </div>
      )
    }
  }

  return (
    <Card className="h-full shadow-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
            Execution Results
          </span>
          {results && (
            <Badge
              className={`ml-2 ${
                results.exit_code === 0
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
              }`}
            >
              Exit Code: {results.exit_code}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isExecuting
            ? "Executing your Python code..."
            : results
              ? "View the output of your executed code"
              : "Execute your code to see results here"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isExecuting ? (
          <div className="flex flex-col items-center justify-center h-80 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
            <p className="text-gray-600 dark:text-gray-300 animate-pulse">Running your Python code...</p>
          </div>
        ) : !results ? (
          <div className="flex flex-col items-center justify-center h-80 space-y-4 text-gray-400 dark:text-gray-500">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4">
              <FileText className="h-10 w-10" />
            </div>
            <p className="text-center max-w-md">Your execution results will appear here after you run your code.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="output" className="relative">
                Output
                {results.stdout && results.stdout.trim() !== "" && (
                  <span className="absolute top-0 right-1 h-2 w-2 rounded-full bg-green-500"></span>
                )}
              </TabsTrigger>
              <TabsTrigger value="errors" className="relative">
                Errors
                {(results.stderr || results.error_details) && (
                  <span className="absolute top-0 right-1 h-2 w-2 rounded-full bg-red-500"></span>
                )}
              </TabsTrigger>
              <TabsTrigger value="files" className="relative">
                Files
                {results.output_files && results.output_files.length > 0 && (
                  <span className="absolute top-0 right-1 h-2 w-2 rounded-full bg-blue-500"></span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="output" className="mt-4">
              {results.stdout ? (
                <div className="relative">
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto max-h-96 text-sm font-mono">
                    {results.stdout}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(results.stdout || "", "stdout")}
                  >
                    {copied === "stdout" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400 text-center">
                  No standard output was produced.
                </div>
              )}
            </TabsContent>

            <TabsContent value="errors" className="mt-4">
              {results.error_details ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-300">{results.error_details.type}</h4>
                      <p className="text-red-700 dark:text-red-400 text-sm">{results.error_details.message}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {results.stderr ? (
                <div className="relative">
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto max-h-96 text-sm font-mono text-red-600 dark:text-red-400">
                    {results.stderr}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(results.stderr || "", "stderr")}
                  >
                    {copied === "stderr" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : !results.error_details ? (
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400 text-center">
                  No errors were produced.
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              {results.output_files && results.output_files.length > 0 ? (
                <div className="space-y-4">
                  {results.output_files.map((file, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(file.filename)}
                          <span className="font-medium">{file.filename}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-1"
                          onClick={() => downloadFile(file.filename, file.content_base64)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          <span>Download</span>
                        </Button>
                      </div>
                      <div className="p-2">{renderFileContent(file)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400 text-center">
                  No output files were generated.
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
