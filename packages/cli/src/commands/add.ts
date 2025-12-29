import { Command } from 'commander';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import { loadConfig } from '../config';
import { PipelineEngine } from '../lib/pipeline/engine';
import { Repository } from '../lib/storage/repository';

export const addCommand = new Command('add')
  .description('Add a new memory')
  .argument('[text]', 'Raw text content to add (optional if --file is used)')
  .option('-f, --file <path>', 'Path to a text file')
  .option('-p, --project <project>', 'Project identifier')
  .option('-u, --userid <userid>', 'User identifier')
  .action(async (text, options) => {
    const spinner = ora('Initializing...').start();
    try {
      // 1. Load Config
      const config = await loadConfig();

      // 2. Resolve Input
      let inputContent = text || '';
      if (options.file) {
        if (await fs.pathExists(options.file)) {
          inputContent = await fs.readFile(options.file, 'utf-8');
        } else {
          throw new Error(`File not found: ${options.file}`);
        }
      }

      if (!inputContent) {
        throw new Error('No content provided. Use arguments or --file.');
      }

      spinner.text = 'Processing memory pipeline...';
      
      // 3. Prepare Metadata
      const metadata: any = {};
      if (options.project) metadata.project = options.project;
      if (options.userid) metadata.userId = options.userid;

      // 4. Run Pipeline
      const engine = new PipelineEngine(config);
      const result = await engine.process(inputContent, metadata);

      spinner.text = 'Saving to storage...';
      
      // 5. Save
      const repo = new Repository();
      await repo.saveBatch(result.memories, result.entities);

      spinner.succeed(chalk.green('Memory added successfully!'));
      console.log(chalk.dim(`Created ${result.memories.length} memory entries and ${result.entities.length} entities.`));
      
      // Optional: Verbose output or JSON flag could be added
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to add memory'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });
