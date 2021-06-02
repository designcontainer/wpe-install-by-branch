const core = require('@actions/core');
const WpeApi = require('dc-wpe-js-api');

async function run() {
	if (process.env.GITHUB_EVENT_NAME !== 'push')
		return core.setFailed('This GitHub Action works only when triggered by "push".');

	try {
		// Action inputs
		const user = core.getInput('WPE_SSHG_KEY_PUBLIC', { required: true });
		const pass = core.getInput('WPE_SSHG_KEY_PRIVATE', { required: true });
		// Github envs
		const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
		const branch = process.env.GITHUB_REF;

		if (branch === 'master') {
			core.info(`Install for branch ${branch} is: ${install_to_deploy}`);
			return repo;
		}

		// Init WPE API
		const wpe = new WpeApi(user, pass);

		core.startGroup('Getting WP Engine info');
		core.info('Getting install id by name');
		const install_id = await wpe.id(repo);

		core.info('Getting site id');
		const site_id = await wpe.getWpeApi('installs', install_id).then((res) => {
			return res.site.id;
		});

		core.info('Getting all installs in site');
		const installs_in_site = await wpe.getWpeApi('sites', site_id).then((res) => {
			return res.installs;
		});

		core.info('Getting install by branch name');
		const install_to_deploy = installs_in_site.find((install) => {
			return install.environment === branch;
		});

		core.info('Returning install');
		if (install_to_deploy === 'undefined') {
			core.setFailed(`Install for branch ${branch} does not exist. Deployment failed.`);
		} else {
			core.info(`Install for branch ${branch} is: ${install_to_deploy.name}`);
			return install_to_deploy.name;
		}

		core.endGroup();
	} catch (error) {
		core.setFailed(`Action failed because of: ${error}`);
	}
}

run();
