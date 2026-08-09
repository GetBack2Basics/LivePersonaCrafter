import * as esbuild from 'esbuild';

async function buildServer() {
  console.log('⚡ Compiling standalone production server bundle with esbuild...');
  try {
    await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: 'dist/server.cjs',
      sourcemap: true,
      minify: false,
      external: [
        'express',
        'cors',
        'dotenv'
      ]
    });
    console.log('✓ Server bundle successfully written to dist/server.cjs');
  } catch (error) {
    console.error('✗ Server bundle compilation failed:', error);
    process.exit(1);
  }
}

buildServer();
