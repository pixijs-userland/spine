/* eslint-disable spaced-comment */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../global.d.ts" />
import '@pixi-spine/loader-base'; // Side effect install atlas loader
import { SpineLoader } from './SpineLoader';

export * from './Spine';

// Install the loader
new SpineLoader().installLoader();
