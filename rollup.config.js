import { getPlugins } from './scripts/rollup-config-helper';

const pkg = require('./package.json');
const banner = `/*!
 * Name: ${pkg.name}
 * Description: ${pkg.description}
 * Author: ${pkg.author}
 * Contributors: ${pkg.contributors.map(c => c.name).join(',')}
 * Version: v${pkg.version}
 */
`;

const plugins = getPlugins(pkg);

export default (commandLineArgs) => {
  return [
    {
      input: 'src/index.ts',
      output: [{
        file: pkg.module,
        format: 'es',
        banner,
        sourcemap: true,
      }, {
        file: pkg.main,
        format: 'cjs',
        banner,
        sourcemap: true,
      }],
      plugins,
    }, {
      input: 'src/index.ts',
      output: {
        file: pkg.brower,
        format: 'umd',
        name: 'Galacean.effects',
        banner,
        sourcemap: true,
      },
      plugins: getPlugins(pkg, { min: true }),
    },
  ];
};
