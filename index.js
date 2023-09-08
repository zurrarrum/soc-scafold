#!/usr/bin/env node

const program = require('commander');
const socScafold = require('./lib/soc-projectCreate');

program
  .version('0.1.0')
  .usage('[options] <command>')
  .option('-c, --config <config>', 'path to config json (by default is soc-config.json)')
  .option('-o, --outputFolder <outputFolder>', 'outputFolder(by default is results)')

program
  .command('project:create')
  .description('generates a soc scafold with the configured classes')
  .action(function(env) {
    console.log('generating soc project...')
    socScafold.run(program.config, program.outputFolder);
  });

program.parse(process.argv);