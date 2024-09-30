import configBuilder from '@pixi-spine/rollup-config';
import pkg from './package.json' assert { type: 'json' };

export default configBuilder(pkg.extensionConfig, pkg);
