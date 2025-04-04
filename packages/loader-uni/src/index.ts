/* eslint-disable spaced-comment */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../global.d.ts" />
import '@pixi-spine/loader-base'; // Side effect install atlas loader
import { SpineLoader } from './SpineLoader';
export { SpineLoader };
export * from './Spine';
export * from './versions';

// Install the loader
new SpineLoader().installLoader();
