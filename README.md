# Davos - A worthy SFCC developer companion.

Davos is well suited to upload and sync your Cloud Commerce Digital projects, providing additional capabilities to ease your workflow with managing metadata, upload sites, code deployment and more.

> For full list of functionalities, please check the README below at [Functionalities](#functionalities) tab 

[![NPM Version][npm-image]][npm-url]

## Install

```bash
npm i -g davos
```



## Usage

**Davos** can be used either from the CLI or from a task manager app, like Grunt, Gulp or from the NPM Scripts

For setup and usage via task managers, please follow the README of this [sample setup davos repo](https://github.com/ForkPoint/davos-sample-project).

In order to access the functionalities of **Davos**, you will need either a ***dw.json*** or a ***davos.json*** file. These are needed in order to access functionalities, which require authentication with the Sandbox.




## Davos.json

A *davos.json* file, is similar to dw.json file, but provides the possibility of having **profiles** per instances and the ability to switch between them easily in order to perform the desired operations.

> Sample davos.json file:

```json
[
    {
        "active": false,
        "profile": "dev01",
        "config": {
            "hostname": "dev01-web-proj.demandware.net",
            "username": "user1",
            "password": "password1",
            "cartridge": [
                "app_foo",
                "int_foo"
            ],
            "codeVersion": "test_ver",
            "exclude": [
                "**/node_modules/**",
                "**/.sass-cache/**"
            ]
        }
    },
    {
        "active": true,
        "profile": "dev02",
        "config": {
            "hostname": "dev02-web-proj.demandware.net",
            "username": "user2",
            "password": "password2",
            "cartridge": [
                "app_foo",
                "int_foo"
            ],
            "codeVersion": "anotherVersion",
            "exclude": [
                "**/node_modules/**",
                "**/.sass-cache/**"
            ]
        }
    },
]
```



**Davos** will work with the current active profile from the *davos.json* file.

> NOTE: If both davos.json and dw.json are present, davos.json will have higher precedence over dw.json



## Functionalities

> Functionalities expressed here, will show the usage of Davos via the CLI
>
> All commands here are to be executed from the CLI

Davos can be used to create profiles (davos.json) and manage them as well.

A quick overview of the present functionalities:

- [Profile](#profile-and-davos-configuration-related)
  - [edit](#profile-edit)
  - [insert](#profile-creation)
  - [list](#profile-list)
  - [switch](#profile-switch)
- [Metadata](#metadata-related)
  - [split](#metadata-split)
  - [merge](#metadata-merge)
- [Package](#package)
  - [create](#package-create)
  - [import](#package-import)
- [Sandbox](#sandbox-related)
  - Code
    - [activate](#code-activate)
    - [list](#code-list)
    - [shift](#code-shift)
    - [deploy](#code-deploy)
  - Upload
    - [sites](#upload-sites)
    - [cartridges](#upload-cartridges)
- [Miscellaneous](#miscellaneous)
  - [Watch](#watch)



### Profile and Davos configuration related

#### Profile creation

In order to create a *davos.json* and profile in it

```bash
davos profile insert
```

```bash
davos setup
```

> NOTE: Davos setup will initially perform the same action as insert, but as the name suggest, it will not insert new profiles after the file has been created

This will create an *davos.json* file, if not present, and will ask you to provide profile information



#### Profile edit

In order to edit profiles

```bash
davos profile edit
```

> It will edit the **current active profile** 



#### Profile list

In order to list current profiles

```bash
davos profile list
```

> NOTE: Will only list profiles in davos.json, not dw.js



#### Profile switch

In order to switch profiles

```bash
davos profile switch [name]
```



---



### Metadata related

**Davos** presents the opportunity to *split* and *merge* metadata, extracted from an instance.

This will ease the workflow with big chunks of system or custom metadata XMLs, allowing the ease of access and modification over a certain file, instead of working within the entire file.



#### Metadata split

In order to split metadata into smaller chunks

```bash
davos meta split --in=path/to/metadata.xml --out=path/to/output/
```

> Paths are relative to the current working folder

> Option flag --force can be added, in order to create the folders to the output, if they are not present [WIP]



#### Metadata merge

Merging of all of the separated chunks is also possible.

Merging will create an ready-for-import XML from all of the smaller chunks, separated by the split

```bash
davos meta merge --in=path/to/splitted/meta/ -out=path/to/file.xml
```

> File and extension can be omitted in the output parameter, davos will create a file, with a specific name in the output folder

> Optional flag --force can be used again, to create the folders for the output, if they are not present [WIP]



---



### Package

Davos has the ability to pack and import so called "packages". These are basically the sites metadata but separated in a more complex structure

In order to use this functionality, the folder and file structure must be created and maintained.



The structure is placed in the site/site_template folder:
```bash
├───geolocations
├───meta
├───ocapi-settings
├───sites
│   ├───SiteName
│   │   └───urls
│   ├───SiteName
│   │   └───urls
│   ├───SiteNameDE
│   │   └───urls
│   ├───SiteNameUS
│   │   └───urls
│   ├───__common
│   │   ├───ocapi-settings
│   │   └───urls
│   └───__common__SiteName
└───static
    └───default
        └───images
            └───slot
                └───landing
```


This structure, allows to split the commonly used metadata per site in the `__common` or `__common__SiteName` folder and leave the site specific ones into the site specific folder [SiteName]. During the packing process, it will merge the metadata per site, using the common folders. If a file is found in the site specific folder, with the same name from the commons folder, the file from the site specific folder will have higher precedence.



#### Package create

```bash
davos pack create
```

> NOTE: This will pack the default site/site_template folder and output will be in the sites/ folder
>
> Optional arguments can be used, which follow:
> --site=[SiteName] | Searches for the sites/site_[SiteName] folder
>
> --output=path/to/output
>
> --skipCatalogs=true
>
> --skipImages=true
>
> --skipStores=true



#### Package Import

Imports the package archive to the active profile instance

```bash
davos pack import
```

> Optional arguments can be used, which follow:
>
> --name=[archiveName] | No .zip extension required



---



### Sandbox related

**Davos** presents several options to work with the instance set in the davos.json or dw.json

> NOTE: Since newest version of Davos uses the SFCC Package and OCAPI, it requires to have two more properties in order to perform certain actions
>
> These include: client-id and client-secret. For developer sandboxes, the "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" can be used for both of them.
>
> Make sure to include them in either davos.json in the config object, or in dw.json



#### Code activate

Activates a code version on the active profile instance

```bash
davos code activate --ver [name]
```



#### Code list

Lists the current code versions on the active profile instance

```bash
davos code list
```



#### Code shift

Shifts the code versions back and forth

> NOTE: Need to have at least 2 versions in the sandbox

```bash
davos code shift
```



#### Code deploy

Deploys the current cartridges to the active profile instance code version

```bash
davos code deploy
```

> Optional flag **--list** can be added, in order to list the cartridges, which will be uploaded

> Additional properties can be added to the dw.json or davos.json profile config object in order to deploy to PIG Instances
>
> These include the **pfx**: path to p12 certificate and **passphrase**



#### Upload sites

Packs, uploads and imports the *sites/site_template* folder to the active profile instance

```bash
davos upload sites
```

> Optional --f=path/to/file.xml (glob) can be passed, in order to upload a single file or files found by the glob to the instance



#### Upload cartridges

This is similar to `davos code deploy` uses parallel upload of files

```bash
davos upload code
```



---



### Miscellaneous

#### Watch

Davos watches and uploads the changed files to the active profile instance

```bash
davos watch
```



## License

[MIT](http://vjpr.mit-license.org)

[npm-image]: https://img.shields.io/npm/v/davos.svg
[npm-url]: https://npmjs.org/package/davos
