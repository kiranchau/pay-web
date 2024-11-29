<?php

require_once 'init/config.php';

$defaults = [
    'adapter' => 'mysql',
    'charset' => 'utf8',
    'collation' => 'utf8_general_ci',
    'default_migration_table' => '_migrationlog',
    'dsn' => $config->phinx_dsn,
];

return [
    'paths' => [
        'migrations' => 'app/migrations',
    ],
    'environments' => [
        'default_environment' => 'development',
        'development' => $defaults,
        'production' => array_merge($defaults, [
            'dsn' => '%%PHINX_DSN%%',
        ]),
    ],
];

