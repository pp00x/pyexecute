import { CodeExecutor } from "@/components/code-executor"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8 text-center relative">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <div className="inline-block mb-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative px-7 py-4 bg-white dark:bg-gray-900 ring-1 ring-gray-900/5 dark:ring-gray-200/10 rounded-lg leading-none flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-purple-600 mr-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19c-4.3 0-7.8-3.4-7.8-7.5 0-4.1 3.5-7.5 7.8-7.5s7.8 3.4 7.8 7.5c0 4.1-3.5 7.5-7.8 7.5Z" />
                  <path d="M12 19v3" />
                  <path d="M12 3V0" />
                  <path d="M3.5 5.5 1.7 3.7" />
                  <path d="M20.5 5.5l1.8-1.8" />
                  <path d="M3.5 13.5l-1.8 1.8" />
                  <path d="M20.5 13.5l1.8 1.8" />
                </svg>
                <span className="font-semibold text-xl text-gray-900 dark:text-white">PyExecute</span>
              </div>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 mb-2">
            Python Code Executer
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
            Write, execute, Python code in a beautiful environment
          </p>
        </header>

        <CodeExecutor />
      </div>
    </main>
  )
}
