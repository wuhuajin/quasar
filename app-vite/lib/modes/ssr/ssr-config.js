
const { join } = require('path')
const { mergeConfig } = require('vite')

const createViteConfig = require('../../create-vite-config')

const appPaths = require('../../app-paths')
const parseEnv = require('../../parse-env')

const { dependencies:appDeps = {}, devDependencies:appDevDeps = {} } = require(appPaths.resolve.app('package.json'))
const { dependencies:cliDeps = {} } = require(appPaths.resolve.cli('package.json'))

const external = [
  ...Object.keys(cliDeps),
  ...Object.keys(appDeps),
  ...Object.keys(appDevDeps)
]

module.exports = {
  viteClient: quasarConf => {
    const cfg = createViteConfig(quasarConf, 'ssr-client')

    return mergeConfig(cfg, {
      define: {
        'process.env.CLIENT': true,
        'process.env.SERVER': false
      },
      server: {
        middlewareMode: true
      },
      build: {
        manifest: true,
        ssrManifest: true,
        outDir: join(quasarConf.build.distDir, 'client'),
        rollupOptions: {
          input: appPaths.resolve.app('.quasar/client-entry.js')
        }
      }
    })
  },

  viteServer: quasarConf => {
    const cfg = createViteConfig(quasarConf, 'ssr-server')

    return mergeConfig(cfg, {
      define: {
        'process.env.CLIENT': false,
        'process.env.SERVER': true
      },
      publicDir: false, // let client config deal with it
      server: {
        hmr: false, // let client config deal with it
        middlewareMode: 'ssr'
      },
      ssr: {
        noExternal: [
          /\/esm\/.*\.js$/,
          /\.(es|esm|esm-browser|esm-bundler).js$/
        ]
      },
      build: {
        ssr: true,
        outDir: join(quasarConf.build.distDir, 'server'),
        rollupOptions: {
          input: appPaths.resolve.app('.quasar/server-entry.js')
        }
      }
    })
  },

  webserver: quasarConf => {
    const cfg = {
      platform: 'node',
      target: 'node12',
      format: 'cjs',
      bundle: true,
      sourcemap: quasarConf.metaConf.debugging ? 'inline' : false,
      external,
      minify: quasarConf.build.minify !== false,
      define: parseEnv(quasarConf.build.env, quasarConf.build.rawDefine)
    }

    cfg.define['process.env.CLIENT'] = false
    cfg.define['process.env.SERVER'] = true

    if (quasarConf.ctx.dev) {
      cfg.entryPoints = [ appPaths.resolve.app('.quasar/ssr-middlewares.js') ]
      cfg.outfile = appPaths.resolve.app('.quasar/ssr/compiled-middlewares.js')
    }
    else {
      cfg.external = [
        ...cfg.external,
        'vue/server-renderer',
        'vue/compiler-sfc',
        './render-template.js',
        './quasar.manifest.json',
        './server/server-entry.js',
        'compression',
        'express'
      ]

      cfg.entryPoints = [ appPaths.resolve.app('.quasar/ssr-prod-webserver.js') ]
      cfg.outfile = join(quasarConf.build.distDir, 'index.js')
    }

    return cfg
  }
}
