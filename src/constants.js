module.exports = {
    CARTRIDGES_FOLDER : '/cartridges',
    META_FOLDER : '/meta',
    SITES_META_FOLDER : '/sites/site_template',
    DEFAULT_CONFIG_NAME : 'davos.json',
    DW_CONFIG_NAME : 'dw.json',
    TMP_DIR : 'tmp',
    CONFIG_PROPERTIES : {
        required: ['hostname', 'username', 'password', 'codeVersion'],
        optional: ['exclude', 'cartridge']
    },
    GLOB_IGNORED : [
        '**/.git/**',
        '**/.svn/**',
        '**/.sass-cache/**',
        '**/node_modules/**'
    ],
    DEFAULT_OCAPI_VERSION: 'v19_5',
    SITE_IMPORT_JOB_ID: 'sfcc-site-archive-import',
    JobExecutionSearch: '/s/-/dw/data/v19_5/job_execution_search',
    ACCOUNT_MANAGER_HOST: 'account.demandware.com',
    ACCOUNT_MANAGER_TOKEN_PATH: '/dw/oauth2/access_token'
};
