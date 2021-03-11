#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

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
    let minRing = Number(inputs.minRing)
    if (isNaN(minRing) || !rings[minRing]) {
        throw new Error(`Invalid min ring '${minRing}'`)
    }
    let maxRing = Number(inputs.maxRing)
    if (isNaN(maxRing) || !rings[maxRing]) {
        throw new Error(`Invalid max ring '${maxRing}'`)
    }
    else if (maxRing < minRing) {
        throw new Error(`Max ring must be greater or equal to min ring`)
    }
    const scaleUnitFilter = inputs.scaleUnit
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

            // Deploy job
            graph.jobs[`deploy-${scaleUnit}`] = {
                "name": `Deploy ring ${ringNumber}, ${scaleUnit}`,
                "needs": getDeployNeeds(ringNumber, rings, minRing),
                "runs-on": "self-hosted",
                "env": {
                    "RING": ringNumber,
                    "SCALE_UNIT": scaleUnit,
                    "BUILD_NUMBER": buildNumber,
                    "SLACK_URL": "${{ secrets.SLACK_URL }}"
                },
                "steps": [
                    {
                        "name": "Checkout",
                        "uses": "actions/checkout@v2"
                    },
                    {
                        "name": "Download drop",
                        "run": "./script/download-drop.sh --version $BUILD_NUMBER --path drop"
                    },
                    {
                        "name": "Pre-health check",
                        "run": "./script/check-health.sh --scale-unit $SCALE_UNIT --duration once"
                    },
                    {
                        "name": "Deploy",
                        "run": "./script/deploy.sh --scale-unit $SCALE_UNIT --path drop"
                    },
                ]
            }

            // Health job
            graph.jobs[`health-${scaleUnit}`] = {
                "name": `Health ring ${ringNumber}, ${scaleUnit}`,
                "needs": `deploy-${scaleUnit}`,
                "runs-on": "self-hosted",
                "env": {
                    "RING": ringNumber,
                    "SCALE_UNIT": scaleUnit,
                    "BUILD_NUMBER": buildNumber,
                    "SLACK_URL": "${{ secrets.SLACK_URL }}"
                },
                "steps": [
                    {
                        "name": "Checkout",
                        "uses": "actions/checkout@v2"
                    },
                    {
                        "name": "Health",
                        "run": "./script/check-health.sh --scale-unit $SCALE_UNIT --duration 30m"
                    },
                ]
            }

            // Canary tests
            if (ringNumber === 0) {
                graph.jobs["canary"] = {
                    "name": `Canary`,
                    "needs": `deploy-${scaleUnit}`,
                    "runs-on": "self-hosted",
                    "env": {
                        "SLACK_URL": "${{ secrets.SLACK_URL }}"
                    },
                    "steps": [
                        {
                            "name": "Checkout",
                            "uses": "actions/checkout@v2"
                        },
                        {
                            "name": "Run canary",
                            "run": "./script/run-canary.sh"
                        }
                    ]
                }
            }
        }
    }
    console.log(JSON.stringify(graph, null, '  '))
}

function getDeployNeeds(ringNumber, rings, minRing) {
    const needs = []
    if (ringNumber > minRing) {
        const prevRing = rings[ringNumber - 1]
        for (const scaleUnit of prevRing) {
            needs.push(`health-${scaleUnit}`)
        }

        if (ringNumber === 1) {
            needs.push(`canary`)
        }
    }
    return needs.length == 1 ? needs[0] : needs;
}

run()