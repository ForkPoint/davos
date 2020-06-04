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
    ]
};
