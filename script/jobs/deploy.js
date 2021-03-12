const JobInputs = require('./job-inputs').JobInputs

/**
 * Creates the ID for a deploy job
 * @param {JobInputs} jobInputs 
 */
function createId(jobInputs) {
    return `deploy-${jobInputs.scaleUnit}`
}
exports.createId = createId

/**
 * Creates a deploy job
 * @param {JobInputs} jobInputs 
 */
function createJob(jobInputs) {
    return {
        "name": `Ring ${jobInputs.ringNumber}, ${jobInputs.scaleUnit} deploy`,
        "needs": getDeployNeeds(jobInputs.ringNumber, jobInputs.rings, jobInputs.minRing),
        "runs-on": "self-hosted",
        "env": {
            "RING": jobInputs.ringNumber,
            "SCALE_UNIT": jobInputs.scaleUnit,
            "BUILD_NUMBER": jobInputs.buildNumber,
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
}
exports.createJob = createJob

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