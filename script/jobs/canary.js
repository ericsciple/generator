const JobInputs = require('./job-inputs').JobInputs

/**
 * Creates the ID for a deploy job
 * @param {JobInputs} jobInputs 
 */
function createId(jobInputs) {
    return `canary`
}
exports.createId = createId

/**
 * Creates a deploy job
 * @param {JobInputs} jobInputs 
 */
function createJob(jobInputs) {
    return {
        "name": `Ring 0 canary`,
        "needs": `deploy-${jobInputs.scaleUnit}`,
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
exports.createJob = createJob
