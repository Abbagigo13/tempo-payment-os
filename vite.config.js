import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Only run the app's own tests. The contract tests in ./contracts
    // are Hardhat tests: run them with `npx hardhat test` in that folder.
    include: ['src/**/*.test.{js,jsx}'],
  },
})
