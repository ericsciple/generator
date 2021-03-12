const JobInputs = require('./job-inputs').JobInputs

/**
 * Creates the ID for a deploy job
 * @param {JobInputs} jobInputs 
 */
function createId(jobInputs) {
    return `health-${jobInputs.scaleUnit}`
}
exports.createId = createId

/**
 * Creates a deploy job
 * @param {JobInputs} jobInputs 
 */
function createJob(jobInputs) {
    return {
        "name": `Ring ${jobInputs.ringNumber}, ${jobInputs.scaleUnit} health`,
        "needs": `deploy-${jobInputs.scaleUnit}`,
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
                "name": "Health",
                "run": "./script/check-health.sh --scale-unit $SCALE_UNIT --duration 30m"
            },
        ]
    }
}
exports.createJob = createJob
