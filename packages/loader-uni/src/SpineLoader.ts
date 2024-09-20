import { ISpineResource, SpineLoaderAbstract } from '@pixi-spine/loader-base';
import { BinaryInput, ISkeletonData, ISkeletonParser, TextureAtlas } from '@pixi-spine/base';
import * as spine38 from '@pixi-spine/runtime-3.8';
import * as spine37 from '@pixi-spine/runtime-3.7';
import * as spine41 from '@pixi-spine/runtime-4.1';
import { detectSpineVersion, SPINE_VERSION } from './versions';

class UniBinaryParser implements ISkeletonParser {
    scale = 1;

    readSkeletonData(atlas: TextureAtlas, dataToParse: Uint8Array): ISkeletonData {
        let parser: any = null;
        let version = this.readVersionOldFormat(dataToParse);
        let ver = detectSpineVersion(version);

        if (ver === SPINE_VERSION.VER38) {
            parser = new spine38.SkeletonBinary(new spine38.AtlasAttachmentLoader(atlas));
        }
        version = this.readVersionNewFormat(dataToParse);
        ver = detectSpineVersion(version);
        if (ver === SPINE_VERSION.VER40 || ver === SPINE_VERSION.VER41) {
            parser = new spine41.SkeletonBinary(new spine41.AtlasAttachmentLoader(atlas));
        }
        if (ver === SPINE_VERSION.VER42) {
            console.warn("4.2 Support is experimental and may not work as expected");
        }
        if (!parser) {
            const error = `Unsupported version of spine model ${version}, please update pixi-spine`;

            console.error(error);
        }

        parser.scale = this.scale;

        return parser.readSkeletonData(dataToParse);
    }

    readVersionOldFormat(dataToParse: Uint8Array) {
        const input = new BinaryInput(dataToParse);
        let version;

        try {
            input.readString();
            version = input.readString();
        } catch (e) {
            version = '';
        }

        return version || '';
    }

    readVersionNewFormat(dataToParse: Uint8Array) {
        const input = new BinaryInput(dataToParse);

        input.readInt32();
        input.readInt32();
        let version;

        try {
            version = input.readString();
        } catch (e) {
            version = '';
        }

        return version || '';
    }
}

class UniJsonParser implements ISkeletonParser {
    scale = 1;

    readSkeletonData(atlas: TextureAtlas, dataToParse: any): ISkeletonData {
        const version = dataToParse.skeleton.spine;
        const ver = detectSpineVersion(version);
        let parser: any = null;

        if (ver === SPINE_VERSION.VER37) {
            parser = new spine37.SkeletonJson(new spine37.AtlasAttachmentLoader(atlas));
        }
        if (ver === SPINE_VERSION.VER38) {
            parser = new spine38.SkeletonJson(new spine38.AtlasAttachmentLoader(atlas));
        }
        if (ver === SPINE_VERSION.VER40 || ver === SPINE_VERSION.VER41) {
            parser = new spine41.SkeletonJson(new spine41.AtlasAttachmentLoader(atlas));
        }
        if (!parser) {
            const error = `Unsupported version of spine model ${version}, please update pixi-spine`;

            console.error(error);
        }

        parser.scale = this.scale;

        return parser.readSkeletonData(dataToParse);
    }
}

/**
 * @public
 */
export class SpineLoader extends SpineLoaderAbstract<ISkeletonData> {
    createBinaryParser(): ISkeletonParser {
        return new UniBinaryParser();
    }

    createJsonParser(): ISkeletonParser {
        return new UniJsonParser();
    }

    parseData(parser: ISkeletonParser, atlas: TextureAtlas, dataToParse: any): ISpineResource<ISkeletonData> {
        const parserCast = parser as UniBinaryParser | UniJsonParser;

        return {
            spineData: parserCast.readSkeletonData(atlas, dataToParse),
            spineAtlas: atlas,
        };
    }
}
