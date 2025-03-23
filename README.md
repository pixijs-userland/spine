# pixi-spine

Spine 3.7, 3.8, 4.0, 4.1 implementation for PixiJS v7. 

For PixiJS v8 and spine 4.2 please look at [spine-v8 repo](https://github.com/pixijs/spine-v8)

### Versions Compatibility

| PixiJS | pixi-spine |
|---|---|
| v5.x - v6.x | v3.x |
| v7.x | v4.x |

For spine < 3.7 support is limited.

For previous versions of pixi refer to
- [README in pixi6](https://github.com/pixijs-userland/spine/tree/pixi6/#readme)
- [README in pixi5](https://github.com/pixijs-userland/spine/tree/pixi5/#readme)

Demos:

https://pixijs.io/examples/#/plugin-spine/spineboy-pro.js

https://pixijs.io/examples/#/plugin-projection/runner.js

https://sbfkcel.github.io/pixi-spine-debug/

## Basic Usage

Please read this carefully: there are many ways to add this lib to your app.

1. npm, Webpack, Rollup, Vite - if you know those words, use `npm i pixi-spine`
2. Good old `<script src="pixi-spine.js">`, also named vanilla JS
3. The modern `<script type="module" src="pixi-spine.mjs">`, for ES modules
4. Single version, check the `all-X.Y` bundles
5. Custom bundle, for specific combinations of versions.

### Bundles example

```js
import 'pixi-spine' // Do this once at the very start of your code. This registers the loader!

import * as PIXI from 'pixi.js';
import {Spine} from 'pixi-spine';

const app = new PIXI.Application();
document.body.appendChild(app.view);

PIXI.Assets.load("spine-data-1/HERO.json").then((resource) => {
	const animation = new Spine(resource.spineData);
    app.stage.addChild(animation);

    // add the animation to the scene and render...
    app.stage.addChild(animation);
    
    if (animation.state.hasAnimation('run')) {
        // run forever, little boy!
        animation.state.setAnimation(0, 'run', true);
        // dont run too fast
        animation.state.timeScale = 0.1;
        // update yourself
        animation.autoUpdate = true;
    }
});
```


### Where are spine core classes?

Classes like `AttachmentType`, `TextureAtlas`, `TextureRegion` and `Utils` are shared across all spine versions, and re-exported by all bundles. But if you want to see them directly, they are in `@pixi-spine/base`.

Base also contains unified interfaces, `ISkeleton`, `ISkeletonData`, `IAnimationData` and so on, see `ISkeleton.ts` file. 

Most of classes are spine-version-dependant, including `Skeleton`, `SkeletonData`, they are stored in corresponding packages `@pixi-spine/runtime-3.8` and so on.

### Browser builds

For browser builds, you will need to grab either the `.js` (for CJS) file or the `.mjs` (for ESM) from the `dist` folder or from your CDN of choice.

### Custom bundle

Main bundle `pixi-spine` weights 374 KB (unzipped).

Bundle `@pixi-spine/all-3.8` weights about 165 KB (unzipped).

If you want to use different version (3.7) please look how modules `loader-3.8` and `pixi-spine-3.8` are made.

Basically, you have to copy its code in a separate file in your project, and alter imports to corresponding version. 

For example, here's bundle for 3.8:

```js
import '@pixi-spine/loader-3.8'; // Side effect install the loader
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
export * from '@pixi-spine/runtime-3.8';
export * from '@pixi-spine/base';
```

In case author was too lazy to publish`loader-3.7`, you can do the same trick with them, just look in sources of `loader-3.8`.

## Want to go advanced?

Read our [docs](examples/index.md).

### Two-color tint

Light-dark tint is supported with help of [pixi-heaven](https://github.com/pixijs-userland/pixi-heaven)
Currently supported only by UMD build. (and most likely on PixiJS < 7.x)

```js
let spine = new PIXI.heaven.Spine(spineData);
```

### Debug

To show debug graphics you can set `yourSpine.debug = new SpineDebugRenderer()`  

Control what gets drawn with the following flags:

```js
// Master toggle
yourSpine.debug.drawDebug = true; 

// Per feature toggle
yourSpine.debug.drawMeshHull = true;
yourSpine.debug.drawMeshTriangles = true;
yourSpine.debug.drawBones = true;
yourSpine.debug.drawPaths = true;
yourSpine.debug.drawBoundingBoxes = true;
yourSpine.debug.drawClipping = true;
yourSpine.debug.drawRegionAttachments = true;
```

To have even more control, you can customize the color and line thickness with
```js
yourSpine.debug.debugOptions.lineWidth = 1;
yourSpine.debug.debugOptions.regionAttachmentsColor = 0x0078ff;
yourSpine.debug.debugOptions.meshHullColor = 0x0078ff;
yourSpine.debug.debugOptions.meshTrianglesColor = 0xffcc00;
yourSpine.debug.debugOptions.clippingPolygonColor = 0xff00ff;
yourSpine.debug.debugOptions.boundingBoxesRectColor = 0x00ff00;
yourSpine.debug.debugOptions.boundingBoxesPolygonColor = 0x00ff00;
yourSpine.debug.debugOptions.boundingBoxesCircleColor = 0x00ff00;
yourSpine.debug.debugOptions.pathsCurveColor = 0xff0000;
yourSpine.debug.debugOptions.pathsLineColor = 0xff00ff;
yourSpine.debug.debugOptions.skeletonXYColor = 0xff0000;
yourSpine.debug.debugOptions.bonesColor = 0x00eecc;
```

You can reuse a single debug renderer and they will share the debug settings!
```js
const debugRenderer = new SpineDebugRenderer();

oneSpine.debug = debugRenderer;
anotherSpine.debug = debugRenderer;
```

If you want to create your own debugger you can extend `SpineDebugRenderer` or create a class from scratch that implements `ISpineDebugRenderer`!

## Build & Development

You will need to have [node][node] setup on your machine.

Then you can install dependencies and build:

```bash
npm install
npm run build
```

That will build all packages and bundles. Browser packages are inside `dist` and npm packages are inside `lib`

`npm link` will misbehave because of the monorepo setup.

[node]:             https://nodejs.org/
[typescript]:       https://www.typescriptlang.org/

## Deploying

If you have enough rights to publish this monorepo, you can publish by running `npm run lernaPublish`
This is so that it runs with the internal npm v8 since npm v9 doesn't play nice with Lerna.

If for some reason your publish failed, use `npm run lernaPublish:fromPackage` to try to force a publish without creating a new version
