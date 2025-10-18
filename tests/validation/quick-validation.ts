#!/usr/bin/env tsx

/**
 * Quick System Validation Script
 * 
 * Performs basic validation checks that can run without full Docker environment
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

interface ValidationResult {
    category: string
    checks: Array<{
        name: string
        status: 'PASS' | 'FAIL' | 'WARNING'
        message: string
    }>
}

class QuickValidator {
    private results: ValidationResult[] = []

    private addResult(category: string, name: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string) {
        let categoryResult = this.results.find(r => r.category === category)
        if (!categoryResult) {
            categoryResult = { category, checks: [] }
            this.results.push(categoryResult)
        }
        categoryResult.checks.push({ name, status, message })
    }

    async validateProjectStructure(): Promise<void> {
        console.log('📁 Validating Project Structure...')

        // Check essential directories
        const requiredDirs = [
            'app/api',
            'components',
            'lib',
            'prisma',
            'agent/src',
            'types'
        ]

        for (const dir of requiredDirs) {
            if (existsSync(dir)) {
                this.addResult('Project Structure', `Directory: ${dir}`, 'PASS', 'Directory exists')
            } else {
                this.addResult('Project Structure', `Directory: ${dir}`, 'FAIL', 'Directory missing')
            }
        }

        // Check essential files
        const requiredFiles = [
            'package.json',
            'docker-compose.yml',
            'prisma/schema.prisma',
            'app/api/health/route.ts',
            'app/api/help-requests/route.ts',
            'app/api/knowledge/route.ts',
            'agent/package.json'
        ]

        for (const file of requiredFiles) {
            if (existsSync(file)) {
                this.addResult('Project Structure', `File: ${file}`, 'PASS', 'File exists')
            } else {
                this.addResult('Project Structure', `File: ${file}`, 'FAIL', 'File missing')
            }
        }
    }

    async validateConfiguration(): Promise<void> {
        console.log('⚙️ Validating Configuration...')

        // Check package.json
        try {
            const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

            const requiredDeps = [
                'next',
                'react',
                '@prisma/client',
                'zustand',
                '@tanstack/react-query'
            ]

            for (const dep of requiredDeps) {
                if (packageJson.dependencies?.[dep]) {
                    this.addResult('Configuration', `Dependency: ${dep}`, 'PASS', `Version: ${packageJson.dependencies[dep]}`)
                } else {
                    this.addResult('Configuration', `Dependency: ${dep}`, 'FAIL', 'Missing dependency')
                }
            }

            // Check scripts
            const requiredScripts = ['dev', 'build', 'db:generate', 'db:push']
            for (const script of requiredScripts) {
                if (packageJson.scripts?.[script]) {
                    this.addResult('Configuration', `Script: ${script}`, 'PASS', 'Script defined')
                } else {
                    this.addResult('Configuration', `Script: ${script}`, 'FAIL', 'Script missing')
                }
            }

        } catch (error) {
            this.addResult('Configuration', 'package.json', 'FAIL', 'Cannot parse package.json')
        }

        // Check Prisma schema
        try {
            const schema = readFileSync('prisma/schema.prisma', 'utf8')

            const requiredModels = ['HelpRequest', 'KnowledgeBase', 'SystemLog']
            for (const model of requiredModels) {
                if (schema.includes(`model ${model}`)) {
                    this.addResult('Configuration', `Prisma Model: ${model}`, 'PASS', 'Model defined')
                } else {
                    this.addResult('Configuration', `Prisma Model: ${model}`, 'FAIL', 'Model missing')
                }
            }
        } catch (error) {
            this.addResult('Configuration', 'Prisma Schema', 'FAIL', 'Cannot read schema.prisma')
        }

        // Check environment example
        if (existsSync('.env.example')) {
            this.addResult('Configuration', '.env.example', 'PASS', 'Environment template exists')
        } else {
            this.addResult('Configuration', '.env.example', 'WARNING', 'No environment template found')
        }
    }

    async validateAPIRoutes(): Promise<void> {
        console.log('🛣️ Validating API Routes...')

        const apiRoutes = [
            'app/api/health/route.ts',
            'app/api/help-requests/route.ts',
            'app/api/knowledge/route.ts'
        ]

        for (const route of apiRoutes) {
            if (existsSync(route)) {
                try {
                    const content = readFileSync(route, 'utf8')

                    // Check for HTTP methods
                    const methods = ['GET', 'POST', 'PUT', 'DELETE']
                    const foundMethods = methods.filter(method => content.includes(`export async function ${method}`))

                    if (foundMethods.length > 0) {
                        this.addResult('API Routes', route, 'PASS', `Methods: ${foundMethods.join(', ')}`)
                    } else {
                        this.addResult('API Routes', route, 'WARNING', 'No HTTP methods found')
                    }
                } catch (error) {
                    this.addResult('API Routes', route, 'FAIL', 'Cannot read route file')
                }
            } else {
                this.addResult('API Routes', route, 'FAIL', 'Route file missing')
            }
        }
    }

    async validateComponents(): Promise<void> {
        console.log('🧩 Validating Components...')

        const componentDirs = [
            'components/ui',
            'components/dashboard',
            'components/knowledge'
        ]

        for (const dir of componentDirs) {
            if (existsSync(dir)) {
                try {
                    const files = require('fs').readdirSync(dir)
                    const tsxFiles = files.filter((f: string) => f.endsWith('.tsx'))

                    if (tsxFiles.length > 0) {
                        this.addResult('Components', dir, 'PASS', `${tsxFiles.length} component(s) found`)
                    } else {
                        this.addResult('Components', dir, 'WARNING', 'No TSX components found')
                    }
                } catch (error) {
                    this.addResult('Components', dir, 'FAIL', 'Cannot read directory')
                }
            } else {
                this.addResult('Components', dir, 'WARNING', 'Component directory missing')
            }
        }
    }

    async validateAgent(): Promise<void> {
        console.log('🤖 Validating Agent...')

        // Check agent package.json
        const agentPackageJson = 'agent/package.json'
        if (existsSync(agentPackageJson)) {
            try {
                const packageJson = JSON.parse(readFileSync(agentPackageJson, 'utf8'))

                const requiredDeps = ['express', 'axios', 'winston']
                for (const dep of requiredDeps) {
                    if (packageJson.dependencies?.[dep]) {
                        this.addResult('Agent', `Dependency: ${dep}`, 'PASS', `Version: ${packageJson.dependencies[dep]}`)
                    } else {
                        this.addResult('Agent', `Dependency: ${dep}`, 'WARNING', 'Dependency missing')
                    }
                }
            } catch (error) {
                this.addResult('Agent', 'package.json', 'FAIL', 'Cannot parse agent package.json')
            }
        } else {
            this.addResult('Agent', 'package.json', 'FAIL', 'Agent package.json missing')
        }

        // Check agent source files
        const agentFiles = [
            'agent/src/index.ts',
            'agent/Dockerfile'
        ]

        for (const file of agentFiles) {
            if (existsSync(file)) {
                this.addResult('Agent', file, 'PASS', 'File exists')
            } else {
                this.addResult('Agent', file, 'WARNING', 'File missing')
            }
        }
    }

    async validateDocker(): Promise<void> {
        console.log('🐳 Validating Docker Configuration...')

        // Check Docker Compose
        if (existsSync('docker-compose.yml')) {
            try {
                const compose = readFileSync('docker-compose.yml', 'utf8')

                const requiredServices = ['postgres', 'web', 'agent']
                for (const service of requiredServices) {
                    if (compose.includes(`${service}:`)) {
                        this.addResult('Docker', `Service: ${service}`, 'PASS', 'Service defined')
                    } else {
                        this.addResult('Docker', `Service: ${service}`, 'WARNING', 'Service missing')
                    }
                }
            } catch (error) {
                this.addResult('Docker', 'docker-compose.yml', 'FAIL', 'Cannot read docker-compose.yml')
            }
        } else {
            this.addResult('Docker', 'docker-compose.yml', 'FAIL', 'Docker Compose file missing')
        }

        // Check Dockerfiles
        const dockerfiles = ['Dockerfile.web', 'agent/Dockerfile']
        for (const dockerfile of dockerfiles) {
            if (existsSync(dockerfile)) {
                this.addResult('Docker', dockerfile, 'PASS', 'Dockerfile exists')
            } else {
                this.addResult('Docker', dockerfile, 'WARNING', 'Dockerfile missing')
            }
        }

        // Check if Docker is available
        try {
            await execAsync('docker --version')
            this.addResult('Docker', 'Docker CLI', 'PASS', 'Docker is available')
        } catch (error) {
            this.addResult('Docker', 'Docker CLI', 'FAIL', 'Docker not available')
        }
    }

    async runValidation(): Promise<void> {
        console.log('🔍 AI Voice Receptionist - Quick Validation')
        console.log('='.repeat(50))

        await this.validateProjectStructure()
        await this.validateConfiguration()
        await this.validateAPIRoutes()
        await this.validateComponents()
        await this.validateAgent()
        await this.validateDocker()

        this.printResults()
    }

    private printResults(): void {
        console.log('\n📊 Validation Results')
        console.log('='.repeat(50))

        let totalChecks = 0
        let passedChecks = 0
        let failedChecks = 0
        let warningChecks = 0

        for (const result of this.results) {
            console.log(`\n📂 ${result.category}`)
            console.log('-'.repeat(30))

            for (const check of result.checks) {
                totalChecks++
                const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️'
                console.log(`${icon} ${check.name}: ${check.message}`)

                if (check.status === 'PASS') passedChecks++
                else if (check.status === 'FAIL') failedChecks++
                else warningChecks++
            }
        }

        console.log('\n' + '='.repeat(50))
        console.log(`📈 Summary: ${totalChecks} total checks`)
        console.log(`✅ Passed: ${passedChecks}`)
        console.log(`❌ Failed: ${failedChecks}`)
        console.log(`⚠️  Warnings: ${warningChecks}`)

        const successRate = ((passedChecks / totalChecks) * 100).toFixed(1)
        console.log(`📊 Success Rate: ${successRate}%`)

        if (failedChecks === 0) {
            console.log('\n🎉 All critical validations passed!')
        } else {
            console.log(`\n⚠️  ${failedChecks} critical issues found. Please address them before deployment.`)
        }

        // Recommendations
        console.log('\n💡 Recommendations:')
        if (failedChecks > 0) {
            console.log('- Address all failed checks before running the system')
        }
        if (warningChecks > 0) {
            console.log('- Review warnings for potential improvements')
        }
        console.log('- Run full system tests with `npm test` once services are running')
        console.log('- Use `docker-compose up` to start all services')
        console.log('- Check logs if any services fail to start')
    }
}

// Run validation if this file is executed directly
if (require.main === module) {
    const validator = new QuickValidator()
    validator.runValidation().catch(error => {
        console.error('Validation failed:', error)
        process.exit(1)
    })
}

export { QuickValidator }