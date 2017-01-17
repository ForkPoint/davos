# Davos - Your trusty WebDav companion.

> Davos is a WebDav client which is well suited to upload and sync your Cloud Commerce Digital projects. It fully mimics the usage of Eclipse Demandware server configurations featuring profiles and synchronization on file change.

[![NPM Version][npm-image]][npm-url]

## Install

```bash
npm i -g davos
```

## Usage

### Project setup
* The first thing you should do is to run the command 'davos create' with your favorite CLI in your project's folder, which will create the configuration file.
* You could easily insert profiles(dev01, dev02, development etc.) by running the 'davos insert' command.
* Running the 'davos list' command will display a list of your profiles and will show which profile is active now.
* To switch your active profile you could run the following commands: 'davos switch --profile [name of profile]' or 'davos switch -P [name of profile]'.

###
* Now that you have a configuration you could upload your cartridges or watch for changes:
* Run the 'davos upload' command to upload all your cartridges.
* Run the 'davos upload --cartridge [name of cartridge]' command to upload a single cartridge of your wish.
* Run the 'davos watch' command to watch all your cartridges for changes.
* Run the 'davos watch --cartridge [name of cartridge]' command to watch a single cartridge of your wish for changes.

### Sample configuration

```json

[
	{
		"active": true,
		"profile": "dev01",
		"config": {
			"hostname": "dev01-web-proj.demandware.net",
			"username": "user1",
			"password": "password1",
			"cartridge": [
				"foo\\cartridges\\app_foo",
				"foo\\cartridges\\int_foo"
			],
			"codeVersion": "version1",
			"exclude": ["**/node_modules/**",
				"**/.sass-cache/**"]
		}
	},
	{
		"active": false,
		"profile": "dev02",
		"config": {
			"hostname": "dev02-web-proj.demandware.net",
			"username": "user2",
			"password": "password2",
			"cartridge": [
				"foo\\cartridges\\app_foo",
				"foo\\cartridges\\int_foo"
			],
			"codeVersion": "version1",
			"exclude": ["**/node_modules/**",
				"**/.sass-cache/**"]
		}
	}
]

```

## License

[MIT](http://vjpr.mit-license.org)

[npm-image]: https://img.shields.io/npm/v/davos.svg
[npm-url]: https://npmjs.org/package/davos
