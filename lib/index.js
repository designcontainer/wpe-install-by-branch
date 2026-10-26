const core = require('@actions/core');
const axios = require('axios').default;

async function run() {
	if (process.env.GITHUB_EVENT_NAME !== 'push')
		return core.setFailed('This GitHub Action works only when triggered by "push".');

	try {
		// Action inputs
		const wpeUser = core.getInput('wpe_api_key_pub', { required: true });
		const wpePass = core.getInput('wpe_api_key_priv', { required: true });

		// Github envs
		const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
		const [refs, head, branch] = process.env.GITHUB_REF.split('/');

		core.startGroup('Checking branch');

		core.info(`Ref branch is: ${branch}`);

		if (
			branch === 'master' ||
			branch === 'main' ||
			branch === 'prod' ||
			branch === 'production'
		) {
			core.info(`Install for branch ${branch} is: ${repo}`);
			core.setOutput('install', repo);
			core.setOutput('environment', 'production');
			core.endGroup();
			return;
		}

		core.endGroup();

		core.startGroup('Getting WP Engine info');

		core.info('Getting all sites from WP Engine');
		const urlAxios = 'https://api.wpengineapi.com/v1/sites?limit=1000';
		const authAxios = {
			auth: {
				username: wpeUser,
				password: wpePass,
			},
		};
		
		const sites = [];
		
		let res = await axios.get(urlAxios, authAxios);
		sites.push(...res.data.results);
		while (res.data.next) {
			res = await axios.get(res.data.next, authAxios);
			sites.push(...res.data.results);
		}

		core.info('Getting site by install name');
		const thisSite = sites.find((site) =>
			site.installs.some((install) => install.name === repo)
		);

		if (!thisSite) {
			core.setFailed(`No WP Engine site found with a production install named "${repo}".`);
			core.endGroup();
			return;
		}

		core.info('Getting install for deployment by branch name');
		const installToDeploy = thisSite.installs.find((install) => install.environment === branch);

		core.info('Returning install');
		if (installToDeploy === undefined) {
			core.setFailed(`Install for branch ${branch} does not exist. Deployment failed.`);
		} else {
			const environment = installToDeploy.environment || branch;
			core.info(`Install for branch ${branch} is: ${installToDeploy.name} (${environment})`);
			core.setOutput('install', installToDeploy.name);
			core.setOutput('environment', environment);
		}

		core.endGroup();
	} catch (error) {
		core.setFailed(`Action failed because of: ${error}`);
	}
}

run();
