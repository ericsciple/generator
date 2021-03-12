#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const exec = require('./helpers/exec')
const JobInputs = require('./jobs/job-inputs').JobInputs
const deployJob = require('./jobs/deploy')
const healthJob = require('./jobs/health')
const canaryJob = require('./jobs/canary')

async function run() {
    // Args
    const args = process.argv.slice(2) // skip node-file-path and script-file-path
    const service = args.shift()
    if (!service) {
        throw new Error("Missing argument 'service'");
    }
    const eventPath = args.shift()
    if (!eventPath) {
        throw new Error("Missing argument 'eventPath'");
    }

    // Load rings
    const rings = JSON.parse(await fs.promises.readFile(path.join(__dirname, '..', 'rings.json')))[service]
    if (!rings) {
        throw new Error(`Invalid service '${service}'`)
    }

    // Load inputs
    const inputs = JSON.parse(await fs.promises.readFile(eventPath)).inputs
    let minRing = Number(inputs['min-ring'])
    if (isNaN(minRing) || !rings[minRing]) {
        throw new Error(`Invalid min ring '${minRing}'`)
    }
    let maxRing = Number(inputs['max-ring'])
    if (isNaN(maxRing) || !rings[maxRing]) {
        throw new Error(`Invalid max ring '${maxRing}'`)
    }
    else if (maxRing < minRing) {
        throw new Error(`Max ring must be greater or equal to min ring`)
    }
    const scaleUnitFilter = inputs['scale-unit']
    if (scaleUnitFilter) {
        let found = false
        for (const ringNumber of Object.keys(rings)) {
            if (rings[ringNumber].some(x => x === scaleUnitFilter)) {
                found = true
                minRing = ringNumber
                maxRing = ringNumber
                break
            }
        }
        if (!found) {
            throw new Error(`Invalid scale unit '${scaleUnitFilter}'`)
        }
    }
    const buildNumber = inputs.build
    if (!buildNumber) {
        // todo: resolve last-known-good if not specified
        throw new Error(`Invalid build number '${buildNumber}'`)
    }

    // Default job inputs
    const defaultJobInputs = new JobInputs()
    defaultJobInputs.rings = rings
    defaultJobInputs.minRing = minRing
    defaultJobInputs.maxRing = maxRing
    defaultJobInputs.scaleUnitFilter = scaleUnitFilter
    defaultJobInputs.buildNumber = buildNumber

    // Build the graph
    const graph = {
        jobs: {}
    }
    for (const ringNumber of Object.keys(rings).map(x => Number(x))) {
        // Filter the ring?
        if (minRing > ringNumber || maxRing < ringNumber) {
            continue
        }

        const ring = rings[ringNumber]
        for (const scaleUnit of ring) {
            // Filter the scale unit?
            if (scaleUnitFilter && scaleUnit !== scaleUnitFilter) {
                continue
            }

            const jobInputs = Object.assign({}, defaultJobInputs)
            jobInputs.ringNumber = ringNumber
            jobInputs.scaleUnit = scaleUnit

            // Deploy job
            graph.jobs[deployJob.createId(jobInputs)] = deployJob.createJob(jobInputs)
        }

        for (const scaleUnit of ring) {
            // Filter the scale unit?
            if (scaleUnitFilter && scaleUnit !== scaleUnitFilter) {
                continue
            }

            const jobInputs = Object.assign({}, defaultJobInputs)
            jobInputs.ringNumber = ringNumber
            jobInputs.scaleUnit = scaleUnit

            // Health job
            graph.jobs[healthJob.createId(jobInputs)] = healthJob.createJob(jobInputs)

            // Canary tests
            if (ringNumber === 0) {
                graph.jobs[canaryJob.createId(jobInputs)] = canaryJob.createJob(jobInputs)
            }
        }
    }

    const json = JSON.stringify(graph, null, '  ')

    // output YAML
    const whichYq = await exec.exec('which', ['yq'], null, true)
    if (whichYq.exitCode === 0) {
        const yq = await exec.exec('yq', ['eval', '--prettyPrint'], json)
        console.log(yq.stdout)
    }
    // output JSON
    else {
        console.log(json)
    }
}

run()
    .catch(err => {
        console.error(err)
        process.exitCode = 1
    })