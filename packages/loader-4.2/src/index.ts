/* eslint-disable spaced-comment */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../global.d.ts" />

import '@pixi-spine/loader-base'; // Side effect install atlas loader
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
import { ISpineResource, SpineLoaderAbstract } from '@pixi-spine/loader-base';
import type { ISkeletonParser, TextureAtlas } from '@pixi-spine/base';
import { AtlasAttachmentLoader, SkeletonBinary, SkeletonData, SkeletonJson } from '@pixi-spine/runtime-4.2';

/**
 * @internal
 */
class SpineParser extends SpineLoaderAbstract<SkeletonData> {
    createBinaryParser(): ISkeletonParser {
        return new SkeletonBinary(null);
    }

    createJsonParser(): ISkeletonParser {
        return new SkeletonJson(null);
    }

    parseData(parser: ISkeletonParser, atlas: TextureAtlas, dataToParse: any): ISpineResource<SkeletonData> {
        const parserCast = parser as SkeletonBinary | SkeletonJson;

        parserCast.attachmentLoader = new AtlasAttachmentLoader(atlas);

        return {
            spineData: parserCast.readSkeletonData(dataToParse),
            spineAtlas: atlas,
        };
    }
}

new SpineParser().installLoader();
