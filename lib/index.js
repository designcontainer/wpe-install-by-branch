const core = require('@actions/core');
const axios = require('axios').default;

async function run() {
	if (process.env.GITHUB_EVENT_NAME !== 'push')
		return core.setFailed('This GitHub Action works only when triggered by "push".');

	try {
		// Action inputs
		const wpeUser = core.getInput('wpe_ssh_key_pub', { required: true });
		const wpePass = core.getInput('wpe_ssh_key_priv', { required: true });

		// Github envs
		const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

		const test = wpeUser + '00';

		core.info(test);

		if (process.env.GITHUB_REF === 'master') {
			core.info(`Install for branch ${branch} is: ${repo}`);
			core.setOutput('install', repo);
		}

		core.startGroup('Getting WP Engine info');

		core.info('Getting all sites from WP Engine');
		const urlAxios = 'https://api.wpengineapi.com/v1/sites?limit=1000';
		const optionAxios = {
			headers: {
				Authorization: 'Basic ' + Buffer.from(wpeUser + ':' + wpePass).toString('base64'),
			},
		};
		const sites = await axios.get(urlAxios, optionAxios).then((res) => res.data.results);

		core.info('Getting site by install name');
		const thisSite = sites.filter((site) =>
			site.installs.some((install) => install.name == repo)
		)[0];

		core.info('Getting install for deployment by branch name');
		const installToDeploy = thisSite.installs.find((install) => {
			return install.environment === branch;
		});

		core.info('Returning install');
		if (installToDeploy === 'undefined') {
			core.setFailed(`Install for branch ${branch} does not exist. Deployment failed.`);
		} else {
			core.info(`Install for branch ${branch} is: ${installToDeploy.name}`);
			core.setOutput('install', installToDeploy.name);
		}

		core.endGroup();
	} catch (error) {
		core.setFailed(`Action failed because of: ${error}`);
	}
}

run();
